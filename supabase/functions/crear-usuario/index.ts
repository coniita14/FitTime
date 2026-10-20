// FitTime · Edge Function "crear-usuario"
// Permite que un ADMINISTRADOR cree cuentas (cliente, entrenador o admin) desde el panel.
// La clave secreta (service role) vive sólo acá, en el servidor; nunca en la app.
// Seguridad: se valida el JWT de quien llama consultando current_user_is_admin() con SU token.
// Deploy: supabase functions deploy crear-usuario --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const ROLES = ['CLIENTE', 'ENTRENADOR', 'ADMIN'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json(401, { error: 'NO_AUTENTICADO' });

  // 1) ¿Quien llama es administrador? (se evalúa con su propio token, respetando RLS)
  const comoUsuario = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: esAdmin, error: rolError } = await comoUsuario.rpc('current_user_is_admin');
  if (rolError) return json(401, { error: 'NO_AUTENTICADO' });
  if (!esAdmin) return json(403, { error: 'SOLO_ADMIN' });

  // 2) Validar datos
  let body: Record<string, string>;
  try { body = await req.json(); } catch { return json(400, { error: 'Datos inválidos' }); }
  const nombre = (body.nombre ?? '').trim();
  const apellido = (body.apellido ?? '').trim();
  const email = (body.email ?? '').trim().toLowerCase();
  const telefono = (body.telefono ?? '').trim();
  const password = body.password ?? '';
  const rol = (body.rol ?? 'CLIENTE').toUpperCase();
  if (!nombre || !apellido) return json(400, { error: 'Nombre y apellido son obligatorios' });
  if (!EMAIL_RE.test(email)) return json(400, { error: 'Correo inválido' });
  if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9\s]/.test(password)) {
    return json(400, { error: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial' });
  }
  if (!ROLES.includes(rol)) return json(400, { error: 'Rol inválido' });

  // 3) Crear la cuenta confirmada (el trigger on_auth_user_created crea el perfil como CLIENTE)
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { nombre, apellido, telefono },
  });
  if (error || !data.user) {
    const yaExiste = /already|registered|exists/i.test(error?.message ?? '');
    return json(400, { error: yaExiste ? 'Ya existe una cuenta con ese correo' : (error?.message ?? 'No se pudo crear la cuenta') });
  }

  // 4) Asignar el rol pedido
  if (rol !== 'CLIENTE') {
    const { error: updError } = await admin.from('usuarios').update({ rol }).eq('auth_user_id', data.user.id);
    if (updError) return json(500, { error: 'La cuenta se creó pero no se pudo asignar el rol: ' + updError.message });
  }
  const { data: perfil } = await admin.from('usuarios').select('id, nombre, apellido, email, rol').eq('auth_user_id', data.user.id).single();
  return json(200, { usuario: perfil });
});
