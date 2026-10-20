import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { mensajeDeError } from '../../utils/errores';
import { avisar, confirmar } from '../../utils/dialogos';
import { errorDeClave } from '../../utils/clave';
import { ReglasClave } from '../../components/ReglasClave';
import { CustomInput } from '../../components/CustomInput';
import { CustomButton } from '../../components/CustomButton';
import { ScreenHeader, Card } from '../../components/admin/AdminUI';

export const PerfilAdmin = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, updateProfile, changePassword, logout } = useAuth();
  const s = createStyles(theme);
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [apellido, setApellido] = useState(user?.apellido === '-' ? '' : user?.apellido || '');
  const [telefono, setTelefono] = useState(user?.telefono || '');
  const [clave, setClave] = useState('');
  const [clave2, setClave2] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [cambiandoClave, setCambiandoClave] = useState(false);

  const guardarDatos = async () => {
    if (!nombre.trim() || !apellido.trim()) { avisar('Datos incompletos', 'El nombre y el apellido son obligatorios.'); return; }
    setGuardando(true);
    try {
      await updateProfile({ nombre, apellido, telefono });
      avisar('Perfil actualizado', 'Tus datos se guardaron correctamente.');
    } catch (err) {
      avisar('No se pudo guardar', mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const guardarClave = async () => {
    const errClave = errorDeClave(clave);
    if (errClave) { avisar('Contraseña inválida', errClave); return; }
    if (clave !== clave2) { avisar('No coinciden', 'Las dos contraseñas deben ser iguales.'); return; }
    setCambiandoClave(true);
    try {
      await changePassword(clave);
      setClave('');
      setClave2('');
      avisar('Contraseña actualizada', 'Tu contraseña se cambió correctamente.');
    } catch (err) {
      avisar('No se pudo cambiar', mensajeDeError(err));
    } finally {
      setCambiandoClave(false);
    }
  };

  const salir = async () => {
    if (!(await confirmar('Cerrar sesión', '¿Querés salir de FitTime?', 'Cerrar sesión'))) return;
    try {
      await logout();
    } catch (err) {
      avisar('No se pudo cerrar sesión', mensajeDeError(err));
    }
  };

  return (
    <View>
      <ScreenHeader title="Mi perfil" subtitle={user?.email} />

      <Card>
        <Text style={s.title}>Datos personales</Text>
        <CustomInput label="Nombre" value={nombre} onChangeText={setNombre} autoCapitalize="words" />
        <CustomInput label="Apellido" value={apellido} onChangeText={setApellido} autoCapitalize="words" />
        <CustomInput label="Teléfono" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />
        <CustomButton title="Guardar datos" onPress={guardarDatos} isLoading={guardando} />
      </Card>

      <Card>
        <Text style={s.title}>Cambiar contraseña</Text>
        <CustomInput label="Nueva contraseña" value={clave} onChangeText={setClave} secureTextEntry />
        <ReglasClave clave={clave} color={theme.colors.success} colorPendiente={theme.colors.textMuted} />
        <CustomInput label="Repetir contraseña" value={clave2} onChangeText={setClave2} secureTextEntry />
        <CustomButton title="Cambiar contraseña" variant="outline" onPress={guardarClave} isLoading={cambiandoClave} />
      </Card>

      <Card style={s.rowCard}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Tema oscuro</Text>
          <Text style={s.meta}>Se guarda en este dispositivo</Text>
        </View>
        <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ true: theme.colors.primary }} />
      </Card>

      <CustomButton title="Cerrar sesión" variant="danger" iconName="log-out-outline" onPress={salir} />
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  title: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: theme.typography.sizes.md, marginBottom: theme.spacing.md },
  meta: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm, marginTop: -theme.spacing.sm },
  rowCard: { flexDirection: 'row', alignItems: 'center' },
});
