import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, Svg, Path, Rect, Line, Circle } from '@react-pdf/renderer';

/**
 * Plantilla POR DEFECTO del comprobante de un movimiento (ingreso o egreso).
 * Réplica del comprobante profesional de referencia: encabezado con logo + N° +
 * título, grilla de datos en dos columnas con un ícono por campo, una tabla
 * CONCEPTO / IMPORTE (una sola línea: el movimiento), observación, y la imagen
 * del comprobante adjunto (si existe) dentro de la MISMA página A4.
 * Sin fila de TOTAL (un movimiento es una sola línea), sin firma y sin footer.
 *
 * Props: { data, logoDataUrl, empresaNombre }
 */
const COLORS = {
  ink: '#1f2a44',
  body: '#33415c',
  label: '#64748b',
  icon: '#94a3b8',
  accent: '#2563eb',
  tableHead: '#eef2fb',
  border: '#e2e8f0',
};

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 36, paddingHorizontal: 40, fontFamily: 'Helvetica', fontSize: 10, color: COLORS.body, backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logoImg: { maxWidth: 170, maxHeight: 52, objectFit: 'contain' },
  empresaText: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: COLORS.ink },
  headerRight: { alignItems: 'flex-end', maxWidth: '55%' },
  numero: { fontSize: 10.5, color: COLORS.accent, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  titulo: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: COLORS.ink, textAlign: 'right' },
  rule: { borderTopWidth: 2, borderColor: COLORS.accent, marginTop: 14, marginBottom: 18 },

  metaGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  metaCol: { width: '48%' },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  metaIcon: { width: 20 },
  metaLabel: { width: 112, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: COLORS.label, letterSpacing: 0.2 },
  metaValue: { flex: 1, fontSize: 9.5, color: COLORS.ink },

  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORS.ink, letterSpacing: 0.6, marginTop: 12, marginBottom: 8 },

  tableHead: { flexDirection: 'row', backgroundColor: COLORS.tableHead, paddingVertical: 7, paddingHorizontal: 12, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  th: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLORS.label, letterSpacing: 0.4 },
  row: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border },
  cConcepto: { flex: 1, paddingRight: 8 },
  cImporte: { width: 160, textAlign: 'right' },
  cellText: { fontSize: 9.5, color: COLORS.ink },
  cellImporte: { fontSize: 9.5, color: COLORS.ink, fontFamily: 'Helvetica-Bold' },

  obsBox: { marginTop: 16, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, paddingVertical: 9, paddingHorizontal: 12 },
  obsLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: COLORS.label, letterSpacing: 0.4, marginBottom: 4 },
  obsText: { fontSize: 9.5, color: COLORS.ink },

  adjuntoSection: { marginTop: 16 },
  adjuntoFrame: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 8, alignItems: 'center', justifyContent: 'center' },
  adjuntoImg: { maxWidth: '100%', maxHeight: 330, objectFit: 'contain' },
});

function fmtMoney(n, moneda) {
  let v = Number(n);
  if (!Number.isFinite(v)) v = 0;
  const sign = moneda === 'USD' ? 'USD ' : '$ ';
  return sign + v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const ICON_PROPS = { stroke: COLORS.icon, strokeWidth: 1.7, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };

function Icon({ name }) {
  const size = 13;
  let body = null;
  switch (name) {
    case 'calendar':
      body = (
        <>
          <Rect x="3" y="4" width="18" height="17" rx="2" {...ICON_PROPS} />
          <Line x1="16" y1="2" x2="16" y2="6" {...ICON_PROPS} />
          <Line x1="8" y1="2" x2="8" y2="6" {...ICON_PROPS} />
          <Line x1="3" y1="10" x2="21" y2="10" {...ICON_PROPS} />
        </>
      );
      break;
    case 'hash':
      body = (
        <>
          <Line x1="4" y1="9" x2="20" y2="9" {...ICON_PROPS} />
          <Line x1="4" y1="15" x2="20" y2="15" {...ICON_PROPS} />
          <Line x1="10" y1="3" x2="8" y2="21" {...ICON_PROPS} />
          <Line x1="16" y1="3" x2="14" y2="21" {...ICON_PROPS} />
        </>
      );
      break;
    case 'user':
      body = (
        <>
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...ICON_PROPS} />
          <Circle cx="12" cy="7" r="4" {...ICON_PROPS} />
        </>
      );
      break;
    case 'folder':
      body = <Path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" {...ICON_PROPS} />;
      break;
    case 'file':
      body = (
        <>
          <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...ICON_PROPS} />
          <Path d="M14 2v6h6" {...ICON_PROPS} />
          <Line x1="16" y1="13" x2="8" y2="13" {...ICON_PROPS} />
          <Line x1="16" y1="17" x2="8" y2="17" {...ICON_PROPS} />
        </>
      );
      break;
    case 'tag':
      body = (
        <>
          <Path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" {...ICON_PROPS} />
          <Circle cx="7" cy="7" r="0.6" stroke={COLORS.icon} strokeWidth="1.7" fill={COLORS.icon} />
        </>
      );
      break;
    case 'card':
      body = (
        <>
          <Rect x="1" y="4" width="22" height="16" rx="2" {...ICON_PROPS} />
          <Line x1="1" y1="10" x2="23" y2="10" {...ICON_PROPS} />
        </>
      );
      break;
    default:
      body = null;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">{body}</Svg>
  );
}

function MetaCol({ items }) {
  const visibles = items.filter(([, , value]) => value);
  return (
    <View style={styles.metaCol}>
      {visibles.map(([icon, label, value]) => (
        <View style={styles.metaItem} key={label}>
          <View style={styles.metaIcon}><Icon name={icon} /></View>
          <Text style={styles.metaLabel}>{label}</Text>
          <Text style={styles.metaValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

export function PdfComprobanteMovimientoDocument({ data, logoDataUrl, empresaNombre = '' }) {
  const d = data || {};
  const esIngreso = d.tipo === 'ingreso';
  const contraparteLabel = (d.contraparte_label || (esIngreso ? 'Cliente' : 'Proveedor')).toUpperCase();
  const concepto = d.categoria || d.observacion || (esIngreso ? 'Cobro' : 'Pago');

  const leftItems = [
    ['calendar', 'FECHA DE EMISIÓN', d.fecha_emision],
    ['hash', 'N° DE OPERACIÓN', d.codigo_operacion],
    ['user', contraparteLabel, d.contraparte],
    ['folder', 'OBRA / PROYECTO', d.obra],
  ];
  const rightItems = [
    ['calendar', 'FECHA DEL MOVIMIENTO', d.fecha],
    ['file', 'COMPROBANTE', d.comprobante],
    ['tag', 'CATEGORÍA', d.categoria],
    ['card', 'MEDIO DE PAGO', d.medio_pago],
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          <View>
            {logoDataUrl
              ? <Image src={logoDataUrl} style={styles.logoImg} />
              : <Text style={styles.empresaText}>{empresaNombre || ''}</Text>}
          </View>
          <View style={styles.headerRight}>
            {d.codigo_operacion ? <Text style={styles.numero}>N° {d.codigo_operacion}</Text> : null}
            <Text style={styles.titulo}>{d.titulo || 'COMPROBANTE'}</Text>
          </View>
        </View>
        <View style={styles.rule} />

        {/* Datos en dos columnas */}
        <View style={styles.metaGrid}>
          <MetaCol items={leftItems} />
          <MetaCol items={rightItems} />
        </View>

        {/* Detalle (una sola línea: el movimiento) */}
        <Text style={styles.sectionTitle}>{esIngreso ? 'DETALLE DEL COBRO' : 'DETALLE DEL PAGO'}</Text>
        <View style={styles.tableHead}>
          <Text style={[styles.th, styles.cConcepto]}>CONCEPTO</Text>
          <Text style={[styles.th, styles.cImporte]}>IMPORTE</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.cellText, styles.cConcepto]}>{concepto}</Text>
          <Text style={[styles.cellImporte, styles.cImporte]}>{fmtMoney(d.total, d.moneda)}</Text>
        </View>

        {/* Observación */}
        {d.observacion ? (
          <View style={styles.obsBox}>
            <Text style={styles.obsLabel}>OBSERVACIÓN</Text>
            <Text style={styles.obsText}>{d.observacion}</Text>
          </View>
        ) : null}

        {/* Comprobante adjunto (misma página) */}
        {d.imagen_url ? (
          <View style={styles.adjuntoSection} wrap={false}>
            <Text style={styles.sectionTitle}>COMPROBANTE ADJUNTO</Text>
            <View style={styles.adjuntoFrame}>
              <Image src={d.imagen_url} style={styles.adjuntoImg} />
            </View>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

export default PdfComprobanteMovimientoDocument;
