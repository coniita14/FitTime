# Parche: teclado/desplazamiento y motivo de cancelación visible para el alumno
import json, re, sys, os
os.chdir(sys.argv[1] if len(sys.argv) > 1 else '.')
def edit(p, pares):
    s = open(p, encoding='utf-8').read()
    for a, b in pares:
        if a not in s:
            raise SystemExit(f'NO ENCONTRADO en {p}: {a[:70]}')
        s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8').write(s)
    print('ok', p)

# 1) Pantallas del cliente: el teclado no tapa y se puede deslizar mientras se escribe
edit('src/components/cliente/ui.js', [
 ("  View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Modal, TextInput, StyleSheet, Pressable, Platform,",
  "  View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Modal, TextInput, StyleSheet, Pressable, Platform,\n  KeyboardAvoidingView,"),
 ("""      <Body
        style={{ flex: 1 }}
        contentContainerStyle={scroll ? [s.content, contentStyle] : undefined}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
      >
        {children}
      </Body>""",
  """      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Body
          style={{ flex: 1 }}
          contentContainerStyle={scroll ? [s.content, contentStyle] : undefined}
          keyboardShouldPersistTaps="handled"
          {...(scroll ? { keyboardDismissMode: 'on-drag', automaticallyAdjustKeyboardInsets: true, nestedScrollEnabled: true } : {})}
          refreshControl={refreshControl}
        >
          {children}
        </Body>
      </KeyboardAvoidingView>"""),
])

# 2) Panel entrenador/admin: contenido con teclado
edit('src/screens/admin/AdminScreen.js', [
 ("  Animated, PanResponder, BackHandler,", "  Animated, PanResponder, BackHandler, KeyboardAvoidingView,"),
 ("""        <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.content, esAncho && s.contentWide, { paddingBottom: 40 + insets.bottom }]}>
          {contenido}
        </ScrollView>""",
  """        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.content, esAncho && s.contentWide, { paddingBottom: 40 + insets.bottom }]}
            keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets nestedScrollEnabled>
            {contenido}
          </ScrollView>
        </KeyboardAvoidingView>"""),
])

# 3) Ventanas (formularios): alto según la pantalla y deslizables con el teclado abierto
s = open('src/components/admin/AdminUI.js', encoding='utf-8').read()
if 'useWindowDimensions' not in s.split('\n', 6)[0:6].__str__():
    s = re.sub(r"(import \{[^}]*?)\} from 'react-native';", lambda m: m.group(1).rstrip().rstrip(',') + ", useWindowDimensions } from 'react-native';", s, count=1)
open('src/components/admin/AdminUI.js', 'w', encoding='utf-8').write(s)
edit('src/components/admin/AdminUI.js', [
 ("""  const s = useAdminStyles();
  const { theme } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>""",
  """  const s = useAdminStyles();
  const { theme } = useTheme();
  const { height } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>"""),
 ("""<ScrollView style={{ maxHeight: 560 }} contentContainerStyle={{ padding: 18 }} keyboardShouldPersistTaps="handled">""",
  """<ScrollView style={{ maxHeight: Math.min(560, height * 0.62) }} contentContainerStyle={{ padding: 18 }}
            keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" nestedScrollEnabled>"""),
])

# 4) Android: la pantalla se achica cuando aparece el teclado
cfg = json.load(open('app.json', encoding='utf-8'))
cfg['expo'].setdefault('android', {})['softwareKeyboardLayoutMode'] = 'resize'
json.dump(cfg, open('app.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
open('app.json', 'a', encoding='utf-8').write('\n')
print('ok app.json')

# 5) Mis turnos: motivo de cancelación + deslizar hacia abajo para actualizar
edit('src/api/cliente.service.js', [
 ("profesor:usuarios!turnos_profesor_id_fkey(nombre, apellido), horarios(dia, hora_inicio, hora_fin, cupo_maximo, usuarios(nombre, apellido))')",
  "profesor:usuarios!turnos_profesor_id_fkey(nombre, apellido), gestion_turnos(motivo, fecha_gestion), horarios(dia, hora_inicio, hora_fin, cupo_maximo, usuarios(nombre, apellido))')"),
])
edit('src/screens/cliente/MisTurnosScreen.js', [
 ("import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';",
  "import { View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';"),
 ("""export const ESTADO_PILL = {""",
  """// Último motivo registrado cuando el gimnasio o el profesor/a cancela el turno
export const motivoCancelacion = (t) => {
  if (t?.estado !== 'CANCELADO') return null;
  const g = [...(t.gestion_turnos || [])].sort((a, c) => String(c.fecha_gestion).localeCompare(String(a.fecha_gestion)))[0];
  return g?.motivo || null;
};

export const ESTADO_PILL = {"""),
 ("""  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);""",
  """  const [error, setError] = useState(null);
  const [refrescando, setRefrescando] = useState(false);

  const refrescar = async () => {
    setRefrescando(true);
    try { setTurnos(await clienteService.misTurnos()); } catch { /* se mantiene la lista anterior */ }
    setRefrescando(false);
  };

  const cargar = useCallback(async () => {
    setLoading(true);"""),
 ("""    <Screen title="Mis Turnos" right={campana}>""",
  """    <Screen title="Mis Turnos" right={campana} refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} />}>"""),
 ("""              <Text style={s.time}>{hora(t.horarios?.hora_inicio)} – {hora(t.horarios?.hora_fin)}</Text>""",
  """              <Text style={s.time}>{hora(t.horarios?.hora_inicio)} – {hora(t.horarios?.hora_fin)}</Text>
              {motivoCancelacion(t) ? <Text style={s.motivo}>Motivo: {motivoCancelacion(t)}</Text> : null}"""),
])
s = open('src/screens/cliente/MisTurnosScreen.js', encoding='utf-8').read()
s = s.replace("const createStyles = (b) => StyleSheet.create({", "const createStyles = (b) => StyleSheet.create({\n  motivo: { color: b.danger, fontSize: 13, fontWeight: '600', marginTop: 2 },", 1)
open('src/screens/cliente/MisTurnosScreen.js', 'w', encoding='utf-8').write(s)

# 6) Detalle del turno: muestra el motivo
s = open('src/screens/cliente/TurnoDetalleScreen.js', encoding='utf-8').read()
if "motivoCancelacion" not in s:
    s = re.sub(r"(import \{[^}]*ESTADO_PILL[^}]*)\} from './MisTurnosScreen';", lambda m: m.group(1).rstrip().rstrip(',') + ", motivoCancelacion } from './MisTurnosScreen';", s, count=1)
open('src/screens/cliente/TurnoDetalleScreen.js', 'w', encoding='utf-8').write(s)
edit('src/screens/cliente/TurnoDetalleScreen.js', [
 ("""        <Row label="Profesor/a:" value={instructor || 'Sin elegir'} last />""",
  """        <Row label="Profesor/a:" value={instructor || 'Sin elegir'} last={!motivoCancelacion(turno)} />
        {motivoCancelacion(turno) ? <Row label="Motivo de la cancelación:" value={motivoCancelacion(turno)} last /> : null}"""),
])
print('LISTO')