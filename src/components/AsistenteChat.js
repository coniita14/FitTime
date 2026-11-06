import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView, ActivityIndicator, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { asistenteService } from '../api/asistente.service';
import { clienteService } from '../api/cliente.service';
import { gymService } from '../api/gym.service';

// Asistente "Fiti": botón flotante + chat a pantalla completa.
// Fiti HACE lo que se le pide (reservar, cancelar después de preguntar "¿Seguro?" en
// el chat, elegir profesor/a) desde el servidor, con las mismas funciones de la base.
// Acá se muestran las acciones hechas como tarjetas y se actualiza lo local:
// recordatorios del celular, perfil y pantallas.

const SUGERENCIAS = {
  CLIENTE: ['Quiero que me reserves un turno mañana', '¿Qué turnos tengo esta semana?', 'Quiero cancelar un turno', 'Ayudame a elegir profesor/a', '¿Cómo hago bien una sentadilla?'],
  ENTRENADOR: ['¿Qué clases tengo esta semana?', '¿Quiénes vienen a mi próxima clase?', 'Ideas de calentamiento para una clase de fuerza'],
  ADMIN: ['¿Qué clases hay mañana?', '¿Qué rutinas de cardio tenemos?'],
};

export const AsistenteBoton = ({ onPress, bottom = 90 }) => {
  const { theme } = useTheme();
  const b = theme.brand;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[estilosBoton.fab, { bottom, backgroundColor: b.primary }]}
      accessibilityRole="button"
      accessibilityLabel="Abrir el asistente Fiti"
    >
      <Ionicons name="sparkles" size={24} color="#FFF" />
    </TouchableOpacity>
  );
};

const estilosBoton = StyleSheet.create({
  fab: {
    position: 'absolute', right: 18, width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', elevation: 6,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
});

export const AsistenteModal = ({ visible, onClose, onCambio }) => {
  const { theme } = useTheme();
  const b = theme.brand;
  const s = useMemo(() => crearEstilos(b), [b]);
  const insets = useSafeAreaInsets();
  const { user, patchUser } = useAuth();
  const rol = user?.rol || 'CLIENTE';
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const [restantes, setRestantes] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (visible && mensajes.length === 0) {
      setMensajes([{
        id: 'hola', rol: 'asistente',
        texto: `¡Hola, ${user?.nombre || ''}! Soy Fiti, el asistente de FitTime. ${rol === 'CLIENTE'
          ? 'Pedime lo que necesites: te reservo o cancelo turnos, te ayudo a elegir profesor/a y te explico rutinas y ejercicios.'
          : 'Puedo contarte tus clases, quiénes se anotaron y darte ideas para tus rutinas.'}`,
      }]);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [mensajes, pensando]);

  const enviar = async (contenido = texto) => {
    const pregunta = contenido.trim();
    if (!pregunta || pensando) return;
    setTexto('');
    const nuevo = { id: `u-${Date.now()}`, rol: 'usuario', texto: pregunta };
    const historial = [...mensajes.filter((m) => m.id !== 'hola' && !m.error), nuevo];
    setMensajes((prev) => [...prev, nuevo]);
    setPensando(true);
    try {
      const r = await asistenteService.preguntar(historial);
      setRestantes(r.restantes);
      setMensajes((prev) => [...prev, {
        id: `a-${Date.now()}`, rol: 'asistente', texto: r.respuesta,
        acciones: r.acciones.map((a, i) => ({ ...a, key: `${Date.now()}-${i}` })),
      }]);
      if (r.acciones.length) {
        await aplicarAcciones(r.acciones);
        onCambio?.();
      }
    } catch (e) {
      setMensajes((prev) => [...prev, { id: `e-${Date.now()}`, rol: 'asistente', texto: e.message, error: true }]);
    } finally {
      setPensando(false);
    }
  };

  // Lo que ya hizo el servidor se refleja en el celular (recordatorios y perfil)
  const aplicarAcciones = async (acciones) => {
    for (const a of acciones) {
      try {
        if (a.tipo === 'RESERVADO' && user?.notificaciones_activas !== false) {
          const horario = { id: a.horario_id, dia: a.dia, hora_inicio: a.hora_inicio };
          await clienteService.notificarConfirmacion(horario, a.fecha);
          await gymService.programarRecordatorio({ id: a.turno_id, fecha_turno: a.fecha }, horario, user?.recordatorio_minutos || 60);
        } else if (a.tipo === 'CANCELADO') {
          await gymService.borrarRecordatorio(a.turno_id);
        } else if (a.tipo === 'PROFESOR') {
          patchUser?.({ profesor_id: a.profesor_id });
        }
      } catch { /* la acción ya quedó hecha en el servidor aunque falle lo local */ }
    }
  };

  const ICONO = { RESERVADO: 'calendar', CANCELADO: 'close-circle', PROFESOR: 'person' };

  const reiniciar = () => { setMensajes([]); setTimeout(() => setMensajes([{ id: 'hola', rol: 'asistente', texto: '¡Listo! Empecemos de nuevo. ¿En qué te ayudo?' }]), 0); };

  const soloSaludo = mensajes.length <= 1;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[s.header, { paddingTop: insets.top + 10 }]}>
          <View style={s.avatar}><Ionicons name="sparkles" size={18} color="#FFF" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.titulo}>Fiti</Text>
            <Text style={s.subtitulo}>
              Asistente con IA{restantes != null ? ` · ${restantes} consultas hoy` : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={reiniciar} style={s.headerBtn} accessibilityLabel="Nueva conversación">
            <Ionicons name="refresh" size={20} color={b.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={s.headerBtn} accessibilityLabel="Cerrar asistente">
            <Ionicons name="close" size={24} color={b.text} />
          </TouchableOpacity>
        </View>

        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={s.lista} keyboardShouldPersistTaps="handled">
          {mensajes.map((m) => (
            <View key={m.id}>
              <View style={[s.burbuja, m.rol === 'usuario' ? s.burbujaYo : s.burbujaIA, m.error && s.burbujaError]}>
                <Text style={[s.texto, m.rol === 'usuario' && { color: '#FFF' }]}>{m.texto}</Text>
              </View>
              {(m.acciones || []).map((a) => (
                <View key={a.key} style={[s.accion, a.tipo === 'CANCELADO' && { borderColor: b.danger }]}
                  accessible accessibilityLabel={`${a.titulo}: ${a.detalle}`}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name={ICONO[a.tipo] || 'checkmark-circle'} size={20}
                      color={a.tipo === 'CANCELADO' ? b.danger : b.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.accionTitulo}>{a.titulo}</Text>
                      <Text style={s.accionDetalle}>{a.detalle}</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={20} color={b.success} />
                  </View>
                </View>
              ))}
            </View>
          ))}

          {pensando && (
            <View style={[s.burbuja, s.burbujaIA, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
              <ActivityIndicator size="small" color={b.primary} />
              <Text style={s.textoSuave}>Fiti está pensando…</Text>
            </View>
          )}

          {soloSaludo && !pensando && (
            <View style={s.sugerencias}>
              {(SUGERENCIAS[rol] || SUGERENCIAS.CLIENTE).map((sug) => (
                <TouchableOpacity key={sug} style={s.chip} onPress={() => enviar(sug)}>
                  <Text style={s.chipTexto}>{sug}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text style={s.aviso}>Fiti puede equivocarse. Ante dolor o lesiones, consultá a un profesional.</Text>
        </ScrollView>

        <View style={[s.barra, { paddingBottom: insets.bottom + 10 }]}>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="Escribile a Fiti…"
            placeholderTextColor={b.textMuted}
            style={[s.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
            multiline
            maxLength={1000}
            onSubmitEditing={() => enviar()}
            blurOnSubmit={Platform.OS === 'web'}
            accessibilityLabel="Mensaje para el asistente"
          />
          <TouchableOpacity onPress={() => enviar()} disabled={!texto.trim() || pensando}
            style={[s.enviar, (!texto.trim() || pensando) && { opacity: 0.4 }]} accessibilityLabel="Enviar">
            <Ionicons name="send" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const crearEstilos = (b) => StyleSheet.create({
  root: { flex: 1, backgroundColor: b.cardSoft },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: b.card, borderBottomWidth: 1, borderBottomColor: b.border,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: b.primary, alignItems: 'center', justifyContent: 'center' },
  titulo: { color: b.text, fontSize: 17, fontWeight: '800' },
  subtitulo: { color: b.textSoft, fontSize: 12 },
  headerBtn: { padding: 6 },
  lista: { padding: 16, gap: 10 },
  burbuja: { maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  burbujaYo: { alignSelf: 'flex-end', backgroundColor: b.primary, borderBottomRightRadius: 4 },
  burbujaIA: { alignSelf: 'flex-start', backgroundColor: b.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: b.border },
  burbujaError: { borderColor: b.danger },
  texto: { color: b.text, fontSize: 15, lineHeight: 21 },
  textoSuave: { color: b.textSoft, fontSize: 14 },
  accion: {
    alignSelf: 'flex-start', width: '85%', marginTop: 8, padding: 12, borderRadius: 14,
    backgroundColor: b.card, borderWidth: 1.5, borderColor: b.primary,
  },
  accionTitulo: { color: b.text, fontWeight: '800', fontSize: 14 },
  accionDetalle: { color: b.textSoft, fontSize: 13, textTransform: 'none' },
  sugerencias: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: b.card, borderWidth: 1, borderColor: b.border },
  chipTexto: { color: b.primary, fontWeight: '600', fontSize: 13 },
  aviso: { color: b.textMuted, fontSize: 11, textAlign: 'center', marginTop: 12 },
  barra: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 10,
    backgroundColor: b.card, borderTopWidth: 1, borderTopColor: b.border,
  },
  input: {
    flex: 1, minHeight: 42, maxHeight: 120, borderRadius: 21, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11,
    backgroundColor: b.cardSoft, color: b.text, fontSize: 15, borderWidth: 1, borderColor: b.border,
  },
  enviar: { width: 42, height: 42, borderRadius: 21, backgroundColor: b.primary, alignItems: 'center', justifyContent: 'center' },
});
