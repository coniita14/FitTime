import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, Modal, ScrollView, TextInput,
  StyleSheet, KeyboardAvoidingView, Platform, useWindowDimensions, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { CustomButton } from '../CustomButton';

// Kit del panel web (wireframes 3A–3E): encabezado "Gestión de …", barra de
// herramientas con buscador y filtros, tabla con paginación y modales.

export const useAdminStyles = () => {
  const { theme } = useTheme();
  return useMemo(() => createStyles(theme), [theme]);
};

const sinContorno = Platform.select({ web: { outlineStyle: 'none' }, default: {} });

// ---------- Encabezado de página: "Gestión de Horarios" + subtítulo + botón primario ----------
export const ScreenHeader = ({ title, subtitle, actionLabel, onAction, actionIcon = 'add', children }) => {
  const s = useAdminStyles();
  return (
    <View style={s.screenHeader}>
      <View style={{ flex: 1, minWidth: 220 }}>
        <Text style={s.screenTitle}>{title}</Text>
        {subtitle ? <Text style={s.screenSubtitle}>{subtitle}</Text> : null}
      </View>
      {children}
      {actionLabel ? <PrimaryButton title={actionLabel} icon={actionIcon} onPress={onAction} /> : null}
    </View>
  );
};

export const PrimaryButton = ({ title, icon, onPress, loading, disabled, variant = 'primary', style }) => {
  const s = useAdminStyles();
  const { theme } = useTheme();
  const outline = variant === 'outline';
  const danger = variant === 'danger';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={[s.pbtn, outline ? s.pbtnOutline : { backgroundColor: danger ? theme.colors.danger : theme.colors.primary }, (disabled || loading) && { opacity: 0.5 }, style]}
    >
      {loading ? <ActivityIndicator size="small" color={outline ? theme.colors.primary : '#FFF'} /> : (
        <>
          {icon ? <Ionicons name={icon} size={16} color={outline ? theme.colors.textPrimary : '#FFF'} /> : null}
          <Text style={[s.pbtnText, { color: outline ? theme.colors.textPrimary : '#FFF' }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

// ---------- Barra de herramientas ----------
export const Toolbar = ({ children }) => {
  const s = useAdminStyles();
  return <View style={s.toolbar}>{children}</View>;
};

export const SearchBox = ({ value, onChangeText, placeholder = 'Buscar…', style }) => {
  const s = useAdminStyles();
  const { theme } = useTheme();
  return (
    <View style={[s.search, style]}>
      <Ionicons name="search" size={16} color={theme.colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        style={[s.searchInput, sinContorno]}
        accessibilityLabel={placeholder}
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')} accessibilityLabel="Borrar búsqueda">
          <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

// Desplegable "Día ▼": abre una lista de opciones
export const Select = ({ label, value, options, onChange, placeholder, style, full }) => {
  const s = useAdminStyles();
  const { theme } = useTheme();
  const [abierto, setAbierto] = useState(false);
  const actual = options.find((o) => o.value === value);
  return (
    <>
      <TouchableOpacity onPress={() => setAbierto(true)} style={[s.select, full && { flex: 1 }, style]} accessibilityRole="button"
        accessibilityLabel={`${label || placeholder}: ${actual?.label || 'sin seleccionar'}`}>
        <Text style={[s.selectText, !actual && { color: theme.colors.textMuted }]} numberOfLines={1}>
          {actual ? (label && !full ? `${label}: ${actual.label}` : actual.label) : (placeholder || label)}
        </Text>
        <Ionicons name="caret-down" size={12} color={theme.colors.textSecondary} />
      </TouchableOpacity>
      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable style={s.selectOverlay} onPress={() => setAbierto(false)}>
          <View style={s.selectMenu}>
            <Text style={s.selectTitle}>{label || placeholder}</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {options.map((o) => {
                const sel = o.value === value;
                return (
                  <TouchableOpacity key={String(o.value)} onPress={() => { onChange(o.value); setAbierto(false); }}
                    style={[s.selectOption, sel && s.selectOptionActive]}>
                    <Text style={[s.selectOptionText, sel && { color: theme.colors.primary, fontWeight: '700' }]}>{o.label}</Text>
                    {sel ? <Ionicons name="checkmark" size={16} color={theme.colors.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

// ---------- Tabla con paginación (en pantallas angostas se muestra como tarjetas) ----------
export const DataTable = ({
  columns, rows, keyExtractor = (r) => String(r.id), pageSize = 8, loading, error, onRetry,
  emptyText = 'No hay registros.', emptyIcon = 'file-tray-outline', rowStyle,
}) => {
  const s = useAdminStyles();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const angosta = width < 760;
  const [pagina, setPagina] = useState(1);
  const total = rows?.length || 0;
  const paginas = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => { if (pagina > paginas) setPagina(1); }, [paginas]);
  const visibles = (rows || []).slice((pagina - 1) * pageSize, pagina * pageSize);

  if (loading) return <View style={s.tableBox}><LoadingState /></View>;
  if (error) return <View style={s.tableBox}><ErrorState message={error} onRetry={onRetry} /></View>;

  return (
    <View style={s.tableBox}>
      {total === 0 ? <EmptyState icon={emptyIcon} text={emptyText} /> : angosta ? (
        visibles.map((r) => (
          <View key={keyExtractor(r)} style={[s.mobileRow, rowStyle?.(r)]}>
            {columns.map((c, i) => (
              <View key={c.key} style={i === 0 ? { marginBottom: 6 } : s.mobileField}>
                {i > 0 && c.title ? <Text style={s.mobileLabel}>{c.title}</Text> : null}
                <View style={{ flexShrink: 1 }}>{c.render ? c.render(r) : <Text style={s.cell}>{r[c.key]}</Text>}</View>
              </View>
            ))}
          </View>
        ))
      ) : (
        <>
          <View style={s.thead}>
            {columns.map((c) => (
              <Text key={c.key} style={[s.th, { flex: c.flex || 1 }, c.align === 'right' && { textAlign: 'right' }]}>{c.title}</Text>
            ))}
          </View>
          {visibles.map((r, idx) => (
            <View key={keyExtractor(r)} style={[s.tr, idx % 2 === 1 && s.trAlt, rowStyle?.(r)]}>
              {columns.map((c) => (
                <View key={c.key} style={[s.td, { flex: c.flex || 1 }, c.align === 'right' && { alignItems: 'flex-end' }]}>
                  {c.render ? c.render(r) : <Text style={s.cell} numberOfLines={2}>{r[c.key]}</Text>}
                </View>
              ))}
            </View>
          ))}
        </>
      )}
      {total > 0 && (
        <View style={s.tfoot}>
          <Text style={s.footText}>Mostrando {visibles.length} de {total} registros</Text>
          <View style={s.pager}>
            <TouchableOpacity disabled={pagina === 1} onPress={() => setPagina(pagina - 1)} style={[s.pageBtn, pagina === 1 && { opacity: 0.35 }]} accessibilityLabel="Página anterior">
              <Ionicons name="chevron-back" size={14} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            {Array.from({ length: paginas }, (_, i) => i + 1).slice(Math.max(0, pagina - 3), Math.max(0, pagina - 3) + 5).map((n) => (
              <TouchableOpacity key={n} onPress={() => setPagina(n)} style={[s.pageBtn, n === pagina && s.pageBtnActive]} accessibilityLabel={`Página ${n}`}>
                <Text style={[s.pageText, n === pagina && { color: '#FFF' }]}>{n}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity disabled={pagina === paginas} onPress={() => setPagina(pagina + 1)} style={[s.pageBtn, pagina === paginas && { opacity: 0.35 }]} accessibilityLabel="Página siguiente">
              <Ionicons name="chevron-forward" size={14} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

export const CellText = ({ children, bold, muted, small }) => {
  const s = useAdminStyles();
  return <Text style={[s.cell, bold && { fontWeight: '700' }, muted && s.cellMuted, small && { fontSize: 12 }]} numberOfLines={2}>{children}</Text>;
};

export const Actions = ({ children }) => <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>{children}</View>;

// ---------- Estados ----------
export const LoadingState = ({ text = 'Cargando…' }) => {
  const { theme } = useTheme();
  const s = useAdminStyles();
  return (
    <View style={s.centerBox}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={s.mutedText}>{text}</Text>
    </View>
  );
};

export const ErrorState = ({ message, onRetry }) => {
  const { theme } = useTheme();
  const s = useAdminStyles();
  return (
    <View style={s.centerBox}>
      <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.danger} />
      <Text style={[s.bodyText, { textAlign: 'center' }]}>{message}</Text>
      {onRetry ? <CustomButton title="Reintentar" variant="outline" size="sm" onPress={onRetry} style={{ width: 160 }} /> : null}
    </View>
  );
};

export const EmptyState = ({ icon = 'file-tray-outline', text }) => {
  const { theme } = useTheme();
  const s = useAdminStyles();
  return (
    <View style={s.centerBox}>
      <Ionicons name={icon} size={40} color={theme.colors.textMuted} />
      <Text style={s.mutedText}>{text}</Text>
    </View>
  );
};

export const Card = ({ children, style, muted }) => {
  const s = useAdminStyles();
  return <View style={[s.card, muted && s.cardMuted, style]}>{children}</View>;
};

export const Badge = ({ text, tone = 'neutral' }) => {
  const { theme } = useTheme();
  const s = useAdminStyles();
  const colors = {
    neutral: theme.colors.textSecondary, success: theme.colors.success, danger: theme.colors.danger,
    warning: theme.colors.warning, primary: theme.colors.primary,
  };
  const c = colors[tone] || colors.neutral;
  return (
    <View style={[s.badge, { borderColor: c, backgroundColor: `${c}18` }]}>
      <Text style={[s.badgeText, { color: c }]} numberOfLines={1}>{text}</Text>
    </View>
  );
};

export const IconButton = ({ icon, onPress, tone = 'neutral', label, disabled }) => {
  const { theme } = useTheme();
  const s = useAdminStyles();
  const color = tone === 'danger' ? theme.colors.danger : tone === 'primary' ? theme.colors.primary : theme.colors.textSecondary;
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[s.iconButton, disabled && { opacity: 0.35 }]}
      accessibilityLabel={label || icon} accessibilityRole="button">
      <Ionicons name={icon} size={17} color={color} />
      {label ? <Text style={[s.iconButtonText, { color }]}>{label}</Text> : null}
    </TouchableOpacity>
  );
};

export const ChipSelector = ({ options, value, onChange, labels = {} }) => {
  const s = useAdminStyles();
  return (
    <View style={s.chipRow}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <TouchableOpacity key={String(opt)} onPress={() => onChange(opt)} style={[s.chip, active && s.chipActive]}>
            <Text style={[s.chipText, active && s.chipTextActive]}>{labels[opt] || opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Activo / Pausado (modal 3B)
export const SegmentToggle = ({ value, onChange, options }) => {
  const s = useAdminStyles();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
      {options.map(([v, label]) => {
        const sel = v === value;
        return (
          <TouchableOpacity key={String(v)} onPress={() => onChange(v)} style={[s.segment, sel && s.segmentActive]} accessibilityState={{ selected: sel }}>
            <Text style={[s.segmentText, sel && { color: '#FFF' }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export const FieldLabel = ({ children }) => {
  const s = useAdminStyles();
  return <Text style={s.fieldLabel}>{children}</Text>;
};

// Campo compacto del modal (como en 3B)
export const FormField = ({ label, value, onChangeText, placeholder, error, multiline, keyboardType, autoCapitalize = 'sentences', secure, style, editable = true }) => {
  const s = useAdminStyles();
  const { theme } = useTheme();
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      {label ? <Text style={s.fieldLabel}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secure}
        editable={editable}
        style={[s.input, multiline && { minHeight: 76, textAlignVertical: 'top' }, error && { borderColor: theme.colors.danger }, !editable && { opacity: 0.6 }, sinContorno]}
        accessibilityLabel={label || placeholder}
      />
      {error ? <Text style={s.fieldError}>{error}</Text> : null}
    </View>
  );
};

export const FormRow = ({ children }) => <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>{React.Children.map(children, (c) => (c ? <View style={{ flex: 1, minWidth: 170 }}>{c}</View> : null))}</View>;

export const FormModal = ({ visible, title, onClose, onSubmit, submitLabel = 'Guardar', saving, children, wide }) => {
  const s = useAdminStyles();
  const { theme } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
        <View style={[s.modalBox, wide && { maxWidth: 760 }]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Cerrar" style={s.modalClose}>
              <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 560 }} contentContainerStyle={{ padding: 18 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          <View style={s.modalActions}>
            <PrimaryButton title={onSubmit ? 'Cancelar' : 'Cerrar'} variant="outline" onPress={onClose} />
            {onSubmit ? <PrimaryButton title={submitLabel} onPress={onSubmit} loading={saving} /> : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (theme) => StyleSheet.create({
  screenHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  screenTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary },
  screenSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  pbtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 16, minHeight: 38, borderRadius: 6 },
  pbtnOutline: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  pbtnText: { fontWeight: '700', fontSize: 13 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: 6, paddingHorizontal: 10, minHeight: 38, flexGrow: 1, flexBasis: 220, maxWidth: 360,
  },
  searchInput: { flex: 1, color: theme.colors.textPrimary, fontSize: 13, paddingVertical: 8 },
  select: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: 6, paddingHorizontal: 12, minHeight: 38, minWidth: 120,
  },
  selectText: { color: theme.colors.textPrimary, fontSize: 13, flexShrink: 1 },
  selectOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  selectMenu: { backgroundColor: theme.colors.surface, borderRadius: 10, padding: 8, width: '100%', maxWidth: 320, borderWidth: 1, borderColor: theme.colors.border },
  selectTitle: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700', padding: 8 },
  selectOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, borderRadius: 6 },
  selectOptionActive: { backgroundColor: `${theme.colors.primary}12` },
  selectOptionText: { color: theme.colors.textPrimary, fontSize: 14 },
  tableBox: { backgroundColor: theme.colors.surface, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden', marginBottom: 16 },
  thead: { flexDirection: 'row', backgroundColor: theme.colors.inputBackground, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingHorizontal: 14 },
  th: { paddingVertical: 10, paddingRight: 8, fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  tr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border, minHeight: 52 },
  trAlt: { backgroundColor: `${theme.colors.inputBackground}88` },
  td: { paddingVertical: 8, paddingRight: 8, justifyContent: 'center' },
  cell: { color: theme.colors.textPrimary, fontSize: 13 },
  cellMuted: { color: theme.colors.textSecondary },
  tfoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, flexWrap: 'wrap', gap: 8 },
  footText: { color: theme.colors.textSecondary, fontSize: 12 },
  pager: { flexDirection: 'row', gap: 6 },
  pageBtn: { minWidth: 28, height: 28, borderRadius: 4, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  pageBtnActive: { backgroundColor: theme.colors.textPrimary, borderColor: theme.colors.textPrimary },
  pageText: { color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' },
  mobileRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 4 },
  mobileField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 26 },
  mobileLabel: { color: theme.colors.textSecondary, fontSize: 12 },
  centerBox: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  mutedText: { color: theme.colors.textMuted, fontSize: 13, textAlign: 'center' },
  bodyText: { color: theme.colors.textPrimary, fontSize: 14 },
  card: {
    backgroundColor: theme.colors.surface, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, padding: 16, marginBottom: 12,
  },
  cardMuted: { opacity: 0.55 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  iconButton: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6, borderRadius: 4 },
  iconButtonText: { fontSize: 12, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },
  segment: { minWidth: 110, alignItems: 'center', paddingVertical: 9, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  segmentActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  segmentText: { color: theme.colors.textSecondary, fontWeight: '700', fontSize: 13 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9,
    color: theme.colors.textPrimary, fontSize: 14, backgroundColor: theme.colors.surface,
  },
  fieldError: { color: theme.colors.danger, fontSize: 12, marginTop: 4, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(30,30,30,0.55)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalBox: { width: '100%', maxWidth: 560, backgroundColor: theme.colors.surface, borderRadius: 8, overflow: 'hidden' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  modalTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary },
  modalClose: { width: 26, height: 26, borderRadius: 13, backgroundColor: theme.colors.inputBackground, alignItems: 'center', justifyContent: 'center' },
  modalActions: {
    flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingHorizontal: 18, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
});
