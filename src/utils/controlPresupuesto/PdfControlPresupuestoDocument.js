import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

/**
 * Plantilla POR DEFECTO de Control de Presupuesto (RECIBO DE PAGOS).
 * Documento sobrio y claro, fiel al recibo de referencia. Se usa como preview
 * base cuando el usuario todavía no generó una plantilla custom con IA.
 *
 * Props: { data, logoDataUrl, empresaNombre }
 */
const styles = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 32, paddingHorizontal: 32, fontFamily: 'Helvetica', fontSize: 10, color: '#1f2733', backgroundColor: '#ffffff' },
  headerBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#1f2733', paddingVertical: 14, paddingHorizontal: 16 },
  headerTitle: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#1f2733', letterSpacing: 1 },
  logoImg: { maxWidth: 150, maxHeight: 48, objectFit: 'contain' },
  metaBox: { borderWidth: 1, borderTopWidth: 0, borderColor: '#1f2733', paddingVertical: 8, paddingHorizontal: 16 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  metaLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1f2733' },
  metaValue: { fontSize: 9, color: '#1f2733' },
  presupBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderTopWidth: 0, borderColor: '#1f2733', backgroundColor: '#f2f4f7', paddingVertical: 7, paddingHorizontal: 16 },
  presupLabel: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#1f2733' },
  presupValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1f2733' },
  tableHead: { flexDirection: 'row', borderWidth: 1, borderTopWidth: 0, borderColor: '#1f2733', backgroundColor: '#e7ebf0' },
  th: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1f2733', paddingVertical: 5, paddingHorizontal: 6 },
  tr: { flexDirection: 'row', borderWidth: 1, borderTopWidth: 0, borderColor: '#cfd6df' },
  td: { fontSize: 8.5, color: '#1f2733', paddingVertical: 4, paddingHorizontal: 6 },
  cNum: { width: 28, textAlign: 'center' },
  cFecha: { width: 64 },
  cDetalle: { flex: 1 },
  cMonto: { width: 86, textAlign: 'right' },
  cAcum: { width: 90, textAlign: 'right' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#1f2733', backgroundColor: '#f2f4f7', paddingVertical: 7, paddingHorizontal: 16, marginTop: 10 },
  saldoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderTopWidth: 0, borderColor: '#1f2733', paddingVertical: 7, paddingHorizontal: 16 },
  totalsLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1f2733' },
  totalsValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1f2733' },
  footer: { position: 'absolute', bottom: 18, left: 32, right: 32, textAlign: 'center', fontSize: 7.5, color: '#9aa3af' },
});

function fmtMoney(n, moneda) {
  let v = Number(n);
  if (!Number.isFinite(v)) v = 0;
  const sign = moneda === 'USD' ? 'USD ' : '$ ';
  return sign + v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PdfControlPresupuestoDocument({ data, logoDataUrl, empresaNombre = '' }) {
  const d = data || {};
  const movs = Array.isArray(d.movimientos) ? d.movimientos : [];
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBox}>
          <Text style={styles.headerTitle}>{d.titulo || 'RECIBO DE PAGOS'}</Text>
          {logoDataUrl ? (
            <Image src={logoDataUrl} style={styles.logoImg} />
          ) : (
            <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1f2733' }}>{empresaNombre || ''}</Text>
          )}
        </View>

        <View style={styles.metaBox}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>FECHA DE EMISIÓN:</Text>
            <Text style={styles.metaValue}>{d.fecha_emision || ''}</Text>
          </View>
          {d.domicilio ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>DOMICILIO:</Text>
              <Text style={styles.metaValue}>{d.domicilio}</Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>CONTRATISTA / PROVEEDOR:</Text>
            <Text style={styles.metaValue}>{d.contratista || '-'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>OBRA:</Text>
            <Text style={styles.metaValue}>{d.obra || '-'}</Text>
          </View>
        </View>

        <View style={styles.presupBar}>
          <Text style={styles.presupLabel}>{(d.presupuesto_label || 'PRESUPUESTO').toUpperCase()}</Text>
          <Text style={styles.presupValue}>{fmtMoney(d.presupuestado, d.moneda)}</Text>
        </View>

        <View style={styles.tableHead}>
          <Text style={[styles.th, styles.cNum]}>N°</Text>
          <Text style={[styles.th, styles.cFecha]}>FECHA</Text>
          <Text style={[styles.th, styles.cDetalle]}>DETALLE</Text>
          <Text style={[styles.th, styles.cMonto]}>MONTO</Text>
          <Text style={[styles.th, styles.cAcum]}>ACUMULADO</Text>
        </View>
        {movs.map((m, i) => (
          <View style={styles.tr} key={i} wrap={false}>
            <Text style={[styles.td, styles.cNum]}>{String(m.numero != null ? m.numero : i + 1)}</Text>
            <Text style={[styles.td, styles.cFecha]}>{m.fecha || ''}</Text>
            <Text style={[styles.td, styles.cDetalle]}>{m.detalle || m.proveedor || '-'}</Text>
            <Text style={[styles.td, styles.cMonto]}>{fmtMoney(m.monto, d.moneda)}</Text>
            <Text style={[styles.td, styles.cAcum]}>{fmtMoney(m.acumulado, d.moneda)}</Text>
          </View>
        ))}

        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>TOTAL ENTREGADO</Text>
          <Text style={styles.totalsValue}>{fmtMoney(d.ejecutado, d.moneda)}</Text>
        </View>
        <View style={styles.saldoRow}>
          <Text style={styles.totalsLabel}>SALDO</Text>
          <Text style={styles.totalsValue}>{fmtMoney(d.saldo, d.moneda)}</Text>
        </View>

        <Text style={styles.footer}>
          {(empresaNombre ? empresaNombre + ' — ' : '') + 'Documento no válido como factura'}
        </Text>
      </Page>
    </Document>
  );
}

export default PdfControlPresupuestoDocument;
