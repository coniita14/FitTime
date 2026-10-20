import React, { useState } from 'react';
import { Text } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { AuthLayout } from './AuthLayout';
import { Field, Button } from '../../components/cliente/ui';
import { mensajeDeError } from '../../utils/errores';
import { avisar } from '../../utils/dialogos';
import { errorDeClave } from '../../utils/clave';
import { ReglasClave } from '../../components/ReglasClave';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Recuperar contraseña en dos pasos: 1) pedir código por mail, 2) código + nueva contraseña.
export const RecuperarScreen = ({ navigation, route }) => {
  const { requestPasswordReset, resetPassword } = useAuth();
  const { theme } = useTheme();
  const b = theme.brand;
  const [email, setEmail] = useState(route?.params?.email || '');
  const [enviado, setEnviado] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [clave, setClave] = useState('');
  const [clave2, setClave2] = useState('');
  const [errores, setErrores] = useState({});
  const [loading, setLoading] = useState(false);

  const enviar = async () => {
    if (!EMAIL_RE.test(email.trim())) { setErrores({ email: 'Ingresá un correo válido' }); return; }
    setErrores({});
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setEnviado(true);
    } catch (err) {
      avisar('No se pudo enviar el código', mensajeDeError(err));
    } finally {
      setLoading(false);
    }
  };

  const cambiar = async () => {
    const e = {};
    if (!/^\d{6}$/.test(codigo.trim())) e.codigo = 'El código tiene 6 números';
    const errClave = errorDeClave(clave);
    if (errClave) e.clave = errClave;
    if (clave !== clave2) e.clave2 = 'Las contraseñas no coinciden';
    setErrores(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await resetPassword(email, codigo, clave);
      avisar('Contraseña actualizada', 'Ya podés iniciar sesión con tu nueva contraseña.');
      navigation.navigate('Login');
    } catch (err) {
      avisar('No se pudo cambiar la contraseña', mensajeDeError(err, 'Revisá el código e intentá de nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Recuperar contraseña"
      subtitle={enviado ? `Ingresá el código de 6 números que enviamos a ${email}` : 'Te enviaremos un código a tu correo'}
      onBack={() => (enviado ? setEnviado(false) : navigation.goBack())}
    >
      {!enviado ? (
        <>
          <Field label="Email" placeholder="usuario@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" error={errores.email} />
          <Button title="Enviar código" onPress={enviar} loading={loading} />
        </>
      ) : (
        <>
          <Field label="Código" placeholder="123456" value={codigo} onChangeText={(v) => setCodigo(v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={6} error={errores.codigo} />
          <Field label="Nueva contraseña" placeholder="••••••••" value={clave} onChangeText={setClave} secure error={errores.clave} />
          <ReglasClave clave={clave} color={theme.brand.onBg} colorPendiente={theme.brand.onBgSoft} />
          <Field label="Repetir contraseña" placeholder="••••••••" value={clave2} onChangeText={setClave2} secure error={errores.clave2} />
          <Button title="Cambiar contraseña" onPress={cambiar} loading={loading} />
          <Text onPress={enviar} style={{ color: b.onBg, textAlign: 'center', marginTop: 18, textDecorationLine: 'underline' }}>
            No me llegó el código, reenviar
          </Text>
        </>
      )}
    </AuthLayout>
  );
};
