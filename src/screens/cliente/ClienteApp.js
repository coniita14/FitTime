import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { TabBar, BellButton } from '../../components/cliente/ui';
import { NotificacionesModal } from '../../components/cliente/NotificacionesModal';
import { clienteService } from '../../api/cliente.service';
import { HorariosScreen } from './HorariosScreen';
import { BloquesScreen } from './BloquesScreen';
import { MisTurnosScreen } from './MisTurnosScreen';
import { TurnoDetalleScreen } from './TurnoDetalleScreen';
import { RutinasScreen } from './RutinasScreen';
import { RutinaDetalleScreen } from './RutinaDetalleScreen';
import { EjercicioDetalleScreen } from './EjercicioDetalleScreen';
import { PerfilScreen } from './PerfilScreen';
import { CambiarClaveScreen } from './CambiarClaveScreen';

const TABS = [
  { key: 'horarios', label: 'Horarios', icon: 'calendar', root: 'Horarios' },
  { key: 'turnos', label: 'Turnos', icon: 'time', root: 'MisTurnos' },
  { key: 'rutinas', label: 'Rutinas', icon: 'barbell', root: 'Rutinas' },
  { key: 'perfil', label: 'Perfil', icon: 'person', root: 'Perfil' },
];

const PANTALLAS = {
  Horarios: HorariosScreen,
  Bloques: BloquesScreen,
  MisTurnos: MisTurnosScreen,
  TurnoDetalle: TurnoDetalleScreen,
  Rutinas: RutinasScreen,
  RutinaDetalle: RutinaDetalleScreen,
  EjercicioDetalle: EjercicioDetalleScreen,
  Perfil: PerfilScreen,
  CambiarClave: CambiarClaveScreen,
};

const pilasIniciales = () => Object.fromEntries(TABS.map((t) => [t.key, [{ name: t.root, params: {}, key: `${t.root}-0` }]]));

// App del cliente (sección 2 y 3 de los wireframes): barra inferior fija y una
// pila de pantallas por pestaña (navigate / goBack).
export const ClienteApp = () => {
  const { theme } = useTheme();
  const [tab, setTab] = useState('horarios');
  const [pilas, setPilas] = useState(pilasIniciales);
  const [noLeidas, setNoLeidas] = useState(0);
  const [verNotif, setVerNotif] = useState(false);
  const [version, setVersion] = useState(0); // fuerza recarga al volver a una pestaña

  const actualizarNoLeidas = useCallback(async () => {
    try { setNoLeidas(await clienteService.contarNoLeidas()); } catch { /* sin conexión: se reintenta luego */ }
  }, []);
  useEffect(() => { actualizarNoLeidas(); }, [actualizarNoLeidas, tab, version]);

  const navigation = {
    navigate: (name, params = {}, enTab) => {
      const destino = enTab || tab;
      if (enTab && enTab !== tab) setTab(enTab);
      setPilas((prev) => ({ ...prev, [destino]: [...prev[destino], { name, params, key: `${name}-${Date.now()}` }] }));
    },
    goBack: () => setPilas((prev) => (prev[tab].length > 1 ? { ...prev, [tab]: prev[tab].slice(0, -1) } : prev)),
    // Cambia de pestaña volviendo a su pantalla principal (por ej. después de reservar → Mis Turnos)
    resetTo: (tabKey) => {
      setPilas((prev) => ({ ...prev, [tabKey]: prev[tabKey].slice(0, 1) }));
      setTab(tabKey);
      setVersion((v) => v + 1);
    },
    refrescar: () => setVersion((v) => v + 1),
  };

  const cambiarTab = (key) => {
    if (key === tab) setPilas((prev) => ({ ...prev, [key]: prev[key].slice(0, 1) })); // tocar la pestaña activa vuelve al inicio
    setTab(key);
    setVersion((v) => v + 1);
  };

  const actual = pilas[tab][pilas[tab].length - 1];
  const Pantalla = PANTALLAS[actual.name];
  const campana = <BellButton count={noLeidas} onPress={() => setVerNotif(true)} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.brand.bg }}>
      <View style={{ flex: 1 }}>
        <Pantalla
          key={`${actual.key}-${version}`}
          navigation={navigation}
          route={{ params: actual.params }}
          campana={campana}
          esRaiz={pilas[tab].length === 1}
        />
      </View>
      <TabBar tabs={TABS} value={tab} onChange={cambiarTab} />
      <NotificacionesModal visible={verNotif} onClose={() => setVerNotif(false)} onLeidas={() => setNoLeidas(0)} />
    </View>
  );
};
