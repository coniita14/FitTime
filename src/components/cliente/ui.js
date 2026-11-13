import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Modal, TextInput, StyleSheet, Pressable, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { FUENTES } from '../../styles/theme';

// Kit visual de la app del cliente. Mantiene los colores de FitTime y usa:
// títulos grandes con serif (Fraunces), saludo en las pantallas principales,
// tarjetas con borde fino, botones tipo pastilla y barra inferior flotante.

export const useBrand = () => {
  const { theme } = useTheme();
  return theme.brand;
};

const useS = () => {
  const b = useBrand();
  return useMemo(() => createStyles(b), [b]);
};

// ---------- Estructura de pantalla ----------
export const Screen = ({ title, onBack, right, children, scroll = true, footer, refreshControl, contentStyle }) => {
  const s = useS();
  const b = useBrand();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const Body = scroll ? ScrollView : View;
  const nombre = user?.nombre ? user.nombre.split(' ')[0] : '';
  return (
    <View style={s.screen}>
      <View style={[s.header, { paddingTop: insets.top + 12 }, onBack && s.headerPush]}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={s.backBtn} accessibilityLabel="Volver" accessibilityRole="button">
            <Ionicons name="chevron-back" size={22} color={b.text} />
          </TouchableOpacity>
        ) : null}
        <View style={{ flex: 1 }}>
          {!onBack && nombre ? <Text style={s.saludo}>Hola, {nombre}</Text> : null}
          <Text style={[s.headerTitle, onBack && s.headerTitlePush]} numberOfLines={1} accessibilityRole="header">{title}</Text>
        </View>
        {right}
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Body
          style={{ flex: 1 }}
          contentContainerStyle={scroll ? [s.content, contentStyle] : undefined}
          keyboardShouldPersistTaps="handled"
          {...(scroll ? { keyboardDismissMode: 'on-drag', automaticallyAdjustKeyboardInsets: true, nestedScrollEnabled: true } : {})}
          refreshControl={refreshControl}
        >
          {children}
        </Body>
      </KeyboardAvoidingView>
      {footer}
    </View>
  );
};

export const BellButton = ({ count = 0, onPress }) => {
  const s = useS();
  const b = useBrand();
  return (
    <TouchableOpacity onPress={onPress} style={s.bell} accessibilityLabel={`Notificaciones${count ? `, ${count} sin leer` : ''}`}>
      <Ionicons name={count ? 'notifications' : 'notifications-outline'} size={22} color={b.text} />
      {count > 0 && <View style={s.bellBadge}><Text style={s.bellBadgeText}>{count > 9 ? '9+' : count}</Text></View>}
    </TouchableOpacity>
  );
};

// ---------- Bloques ----------
export const Card = ({ children, style, onPress, muted }) => {
  const s = useS();
  const Comp = onPress ? TouchableOpacity : View;
  return <Comp onPress={onPress} activeOpacity={0.8} style={[s.card, muted && s.cardMuted, style]}>{children}</Comp>;
};

export const SectionTitle = ({ children, style }) => {
  const s = useS();
  return <Text style={[s.sectionTitle, style]}>{children}</Text>;
};

export const Row = ({ label, value, last }) => {
  const s = useS();
  return (
    <View style={[s.row, !last && s.rowBorder]}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
};

export const Pill = ({ text, tone = 'primary', small }) => {
  const b = useBrand();
  const s = useS();
  const map = {
    primary: { bg: b.primary, fg: '#FFFFFF' },
    info: { bg: b.infoSoft, fg: b.info },
    success: { bg: `${b.success}22`, fg: b.success },
    danger: { bg: `${b.danger}22`, fg: b.danger },
    warning: { bg: `${b.warning}22`, fg: b.warning },
    neutral: { bg: b.cardSoft, fg: b.textSoft },
  };
  const c = map[tone] || map.primary;
  return (
    <View style={[s.pill, small && s.pillSmall, { backgroundColor: c.bg }]}>
      <Text style={[s.pillText, small && { fontSize: 11 }, { color: c.fg }]}>{text}</Text>
    </View>
  );
};

export const Button = ({ title, onPress, variant = 'primary', loading, disabled, icon, style, small }) => {
  const s = useS();
  const b = useBrand();
  const outline = variant === 'outline' || variant === 'white';
  const danger = variant === 'danger';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      style={[
        s.btn, small && s.btnSmall,
        outline ? s.btnWhite : { backgroundColor: danger ? '#DC2626' : b.primary },
        (disabled || loading) && { opacity: 0.5 }, style,
      ]}
    >
      {loading ? <ActivityIndicator color={outline ? b.primary : '#FFF'} /> : (
        <View style={s.btnRow}>
          {icon ? <Ionicons name={icon} size={18} color={outline ? b.text : '#FFF'} /> : null}
          <Text style={[s.btnText, small && { fontSize: 13 }, { color: outline ? b.text : '#FFFFFF' }]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const ProgressBar = ({ value = 0, color, height = 8, style }) => {
  const b = useBrand();
  return (
    <View style={[{ height, borderRadius: height, backgroundColor: b.track, overflow: 'hidden' }, style]}>
      <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', backgroundColor: color || b.check, borderRadius: height }} />
    </View>
  );
};

export const Chip = ({ label, active, onPress, icon }) => {
  const s = useS();
  const b = useBrand();
  return (
    <TouchableOpacity onPress={onPress} style={[s.chip, active && s.chipActive]} accessibilityState={{ selected: active }}>
      {icon ? <Ionicons name={icon} size={13} color={active ? '#FFF' : b.text} style={{ marginRight: 4 }} /> : null}
      <Text style={[s.chipText, active && { color: '#FFFFFF' }]}>{label}</Text>
    </TouchableOpacity>
  );
};

export const UnderlineTabs = ({ tabs, value, onChange }) => {
  const s = useS();
  return (
    <View style={s.utabs}>
      {tabs.map(([key, label]) => (
        <TouchableOpacity key={key} style={[s.utab, value === key && s.utabActive]} onPress={() => onChange(key)} accessibilityRole="tab" accessibilityState={{ selected: value === key }}>
          <Text style={[s.utabText, value === key && s.utabTextActive]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export const Field = ({ label, value, onChangeText, placeholder, secure, keyboardType, autoCapitalize = 'none', error, editable = true, rightIcon, maxLength, onBg = true }) => {
  const s = useS();
  const b = useBrand();
  const [visible, setVisible] = React.useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={[s.fieldLabel, !onBg && { color: b.textSoft }]}>{label}</Text> : null}
      <View style={[s.field, error && { borderColor: b.danger, borderWidth: 1.5 }, !editable && { opacity: 0.7 }]}>
        <TextInput
          style={s.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={b.textMuted}
          secureTextEntry={secure && !visible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          maxLength={maxLength}
          accessibilityLabel={label || placeholder}
        />
        {secure ? (
          <TouchableOpacity onPress={() => setVisible(!visible)} accessibilityRole="button" hitSlop={10} accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={b.textMuted} />
          </TouchableOpacity>
        ) : rightIcon ? <Ionicons name={rightIcon} size={18} color={b.textMuted} /> : null}
      </View>
      {error ? <Text style={s.fieldError}>{error}</Text> : null}
    </View>
  );
};

// ---------- Estados ----------
export const Loading = ({ text }) => {
  const s = useS();
  return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={useBrand().primary} />
      {text ? <Text style={s.centerText}>{text}</Text> : null}
    </View>
  );
};

export const ErrorBox = ({ message, onRetry }) => {
  const s = useS();
  const b = useBrand();
  return (
    <Card style={{ alignItems: 'center', gap: 10 }}>
      <Ionicons name="cloud-offline-outline" size={32} color={b.danger} />
      <Text style={[s.rowValue, { textAlign: 'center' }]}>{message}</Text>
      {onRetry ? <Button title="Reintentar" variant="white" small onPress={onRetry} style={{ alignSelf: 'stretch' }} /> : null}
    </Card>
  );
};

export const Empty = ({ icon = 'file-tray-outline', text, action }) => {
  const s = useS();
  const b = useBrand();
  return (
    <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
      <Ionicons name={icon} size={34} color={b.textMuted} />
      <Text style={[s.rowLabel, { textAlign: 'center' }]}>{text}</Text>
      {action}
    </Card>
  );
};

// ---------- Hoja inferior (Confirmar reserva) ----------
export const BottomSheet = ({ visible, onClose, children }) => {
  const s = useS();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.sheetOverlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.sheetHandle} />
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ---------- Barra de navegación inferior ----------
export const TabBar = ({ tabs, value, onChange }) => {
  const s = useS();
  const b = useBrand();
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.tabbarWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={s.tabbar} accessibilityRole="tablist">
        {tabs.map((t) => {
          const active = t.key === value;
          return (
            <TouchableOpacity key={t.key} style={[s.tab, active && s.tabActive]} onPress={() => onChange(t.key)}
              accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={t.label}>
              <Ionicons name={active ? t.icon : `${t.icon}-outline`} size={20} color={active ? '#FFFFFF' : b.navInactive} />
              {active ? <Text style={s.tabText} numberOfLines={1}>{t.label}</Text> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const serif = (tam) => ({ fontFamily: FUENTES.titulo, fontSize: tam, fontWeight: undefined, letterSpacing: -0.3 });

const createStyles = (b) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: b.bg },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 20, paddingBottom: 14, backgroundColor: b.bg },
  headerPush: { alignItems: 'center', paddingBottom: 10 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: b.card, borderWidth: 1, borderColor: b.border,
  },
  saludo: { color: b.textSoft, fontSize: 14, marginBottom: 2 },
  headerTitle: { ...serif(30), color: b.text, flexShrink: 1 },
  headerTitlePush: { ...serif(22) },
  content: { padding: 16, paddingTop: 6, paddingBottom: 110, width: '100%', maxWidth: 720, alignSelf: 'center' },
  bell: {
    width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
    backgroundColor: b.card, borderWidth: 1, borderColor: b.border,
  },
  bellBadge: {
    position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: b.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: b.bg,
  },
  bellBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  card: { backgroundColor: b.card, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: b.border },
  cardMuted: { opacity: 0.6 },
  sectionTitle: { ...serif(20), color: b.onBg, marginTop: 10, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: b.border },
  rowLabel: { color: b.textSoft, fontSize: 13 },
  rowValue: { color: b.text, fontSize: 13, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start' },
  pillSmall: { paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { fontSize: 12, fontWeight: '700' },
  btn: { minHeight: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  btnSmall: { minHeight: 36, borderRadius: 999, paddingHorizontal: 16 },
  btnWhite: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: b.text },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { fontSize: 15, fontWeight: '700' },
  chip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: b.card, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: b.border,
  },
  chipActive: { backgroundColor: b.text, borderColor: b.text },
  chipText: { color: b.text, fontSize: 13, fontWeight: '600' },
  utabs: { flexDirection: 'row', backgroundColor: b.card, borderRadius: 999, marginBottom: 14, padding: 4, borderWidth: 1, borderColor: b.border },
  utab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 999 },
  utabActive: { backgroundColor: b.primary },
  utabText: { color: b.textMuted, fontWeight: '600' },
  utabTextActive: { color: '#FFFFFF', fontWeight: '800' },
  fieldLabel: { color: b.onBg, fontWeight: '700', fontSize: 13, marginBottom: 6 },
  field: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: b.card, borderRadius: 16, minHeight: 52,
    paddingHorizontal: 16, borderWidth: 1, borderColor: b.border,
  },
  fieldInput: { flex: 1, color: b.text, fontSize: 15, paddingVertical: 10, ...Platform.select({ web: { outlineStyle: 'none' }, default: {} }) },
  fieldError: { color: '#FFFFFF', backgroundColor: b.danger, alignSelf: 'flex-start', fontSize: 12, fontWeight: '600', marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  centerText: { color: b.onBgSoft, fontWeight: '600' },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: b.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 34,
    width: '100%', maxWidth: 720, alignSelf: 'center',
  },
  sheetHandle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: b.border, marginBottom: 14 },
  tabbarWrap: { paddingHorizontal: 16, paddingTop: 8, backgroundColor: b.bg },
  tabbar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: b.navBg, borderRadius: 30, padding: 6,
    borderWidth: 1, borderColor: b.border, width: '100%', maxWidth: 520, alignSelf: 'center',
    ...Platform.select({ web: { boxShadow: '0px 10px 30px rgba(15, 23, 42, 0.12)' }, default: { elevation: 6, shadowColor: '#0F172A', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } } }),
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 24 },
  tabActive: { flex: 1.6, backgroundColor: b.navActive },
  tabText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
