import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Field, Button, useBrand } from '../../components/cliente/ui';
import { useAuth } from '../../context/AuthContext';
import { mensajeDeError } from '../../utils/errores';
import { avisar } from '../../utils/dialogos';
import { reglasClave, errorDeClave } from '../../utils/clave';

const NIVELES = ['Muy débil', 'Débil', 'Media', 'Buena', 'Fuerte'];

// 3D · Cambiar contraseña: actual, nueva, confirmación y medidor de fortaleza.
export const CambiarClaveScreen = ({ navigation }) => {
  const b = useBrand();
  const s = useMemo(() => createStyles(b), [b]);
  const { changePassword } = useAuth();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [errores, setErrores] = useState({});
  const [loading, setLoading] = useState(false);

  const reglas = reglasClave(nueva);
  const puntaje = reglas.filter((r) => r.ok).length;
  const colores = [b.danger, b.danger, b.warning, b.check, b.success];

  const actualizar = async () => {
    const e = {};
    if (!actual) e.actual = 'Ingresá tu contraseña actual';
    const errClave = errorDeClave(nueva);
    if (errClave) e.nueva = errClave;
    else if (nueva === actual) e.nueva = 'La nueva contraseña debe ser distinta de la actual';
    if (confirmar !== nueva) e.confirmar = 'Las contraseñas no coinciden';
    setErrores(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await changePassword(nueva, actual);
      avisar('Contraseña actualizada', 'Tu contraseña se cambió correctamente.');
      navigation.goBack();
    } catch (err) {
      const msg = mensajeDeError(err);
      if (msg.includes('actual')) setErrores({ actual: msg });
      else avisar('No se pudo cambiar la contraseña', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Cambiar contraseña" onBack={navigation.goBack}>
      <Field label="Contraseña actual" placeholder="••••••••" value={actual} onChangeText={setActual} secure error={errores.actual} />
      <Field label="Nueva contraseña" placeholder="••••••••" value={nueva} onChangeText={setNueva} secure error={errores.nueva} />
      <Field label="Confirmar nueva" placeholder="••••••••" value={confirmar} onChangeText={setConfirmar} secure error={errores.confirmar} />

      <Text style={s.label}>Fortaleza de la contraseña</Text>
      <View style={s.bars}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[s.bar, { backgroundColor: i < puntaje ? colores[puntaje] : b.track }]} />
        ))}
      </View>
      <Text style={s.level}>{nueva ? NIVELES[puntaje] : '—'}</Text>
      <View style={{ gap: 6, marginBottom: 24 }}>
        {reglas.map((r) => (
          <View key={r.texto} style={s.rule}>
            <Ionicons name={r.ok ? 'checkmark' : 'close'} size={16} color={r.ok ? b.onBg : b.onBgSoft} />
            <Text style={[s.ruleText, { color: r.ok ? b.onBg : b.onBgSoft, opacity: r.ok ? 1 : 0.75 }]}>{r.texto}</Text>
          </View>
        ))}
      </View>
      <Button title="Actualizar Contraseña" onPress={actualizar} loading={loading} />
    </Screen>
  );
};

const createStyles = (b) => StyleSheet.create({
  label: { color: b.onBgSoft, fontSize: 12, marginTop: 6 },
  bars: { flexDirection: 'row', gap: 6, marginTop: 8 },
  bar: { flex: 1, height: 6, borderRadius: 3 },
  level: { color: b.onBg, fontSize: 12, fontWeight: '700', marginTop: 6, marginBottom: 10 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleText: { fontSize: 13 },
});
