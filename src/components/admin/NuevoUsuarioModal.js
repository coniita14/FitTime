import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { adminService } from '../../api/admin.service';
import { mensajeDeError } from '../../utils/errores';
import { avisar } from '../../utils/dialogos';
import { errorDeClave } from '../../utils/clave';
import { ReglasClave } from '../ReglasClave';
import { FormModal, FormField, FormRow, FieldLabel, SegmentToggle } from './AdminUI';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VACIO = { nombre: '', apellido: '', email: '', telefono: '', password: '', rol: 'CLIENTE' };

// Contraseña temporal legible que cumple las reglas (mayúscula, número y carácter especial).
// El usuario la cambia desde Perfil → Cambiar contraseña.
const generarClave = () => {
  const may = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const min = 'abcdefghijkmnpqrstuvwxyz';
  const al = (t) => t[Math.floor(Math.random() * t.length)];
  let c = al(may);
  for (let i = 0; i < 5; i += 1) c += al(min);
  return `${c}${Math.floor(10 + Math.random() * 89)}${al('!#$%*?')}`;
};

// "+ Nuevo Usuario": crea la cuenta desde el panel sin entrar a Supabase.
export const NuevoUsuarioModal = ({ visible, onClose, onCreado, rolInicial = 'CLIENTE', bloquearRol = false }) => {
  const { theme } = useTheme();
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) { setForm({ ...VACIO, rol: rolInicial, password: generarClave() }); setErrores({}); }
  }, [visible, rolInicial]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const guardar = async () => {
    const e = {};
    if (form.nombre.trim().length < 2) e.nombre = 'Ingresá el nombre';
    if (form.apellido.trim().length < 2) e.apellido = 'Ingresá el apellido';
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Correo inválido';
    if (form.telefono && !/^[\d\s+()-]{6,20}$/.test(form.telefono.trim())) e.telefono = 'Teléfono inválido';
    const errClave = errorDeClave(form.password);
    if (errClave) e.password = errClave;
    setErrores(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const usuario = await adminService.crearUsuario(form);
      onCreado?.(usuario);
      onClose();
      avisar('Cuenta creada', `${form.nombre} ya puede iniciar sesión con:\n\nCorreo: ${form.email.trim().toLowerCase()}\nContraseña: ${form.password}\n\nPasale estos datos y pedile que cambie la contraseña desde su perfil.`);
    } catch (err) {
      avisar('No se pudo crear la cuenta', mensajeDeError(err));
    } finally {
      setSaving(false);
    }
  };

  const titulo = rolInicial === 'ENTRENADOR' && bloquearRol ? 'Crear nuevo Entrenador' : 'Crear nuevo Usuario';
  return (
    <FormModal visible={visible} title={titulo} onClose={onClose} onSubmit={guardar} submitLabel="Crear cuenta" saving={saving}>
      <FormRow>
        <FormField label="Nombre" value={form.nombre} onChangeText={set('nombre')} error={errores.nombre} placeholder="Ej. Lucía" />
        <FormField label="Apellido" value={form.apellido} onChangeText={set('apellido')} error={errores.apellido} placeholder="Ej. Gómez" />
      </FormRow>
      <FormField label="Correo electrónico" value={form.email} onChangeText={set('email')} error={errores.email}
        placeholder="nombre@correo.com" keyboardType="email-address" autoCapitalize="none" />
      <FormRow>
        <FormField label="Teléfono (opcional)" value={form.telefono} onChangeText={set('telefono')} error={errores.telefono}
          placeholder="11 5555-5555" keyboardType="phone-pad" />
        <FormField label="Contraseña temporal" value={form.password} onChangeText={set('password')} error={errores.password} autoCapitalize="none" />
      </FormRow>
      <ReglasClave clave={form.password} color={theme.colors.success} colorPendiente={theme.colors.textMuted} />
      {!bloquearRol && (
        <>
          <FieldLabel>Tipo de cuenta</FieldLabel>
          <SegmentToggle value={form.rol} onChange={set('rol')} options={[['CLIENTE', 'Cliente'], ['ENTRENADOR', 'Entrenador'], ['ADMIN', 'Admin']]} />
        </>
      )}
      <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
        La cuenta queda confirmada y lista para usar. Al terminar te mostramos los datos de acceso para que se los pases.
      </Text>
    </FormModal>
  );
};
