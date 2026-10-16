import { Platform, Share } from 'react-native';

// Exporta filas a CSV (separador ";" para que Excel en español lo abra en columnas).
// Web: descarga el archivo. Android/iOS: abre el menú "Compartir" (mail, WhatsApp, Drive…).

const celda = (v) => {
  const texto = v === null || v === undefined ? '' : String(v);
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

export const aCSV = (columnas, filas) => {
  const encabezado = columnas.map((c) => celda(c.titulo)).join(';');
  const cuerpo = filas.map((f) => columnas.map((c) => celda(c.valor(f))).join(';'));
  return [encabezado, ...cuerpo].join('\r\n');
};

export const exportarCSV = async (nombreArchivo, columnas, filas) => {
  const csv = aCSV(columnas, filas);
  if (Platform.OS === 'web') {
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }); // BOM: Excel respeta acentos
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  await Share.share({ title: nombreArchivo, message: csv });
};
