import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { AuthLayout } from './AuthLayout';
import { Field, Button } from '../../components/cliente/ui';
import { mensajeDeError } from '../../utils/errores';
import { avisar } from '../../utils/dialogos';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Tipos de ingreso y lo que ve cada uno después de iniciar sesión.
const TIPOS = {
  CLIENTE: {
    titulo: 'Cliente',
    icono: 'person',
    descripcion: 'Reservá turnos, seguí tus rutinas y mirá tus notificaciones.',
  },
  ENTRENADOR: {
    titulo: 'Entrenador',
    icono: 'barbell',
    descripcion: 'Gestioná tus clases, tus alumnos, rutinas y ejercicios.',
  },
  ADMIN: {
    titulo: 'Administrador',
    icono: 'shield-checkmark',
    descripcion: 'Horarios, usuarios, entrenadores, turnos y reportes del gimnasio.',
  },
};

// 1C · Login con elección de tipo de cuenta: "Ingresar como Cliente o Entrenador".
// El rol se verifica contra la base: si no coincide, no se entra (ver AuthContext.login).
export const LoginScreen = ({ navigation, route }) => {
  const { login, loginWithGoogle } = useAuth();
  const { theme } = useTheme();
  const b = theme.brand;
  const [tipo, setTipo] = useState(route?.params?.tipo || 'CLIENTE');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const esCliente = tipo === 'CLIENTE';

  const ingresar = async () => {
    const e = {};
    if (!EMAIL_RE.test(email.trim())) e.email = 'Ingresá un correo válido';
    if (!password) e.password = 'Ingresá tu contraseña';
    setErrores(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await login(email, password, tipo);
    } catch (err) {
      avisar('No se pudo iniciar sesión', mensajeDeError(err, 'Verificá tus datos e intentá de nuevo.'));
      setLoading(false);
    }
  };

  const google = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      avisar('No se pudo iniciar con Google', mensajeDeError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  const Opcion = ({ clave }) => {
    const t = TIPOS[clave];
    const activo = tipo === clave;
    return (
      <TouchableOpacity
        onPress={() => setTipo(clave)}
        style={[s.option, { backgroundColor: activo ? b.primary : b.card, borderColor: activo ? b.primary : b.border }]}
        accessibilityRole="radio"
        accessibilityState={{ selected: activo }}
        accessibilityLabel={`Ingresar como ${t.titulo}`}
      >
        <View style={[s.optionIcon, { backgroundColor: activo ? 'rgba(255,255,255,0.18)' : b.cardSoft }]}>
          <Ionicons name={t.icono} size={20} color={activo ? '#FFFFFF' : b.primary} />
        </View>
        <Text style={[s.optionTitle, { color: activo ? '#FFFFFF' : b.text }]}>{t.titulo}</Text>
        {activo && <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={s.optionCheck} />}
      </TouchableOpacity>
    );
  };

  return (
    <AuthLayout title="Iniciar Sesión" subtitle="Elegí cómo querés ingresar" onBack={() => navigation.goBack()}>
      <Text style={[s.label, { color: b.onBg }]}>Ingresar como</Text>
      {tipo === 'ADMIN' ? (
        <View style={[s.adminBox, { backgroundColor: b.card }]}>
          <Ionicons name={TIPOS.ADMIN.icono} size={20} color={b.primary} />
          <Text style={[s.optionTitle, { color: b.text, flex: 1 }]}>Administrador</Text>
          <TouchableOpacity onPress={() => setTipo('CLIENTE')}>
            <Text style={{ color: b.primary, fontWeight: '700', fontSize: 13 }}>Cambiar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.options} accessibilityRole="radiogroup">
          <Opcion clave="CLIENTE" />
          <Opcion clave="ENTRENADOR" />
        </View>
      )}
      <View style={[s.hint, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
        <Ionicons name="information-circle-outline" size={16} color={b.onBg} />
        <Text style={[s.hintText, { color: b.onBg }]}>{TIPOS[tipo].descripcion}</Text>
      </View>

      <Field label="Email" placeholder={esCliente ? 'usuario@email.com' : tipo === 'ENTRENADOR' ? 'entrenador@email.com' : 'admin@email.com'}
        value={email} onChangeText={setEmail} keyboardType="email-address" error={errores.email} />
      <Field label="Contraseña" placeholder="••••••••" value={password} onChangeText={setPassword}
        secure error={errores.password} />
      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword', { email })} style={s.forgot}>
        <Text style={[s.link, { color: b.onBgSoft }]}>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity>

      <Button title={`Ingresar como ${TIPOS[tipo].titulo.toLowerCase()}`} onPress={ingresar} loading={loading} style={{ marginTop: 8 }} />

      {esCliente ? (
        <>
          <View style={s.divider}>
            <View style={[s.line, { backgroundColor: b.onBgSoft }]} />
            <Text style={{ color: b.onBgSoft, fontSize: 12 }}>o</Text>
            <View style={[s.line, { backgroundColor: b.onBgSoft }]} />
          </View>

          <TouchableOpacity onPress={google} disabled={googleLoading} style={[s.google, { backgroundColor: b.card }]} accessibilityRole="button">
            <View style={s.gCircle}><Text style={s.gText}>G</Text></View>
            <Text style={[s.googleText, { color: b.text }]}>{googleLoading ? 'Conectando…' : 'Continuar con Google'}</Text>
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={{ color: b.onBgSoft }}>¿No tenés cuenta?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={[s.footerLink, { color: b.onBg }]}>Registrarse</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <Text style={[s.staffNote, { color: b.onBgSoft }]}>
          {tipo === 'ENTRENADOR'
            ? 'Las cuentas de entrenador las crea el gimnasio. Si todavía no tenés una, pedila a la administración.'
            : 'Acceso exclusivo para la administración del gimnasio.'}
        </Text>
      )}

      {tipo !== 'ADMIN' && (
        <TouchableOpacity onPress={() => setTipo('ADMIN')} style={s.adminLink} accessibilityRole="button">
          <Ionicons name="shield-checkmark-outline" size={14} color={b.onBgSoft} />
          <Text style={[s.link, { color: b.onBgSoft }]}>Acceso administrador</Text>
        </TouchableOpacity>
      )}
    </AuthLayout>
  );
};

const s = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', marginTop: -8, marginBottom: 8 },
  options: { flexDirection: 'row', gap: 10 },
  option: {
    flex: 1, borderRadius: 12, borderWidth: 1.5, paddingVertical: 14, paddingHorizontal: 12,
    alignItems: 'center', gap: 8,
  },
  optionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: 15, fontWeight: '800' },
  optionCheck: { position: 'absolute', top: 8, right: 8 },
  adminBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 14 },
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, padding: 10, marginTop: 10, marginBottom: 18 },
  hintText: { flex: 1, fontSize: 12, lineHeight: 17 },
  forgot: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 12, paddingVertical: 4 },
  link: { fontSize: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 },
  line: { flex: 1, height: 1, opacity: 0.5 },
  google: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 50, borderRadius: 10, paddingHorizontal: 18 },
  gCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  gText: { fontWeight: '900', color: '#4285F4' },
  googleText: { fontSize: 15, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 30, marginTop: 26 },
  footerLink: { fontWeight: '800' },
  staffNote: { fontSize: 12, textAlign: 'center', marginTop: 18, lineHeight: 17 },
  adminLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 22, paddingVertical: 6 },
});
