import { Platform, Share } from 'react-native';
import { crearExcel } from './excel';

// Exporta reportes a Excel (.xlsx).
// Web: descarga el archivo. Android/iOS: lo guarda y abre el menú "Compartir" (mail, WhatsApp, Drive…).

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// hojas: [{ nombre, columnas: [{ titulo, valor }], filas }]
export const exportarExcel = async (nombreArchivo, hojas) => {
  const bytes = crearExcel(hojas);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([bytes], { type: MIME_XLSX }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const { File, Paths } = require('expo-file-system');
  const Sharing = require('expo-sharing');
  const archivo = new File(Paths.cache, nombreArchivo);
  if (archivo.exists) archivo.delete();
  archivo.create();
  archivo.write(bytes);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(archivo.uri, { mimeType: MIME_XLSX, UTI: 'org.openxmlformats.spreadsheetml.sheet', dialogTitle: nombreArchivo });
  } else {
    await Share.share({ title: nombreArchivo, url: archivo.uri });
  }
};
