// Genera archivos de Excel (.xlsx) sin librerías externas.
// Un .xlsx es un ZIP con archivos XML adentro: acá se arman esos XML y se empaquetan.
//
// hojas: [{ nombre, columnas: [{ titulo, valor: (fila) => any, ancho? }], filas: [...] }]
// Devuelve un Uint8Array con el archivo listo para descargar o compartir.

const utf8 = (texto) => {
  const out = [];
  for (let i = 0; i < texto.length; i++) {
    let c = texto.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < texto.length) {
      c = 0x10000 + ((c - 0xd800) << 10) + (texto.charCodeAt(++i) - 0xdc00);
    }
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return Uint8Array.from(out);
};

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (bytes) => {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABLA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

// ZIP sin compresión (método "store"): suficiente para planillas chicas
const armarZip = (archivos) => {
  const partes = [];
  const central = [];
  let offset = 0;
  const u16 = (v) => [v & 0xff, (v >> 8) & 0xff];
  const u32 = (v) => [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff];
  archivos.forEach(({ nombre, datos }) => {
    const n = utf8(nombre);
    const crc = crc32(datos);
    const comun = [...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(datos.length), ...u32(datos.length), ...u16(n.length), ...u16(0)];
    const local = Uint8Array.from([...u32(0x04034b50), ...comun]);
    partes.push(local, n, datos);
    central.push(Uint8Array.from([...u32(0x02014b50), ...u16(20), ...comun, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), n);
    offset += local.length + n.length + datos.length;
  });
  const tamCentral = central.reduce((s, p) => s + p.length, 0);
  const fin = Uint8Array.from([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(archivos.length), ...u16(archivos.length), ...u32(tamCentral), ...u32(offset), ...u16(0)]);
  const todo = [...partes, ...central, fin];
  const salida = new Uint8Array(todo.reduce((s, p) => s + p.length, 0));
  let pos = 0;
  todo.forEach((p) => { salida.set(p, pos); pos += p.length; });
  return salida;
};

const xml = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // caracteres de control que Excel no acepta
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

const letra = (i) => { let s = ''; i += 1; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

const celda = (ref, valor, estilo = 0) => {
  if (valor === null || valor === undefined || valor === '') return '';
  const s = estilo ? ` s="${estilo}"` : '';
  if (typeof valor === 'number' && Number.isFinite(valor)) return `<c r="${ref}"${s}><v>${valor}</v></c>`;
  return `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${xml(valor)}</t></is></c>`;
};

const hojaXML = ({ columnas, filas }) => {
  const anchos = columnas.map((c, i) => c.ancho || Math.min(45, Math.max(10, c.titulo.length + 2,
    ...filas.slice(0, 200).map((f) => String(c.valor(f) ?? '').length + 2))));
  const cols = anchos.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  const encabezado = `<row r="1">${columnas.map((c, i) => celda(`${letra(i)}1`, c.titulo, 1)).join('')}</row>`;
  const cuerpo = filas.map((f, r) => `<row r="${r + 2}">${columnas.map((c, i) => celda(`${letra(i)}${r + 2}`, c.valor(f))).join('')}</row>`).join('');
  const ultima = `${letra(columnas.length - 1)}${filas.length + 1}`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${cols}</cols><sheetData>${encabezado}${cuerpo}</sheetData>${filas.length ? `<autoFilter ref="A1:${ultima}"/>` : ''}</worksheet>`;
};

export const crearExcel = (hojas) => {
  const nombres = hojas.map((h, i) => xml((h.nombre || `Hoja ${i + 1}`).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31)));
  const archivos = [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
</Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${nombres.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
${hojas.map((h, i) => (h.filas.length ? `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${nombres[i]}'!$A$1:$${letra(h.columnas.length - 1)}$${h.filas.length + 1}</definedName></definedNames>` : '')).find(Boolean) || ''}
</workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}
<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`],
    ['xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2563EB"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`],
    ...hojas.map((h, i) => [`xl/worksheets/sheet${i + 1}.xml`, hojaXML(h)]),
  ];
  return armarZip(archivos.map(([nombre, contenido]) => ({ nombre, datos: utf8(contenido) })));
};
