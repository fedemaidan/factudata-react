import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

/**
 * Plantilla POR DEFECTO de Control de Presupuesto (RECIBO DE PAGOS).
 * Documento financiero sobrio y editorial, fiel al recibo de referencia. Se usa como
 * preview base cuando el usuario todavía no generó una plantilla custom con IA.
 *
 * Dinámico por moneda/indexación (ver buildControlPresupuestoData):
 *  - `mostrar_equiv` + `equiv_label`: presupuesto indexado → muestra columna de
 *    equivalencia (CAC / USD) al lado de los pesos, y subtexto en el resumen.
 *  - `moneda` 'USD': presupuesto en dólares nativo → solo dólares.
 *  - Bloque resumen Presupuestado / Ejecutado / Saldo + barra de avance.
 *
 * Props: { data, logoDataUrl, empresaNombre }
 */
const INK = '#1f2733';
const HAIRLINE = '#cfd6df';
const ACCENT = '#1f6f5c';      // verde sobrio: avance / saldo a favor
const OVER = '#b3261e';        // rojo: sobre-ejecución / saldo negativo
const SOFT = '#f2f4f7';

const styles = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 36, paddingHorizontal: 32, fontFamily: 'Helvetica', fontSize: 10, color: INK, backgroundColor: '#ffffff' },

  headerBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: INK, paddingVertical: 14, paddingHorizontal: 16 },
  headerTitle: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: INK, letterSpacing: 1.5 },
  logoImg: { maxWidth: 150, maxHeight: 48, objectFit: 'contain' },

  metaBox: { borderWidth: 1, borderTopWidth: 0, borderColor: INK, paddingVertical: 8, paddingHorizontal: 16 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  metaLabel: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: INK, letterSpacing: 0.3 },
  metaValue: { fontSize: 8.5, color: '#41505f' },

  // ── Resumen Presupuestado / Ejecutado / Saldo ──
  resumenWrap: { borderWidth: 1, borderTopWidth: 0, borderColor: INK, backgroundColor: SOFT },
  resumenRow: { flexDirection: 'row' },
  resumenCell: { flex: 1, paddingVertical: 9, paddingHorizontal: 14 },
  resumenCellMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: HAIRLINE },
  resumenLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#6b7785', letterSpacing: 0.6, marginBottom: 3 },
  resumenValue: { fontSize: 12.5, fontFamily: 'Helvetica-Bold', color: INK },
  resumenEquiv: { fontSize: 7.5, color: '#6b7785', marginTop: 1 },

  // ── Barra de avance ──
  barRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderColor: HAIRLINE, paddingVertical: 7, paddingHorizontal: 14 },
  barTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: '#dfe4ea', marginRight: 10 },
  barFill: { height: 7, borderRadius: 4 },
  barPct: { fontSize: 9, fontFamily: 'Helvetica-Bold', width: 78, textAlign: 'right' },

  // ── Tabla de movimientos ──
  tableHead: { flexDirection: 'row', borderWidth: 1, borderTopWidth: 0, borderColor: INK, backgroundColor: '#e7ebf0' },
  th: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: INK, paddingVertical: 5, paddingHorizontal: 6, letterSpacing: 0.3 },
  tr: { flexDirection: 'row', borderWidth: 1, borderTopWidth: 0, borderColor: HAIRLINE },
  trAlt: { backgroundColor: '#fafbfc' },
  td: { fontSize: 8.5, color: INK, paddingVertical: 4, paddingHorizontal: 6 },
  tdMuted: { color: '#6b7785' },
  cNum: { width: 26, textAlign: 'center' },
  cFecha: { width: 60 },
  cDetalle: { flex: 1 },
  cMonto: { width: 84, textAlign: 'right' },
  cEquiv: { width: 78, textAlign: 'right' },
  cAcum: { width: 88, textAlign: 'right' },

  footer: { position: 'absolute', bottom: 18, left: 32, right: 32, textAlign: 'center', fontSize: 7.5, color: '#9aa3af' },
});

function fmtMoney(n, moneda) {
  let v = Number(n);
  if (!Number.isFinite(v)) v = 0;
  const sign = moneda === 'USD' ? 'USD ' : '$ ';
  return sign + v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtEquiv(n, label) {
  let v = Number(n);
  if (!Number.isFinite(v)) v = 0;
  const dec = label === 'USD' ? 2 : 2;
  return `${v.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec })} ${label}`;
}

export function PdfControlPresupuestoDocument({ data, logoDataUrl, empresaNombre = '' }) {
  const d = data || {};
  const movs = Array.isArray(d.movimientos) ? d.movimientos : [];
  const moneda = d.moneda || 'ARS';
  const mostrarEquiv = !!d.mostrar_equiv;
  const equivLabel = d.equiv_label || '';
  const pct = Number(d.avance_pct) || 0;
  const sobre = pct > 100;
  const saldoNeg = Number(d.saldo) < 0;
  const barColor = sobre ? OVER : ACCENT;
  const equivSub = (v) => (mostrarEquiv && v != null ? fmtEquiv(v, equivLabel) : null);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBox}>
          <Text style={styles.headerTitle}>{d.titulo || 'RECIBO DE PAGOS'}</Text>
          {logoDataUrl ? (
            <Image src={logoDataUrl} style={styles.logoImg} />
          ) : (
            <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: INK }}>{empresaNombre || ''}</Text>
          )}
        </View>

        <View style={styles.metaBox}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>FECHA DE EMISIÓN</Text>
            <Text style={styles.metaValue}>{d.fecha_emision || ''}</Text>
          </View>
          {d.presupuesto_label ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>PRESUPUESTO</Text>
              <Text style={styles.metaValue}>{d.presupuesto_label}</Text>
            </View>
          ) : null}
          {d.domicilio ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>DOMICILIO</Text>
              <Text style={styles.metaValue}>{d.domicilio}</Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>CONTRATISTA / PROVEEDOR</Text>
            <Text style={styles.metaValue}>{d.contratista || '-'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>OBRA</Text>
            <Text style={styles.metaValue}>{d.obra || '-'}</Text>
          </View>
        </View>

        {/* ── Resumen: Presupuestado / Ejecutado / Saldo ── */}
        <View style={styles.resumenWrap}>
          <View style={styles.resumenRow}>
            <View style={styles.resumenCell}>
              <Text style={styles.resumenLabel}>PRESUPUESTADO</Text>
              <Text style={styles.resumenValue}>{fmtMoney(d.presupuestado, moneda)}</Text>
              {equivSub(d.presupuestado_equiv) ? <Text style={styles.resumenEquiv}>{equivSub(d.presupuestado_equiv)}</Text> : null}
            </View>
            <View style={[styles.resumenCell, styles.resumenCellMid]}>
              <Text style={styles.resumenLabel}>{d.tipo === 'ingresos' ? 'INGRESADO' : 'EJECUTADO'}</Text>
              <Text style={styles.resumenValue}>{fmtMoney(d.ejecutado, moneda)}</Text>
              {equivSub(d.ejecutado_equiv) ? <Text style={styles.resumenEquiv}>{equivSub(d.ejecutado_equiv)}</Text> : null}
            </View>
            <View style={styles.resumenCell}>
              <Text style={styles.resumenLabel}>SALDO</Text>
              <Text style={[styles.resumenValue, { color: saldoNeg ? OVER : INK }]}>{fmtMoney(d.saldo, moneda)}</Text>
              {equivSub(d.saldo_equiv) ? <Text style={styles.resumenEquiv}>{equivSub(d.saldo_equiv)}</Text> : null}
            </View>
          </View>
          <View style={styles.barRow}>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.min(Math.max(pct, 0), 100)}%`, backgroundColor: barColor }]} />
            </View>
            <Text style={[styles.barPct, { color: barColor }]}>{pct.toLocaleString('es-AR', { maximumFractionDigits: 1 })}% avance</Text>
          </View>
        </View>

        {/* ── Detalle de movimientos ── */}
        <View style={[styles.tableHead, { marginTop: 10 }]}>
          <Text style={[styles.th, styles.cNum]}>N°</Text>
          <Text style={[styles.th, styles.cFecha]}>FECHA</Text>
          <Text style={[styles.th, styles.cDetalle]}>DETALLE</Text>
          <Text style={[styles.th, styles.cMonto]}>{moneda === 'USD' ? 'MONTO USD' : 'MONTO $'}</Text>
          {mostrarEquiv ? <Text style={[styles.th, styles.cEquiv]}>{equivLabel}</Text> : null}
          <Text style={[styles.th, styles.cAcum]}>ACUMULADO</Text>
        </View>
        {movs.map((m, i) => (
          <View style={[styles.tr, i % 2 === 1 ? styles.trAlt : null]} key={i} wrap={false}>
            <Text style={[styles.td, styles.cNum, styles.tdMuted]}>{String(m.numero != null ? m.numero : i + 1)}</Text>
            <Text style={[styles.td, styles.cFecha]}>{m.fecha || ''}</Text>
            <Text style={[styles.td, styles.cDetalle]}>{m.detalle || m.proveedor || '-'}</Text>
            <Text style={[styles.td, styles.cMonto]}>{fmtMoney(m.monto, moneda)}</Text>
            {mostrarEquiv ? <Text style={[styles.td, styles.cEquiv, styles.tdMuted]}>{m.monto_equiv != null ? fmtEquiv(m.monto_equiv, equivLabel) : '—'}</Text> : null}
            <Text style={[styles.td, styles.cAcum]}>{fmtMoney(m.acumulado, moneda)}</Text>
          </View>
        ))}

        <Text style={styles.footer}>{(empresaNombre ? empresaNombre + ' — ' : '')}Documento no válido como factura{mostrarEquiv ? ` · Pesos a la fecha de emisión (equivalencia en ${equivLabel})` : ''}</Text>
      </Page>
    </Document>
  );
}

export default PdfControlPresupuestoDocument;
