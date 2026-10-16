import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { AuthLayout } from './AuthLayout';
import { Field, Button } from '../../components/cliente/ui';
import { mensajeDeError } from '../../utils/errores';
import { avisar } from '../../utils/dialogos';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEL_RE = /^\+?[\d\s-]{8,20}$/;

// 1D · Registro de usuario. La barra de pasos avanza a medida que se completa:
// 1. Datos personales · 2. Cuenta · 3. Términos.
export const SignupScreen = ({ navigation }) => {
  const { signup } = useAuth();
  const { theme } = useTheme();
  const b = theme.brand;
  const [f, setF] = useState({ nombre: '', apellido: '', email: '', telefono: '', password: '' });
  const [acepta, setAcepta] = useState(false);
  const [verTerminos, setVerTerminos] = useState(false);
  const [errores, setErrores] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k) => (v) => setF((prev) => ({ ...prev, [k]: v }));

  const paso1 = f.nombre.trim() && f.apellido.trim();
  const paso2 = paso1 && EMAIL_RE.test(f.email.trim()) && f.password.length >= 8;
  const paso = !paso1 ? 1 : !paso2 ? 2 : 3;
  const pasoLabel = ['1. Datos personales', '2. Datos de la cuenta', '3. Términos y condiciones'][paso - 1];

  const crear = async () => {
    const e = {};
    if (!f.nombre.trim()) e.nombre = 'Ingresá tu nombre';
    if (!f.apellido.trim()) e.apellido = 'Ingresá tu apellido';
    if (!EMAIL_RE.test(f.email.trim())) e.email = 'Ingresá un correo válido (ej. nombre@gmail.com)';
    if (f.telefono.trim() && !TEL_RE.test(f.telefono.trim())) e.telefono = 'Teléfono inválido (ej. +54 9 2944 123456)';
    if (f.password.length < 8) e.password = 'La contraseña debe tener al menos 8 caracteres';
    if (!acepta) e.terminos = 'Tenés que aceptar los Términos y Condiciones';
    setErrores(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      const r = await signup({
        nombre: f.nombre.trim(), apellido: f.apellido.trim(), telefono: f.telefono.trim(),
        email: f.email.trim(), password: f.password,
      });
      if (r.needsEmailConfirmation) {
        avisar('Revisá tu correo', 'Te enviamos un enlace para confirmar la cuenta. Después iniciá sesión.');
        navigation.navigate('Login');
      }
    } catch (err) {
      avisar('Error al registrarse', mensajeDeError(err, 'No se pudo crear la cuenta. Intentá de nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Crear cuenta" subtitle="Completá tus datos personales" onBack={() => navigation.goBack()}>
      <View style={s.steps}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={[s.step, { backgroundColor: n <= paso ? b.check : 'rgba(255,255,255,0.55)' }]} />
        ))}
      </View>
      <Text style={[s.stepLabel, { color: b.onBgSoft }]}>{pasoLabel}</Text>

      <Field label="Nombre" placeholder="nombre" value={f.nombre} onChangeText={set('nombre')} autoCapitalize="words" maxLength={100} error={errores.nombre} />
      <Field label="Apellido" placeholder="apellido" value={f.apellido} onChangeText={set('apellido')} autoCapitalize="words" maxLength={100} error={errores.apellido} />
      <Field label="Email" placeholder="email@ejemplo.com" value={f.email} onChangeText={set('email')} keyboardType="email-address" maxLength={150} error={errores.email} />
      <Field label="Teléfono" placeholder="+54 9 ..." value={f.telefono} onChangeText={set('telefono')} keyboardType="phone-pad" maxLength={20} error={errores.telefono} />
      <Field label="Contraseña" placeholder="••••••••" value={f.password} onChangeText={set('password')} secure error={errores.password} />

      <View style={s.terms}>
        <TouchableOpacity onPress={() => setAcepta(!acepta)} style={[s.check, { backgroundColor: b.card }]}
          accessibilityRole="checkbox" accessibilityState={{ checked: acepta }} accessibilityLabel="Acepto los Términos y Condiciones">
          {acepta && <Ionicons name="checkmark" size={16} color={b.primary} />}
        </TouchableOpacity>
        <Text style={{ color: b.onBg, fontSize: 13 }}>
          Acepto los{' '}
          <Text onPress={() => setVerTerminos(true)} style={{ fontWeight: '800', textDecorationLine: 'underline' }}>Términos y Condiciones</Text>
        </Text>
      </View>
      {errores.terminos ? <Text style={[s.termsError, { backgroundColor: b.danger }]}>{errores.terminos}</Text> : null}

      <Button title="Crear mi cuenta" onPress={crear} loading={loading} style={{ marginTop: 18 }} />

      <View style={s.footer}>
        <Text style={{ color: b.onBgSoft }}>¿Ya tenés cuenta?</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={{ color: b.onBg, fontWeight: '800' }}>Iniciar sesión</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={verTerminos} transparent animationType="fade" onRequestClose={() => setVerTerminos(false)}>
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: b.card }]}>
            <Text style={[s.modalTitle, { color: b.text }]}>Términos y Condiciones</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              <Text style={{ color: b.textSoft, lineHeight: 20 }}>
                1. FitTime se usa para reservar turnos y consultar rutinas del gimnasio.{'\n\n'}
                2. Tus datos (nombre, correo, teléfono y reservas) se usan sólo para gestionar tu cuenta y tus turnos. Las contraseñas se guardan cifradas.{'\n\n'}
                3. Si no podés asistir, cancelá el turno para liberar el lugar.{'\n\n'}
                4. Las rutinas son orientativas: consultá con tu entrenador antes de empezar y ante cualquier molestia.{'\n\n'}
                5. Podés pedir la baja de tu cuenta al gimnasio en cualquier momento.
              </Text>
            </ScrollView>
            <Button title="Acepto" onPress={() => { setAcepta(true); setVerTerminos(false); }} style={{ marginTop: 16 }} />
            <Button title="Cerrar" variant="white" onPress={() => setVerTerminos(false)} style={{ marginTop: 10 }} />
          </View>
        </View>
      </Modal>
    </AuthLayout>
  );
};

const s = StyleSheet.create({
  steps: { flexDirection: 'row', gap: 10, marginTop: -8 },
  step: { flex: 1, height: 4, borderRadius: 2 },
  stepLabel: { fontSize: 11, marginTop: 6, marginBottom: 18 },
  terms: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  check: { width: 22, height: 22, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  termsError: { color: '#FFF', alignSelf: 'flex-start', fontSize: 12, fontWeight: '600', marginTop: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 22 },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 24 },
  modal: { borderRadius: 18, padding: 22, width: '100%', maxWidth: 480, alignSelf: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
});
