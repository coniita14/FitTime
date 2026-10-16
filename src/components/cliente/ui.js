import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Modal, TextInput, StyleSheet, Pressable, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

// Kit visual de la app del cliente, basado en los wireframes de FitTime:
// fondo azul, encabezado blanco, tarjetas blancas redondeadas y botones índigo.

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
  const Body = scroll ? ScrollView : View;
  return (
    <View style={s.screen}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={s.backBtn} accessibilityLabel="Volver" accessibilityRole="button">
            <Ionicons name="arrow-back" size={22} color={b.text} />
          </TouchableOpacity>
        ) : null}
        <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={{ flex: 1 }} />
        {right}
      </View>
      <Body
        style={{ flex: 1 }}
        contentContainerStyle={scroll ? [s.content, contentStyle] : undefined}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
      >
        {children}
      </Body>
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
        outline ? s.btnWhite : { backgroundColor: danger ? b.danger : b.primary },
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
        <TouchableOpacity key={key} style={[s.utab, value === key && s.utabActive]} onPress={() => onChange(key)}>
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
          <TouchableOpacity onPress={() => setVisible(!visible)} accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
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
      <ActivityIndicator size="large" color="#FFFFFF" />
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
    <View style={[s.tabbar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <TouchableOpacity key={t.key} style={s.tab} onPress={() => onChange(t.key)} accessibilityRole="tab" accessibilityState={{ selected: active }}>
            {active && <View style={s.tabIndicator} />}
            <Ionicons name={active ? t.icon : `${t.icon}-outline`} size={22} color={active ? b.navActive : b.navInactive} />
            <Text style={[s.tabText, { color: active ? b.navActive : b.navInactive }, active && { fontWeight: '700' }]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const createStyles = (b) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: b.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingBottom: 12,
    backgroundColor: b.card, borderBottomWidth: 1, borderBottomColor: b.border,
  },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: b.text, flexShrink: 1 },
  content: { padding: 16, paddingBottom: 40, width: '100%', maxWidth: 720, alignSelf: 'center' },
  bell: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: b.cardSoft },
  bellBadge: {
    position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: b.danger, alignItems: 'center', justifyContent: 'center',
  },
  bellBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  card: {
    backgroundColor: b.card, borderRadius: 14, padding: 14, marginBottom: 12,
    ...Platform.select({ web: { boxShadow: '0px 2px 6px rgba(15, 23, 42, 0.08)' }, default: { elevation: 1 } }),
  },
  cardMuted: { opacity: 0.6 },
  sectionTitle: { color: b.onBg, fontWeight: '800', fontSize: 15, marginTop: 6, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: b.border },
  rowLabel: { color: b.textSoft, fontSize: 13 },
  rowValue: { color: b.text, fontSize: 13, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start' },
  pillSmall: { paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { fontSize: 12, fontWeight: '700' },
  btn: { minHeight: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  btnSmall: { minHeight: 36, borderRadius: 999, paddingHorizontal: 14 },
  btnWhite: { backgroundColor: b.card, borderWidth: 1.5, borderColor: b.border },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { fontSize: 15, fontWeight: '700' },
  chip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: b.card, marginRight: 8, marginBottom: 8,
  },
  chipActive: { backgroundColor: b.primary },
  chipText: { color: b.text, fontSize: 13, fontWeight: '600' },
  utabs: { flexDirection: 'row', backgroundColor: b.card, borderRadius: 12, marginBottom: 14, overflow: 'hidden' },
  utab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  utabActive: { borderBottomColor: b.primary },
  utabText: { color: b.textMuted, fontWeight: '600' },
  utabTextActive: { color: b.text, fontWeight: '800' },
  fieldLabel: { color: b.onBg, fontWeight: '700', fontSize: 13, marginBottom: 6 },
  field: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: b.card, borderRadius: 10, minHeight: 50,
    paddingHorizontal: 14, borderWidth: 1, borderColor: b.border,
  },
  fieldInput: { flex: 1, color: b.text, fontSize: 15, paddingVertical: 10, ...Platform.select({ web: { outlineStyle: 'none' }, default: {} }) },
  fieldError: { color: '#FFFFFF', backgroundColor: b.danger, alignSelf: 'flex-start', fontSize: 12, fontWeight: '600', marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  centerText: { color: '#FFFFFF', fontWeight: '600' },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: b.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 34,
    width: '100%', maxWidth: 720, alignSelf: 'center',
  },
  sheetHandle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: b.border, marginBottom: 14 },
  tabbar: { flexDirection: 'row', backgroundColor: b.navBg, borderTopWidth: 1, borderTopColor: b.border, paddingTop: 6 },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingTop: 4 },
  tabIndicator: { position: 'absolute', top: -7, width: 48, height: 3, borderRadius: 2, backgroundColor: b.navActive },
  tabText: { fontSize: 11 },
});
