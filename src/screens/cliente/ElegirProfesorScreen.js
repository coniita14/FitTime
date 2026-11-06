import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Button, Loading, ErrorBox, Empty, Pill, useBrand } from '../../components/cliente/ui';
import { clienteService } from '../../api/cliente.service';
import { useAuth } from '../../context/AuthContext';
import { mensajeDeError } from '../../utils/errores';
import { avisar, confirmar } from '../../utils/dialogos';

const DIA_CORTO = { LUNES: 'Lun', MARTES: 'Mar', MIERCOLES: 'Mié', JUEVES: 'Jue', VIERNES: 'Vie', SABADO: 'Sáb', DOMINGO: 'Dom' };
const nombre = (p) => `${p.nombre}${p.apellido && p.apellido !== '-' ? ` ${p.apellido}` : ''}`;

// El cliente elige a su profesor/a. Recién entonces el profesor puede asignarle rutinas
// (el servidor lo controla en admin_asignar_rutina) y le llega un aviso de "Nuevo alumno".
export const ElegirProfesorScreen = ({ navigation }) => {
  const b = useBrand();
  const s = useMemo(() => createStyles(b), [b]);
  const { user, patchUser } = useAuth();
  const [profes, setProfes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eligiendo, setEligiendo] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProfes(await clienteService.listarProfesores());
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudieron cargar los profesores.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const elegir = async (p) => {
    const cambio = !!user?.profesor_id;
    const ok = await confirmar(
      cambio ? 'Cambiar de profesor/a' : 'Elegir profesor/a',
      `¿Querés que ${nombre(p)} sea tu profesor/a? Le vamos a avisar para que te asigne una rutina.`,
      'Elegir',
    );
    if (!ok) return;
    setEligiendo(p.id);
    try {
      await clienteService.elegirProfesor(p.id);
      patchUser({ profesor_id: p.id });
      avisar('¡Listo!', `${nombre(p)} es tu profesor/a. Cuando te asigne una rutina te va a llegar una notificación.`);
      navigation.goBack();
    } catch (e) {
      avisar('No se pudo elegir', mensajeDeError(e));
    } finally {
      setEligiendo(null);
    }
  };

  return (
    <Screen title="Elegí tu profesor/a" onBack={navigation.goBack}>
      <Text style={s.intro}>Tu profesor/a es quien arma y te asigna tus rutinas. Podés cambiarlo cuando quieras.</Text>
      {loading && <Loading />}
      {!loading && error && <ErrorBox message={error} onRetry={cargar} />}
      {!loading && !error && profes.length === 0 && <Empty icon="people-outline" text="Todavía no hay profesores cargados en el gimnasio." />}
      {!loading && !error && profes.map((p) => {
        const actual = user?.profesor_id === p.id;
        return (
          <Card key={p.id} style={[s.card, actual && { borderWidth: 2, borderColor: b.primary }]}>
            <View style={s.row}>
              <View style={s.avatar}>
                {p.avatar_url ? <Image source={{ uri: p.avatar_url }} style={s.avatarImg} accessibilityIgnoresInvertColors />
                  : <Text style={s.initials}>{(p.nombre?.[0] || '?').toUpperCase()}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{nombre(p)}</Text>
                <Text style={s.sub}>{p.alumnos} {p.alumnos === 1 ? 'alumno' : 'alumnos'}</Text>
              </View>
              {actual && <Pill text="Tu profesor/a" small />}
            </View>
            <View style={s.clases}>
              <Ionicons name="time-outline" size={15} color={b.textSoft} />
              <Text style={s.clasesText}>
                {p.clases.length ? p.clases.map((c) => `${DIA_CORTO[c.dia]} ${c.hora_inicio.slice(0, 5)}`).join(' · ') : 'Sin clases asignadas por ahora'}
              </Text>
            </View>
            {!actual && (
              <Button title={`Elegir a ${p.nombre}`} small onPress={() => elegir(p)} loading={eligiendo === p.id}
                disabled={!!eligiendo} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
            )}
          </Card>
        );
      })}
    </Screen>
  );
};

const createStyles = (b) => StyleSheet.create({
  intro: { color: b.onBgSoft, fontSize: 14, marginBottom: 12, lineHeight: 20 },
  card: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: b.cardSoft, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 52, height: 52, borderRadius: 26 },
  initials: { fontSize: 20, fontWeight: '800', color: b.primary },
  name: { color: b.text, fontSize: 16, fontWeight: '800' },
  sub: { color: b.textSoft, fontSize: 12 },
  clases: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  clasesText: { flex: 1, color: b.textSoft, fontSize: 13, lineHeight: 18 },
});
