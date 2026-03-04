import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    paddingTop: 10,
    paddingBottom: 30,
    paddingHorizontal: 18,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.4,
  },
  header: {
    backgroundColor: '#0a4791',
    borderRadius: 2,
    padding: 10,
    marginBottom: 10,
    color: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerLogo: {
    width: 35,
    height: 28,
    objectFit: 'contain',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  headerMeta: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    fontSize: 9,
  },
  metaRow: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    marginRight: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
    letterSpacing: 1,
  },
  tableHeader: {
    backgroundColor: '#0a4791',
    color: '#fff',
    flexDirection: 'row',
    padding: 4,
    marginBottom: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.4,
    borderColor: '#d1d1d1',
    padding: 4,
  },
  tableCell: {
    flex: 1,
    fontSize: 8,
  },
  tableCellItem: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 36,
    fontWeight: 'bold',
  },
  tableCellDesc: {
    flex: 3.5,
    paddingLeft: 4,
  },
  tableCellRight: {
    flex: 1.4,
    textAlign: 'right',
  },
  rubroRow: {
    backgroundColor: '#f5f5f5',
    fontWeight: 'bold',
  },
  taskRow: {
    paddingLeft: 6,
  },
  notesBox: {
    marginTop: 10,
    borderWidth: 0.4,
    borderColor: '#d1d1d1',
    padding: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 18,
    right: 18,
    fontSize: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

const formatCurrency = (value, currency = 'ARS') => {
  const num = Number(value) || 0;
  return num.toLocaleString('es-AR', { style: 'currency', currency });
};

const formatCostoM2 = (value, currency = 'ARS') => {
  if (value == null || !Number.isFinite(value)) return '—';
  return formatCurrency(value, currency);
};

const formatCostoM2Cac = (value, cacMesReferencia) => {
  if (value == null || !Number.isFinite(value)) return '—';
  const valorStr = `CAC ${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return cacMesReferencia ? `${valorStr} (índice ${cacMesReferencia})` : valorStr;
};

const renderCostoM2Rows = (costoM2Data = {}, inTable = false) => {
  const ars = costoM2Data?.ars;
  const usd = costoM2Data?.usd;
  const cac = costoM2Data?.cac;
  const cacMesReferencia = costoM2Data?.cacMesReferencia;
  const rowStyle = inTable
    ? styles.tableRow
    : [styles.tableRow, { flexDirection: 'row', justifyContent: 'space-between' }];
  const Row = ({ label, value }) =>
    inTable ? (
      <View style={rowStyle}>
        <Text style={styles.tableCellItem} />
        <Text style={[styles.tableCellDesc, { flex: 3.5 }]}>{label}</Text>
        <Text style={styles.tableCellRight}>{value}</Text>
        <Text style={[styles.tableCellRight, { flex: 0.6 }]} />
      </View>
    ) : (
      <View style={rowStyle}>
        <Text style={styles.tableCellDesc}>{label}</Text>
        <Text style={styles.tableCellRight}>{value}</Text>
      </View>
    );
  return (
    <>
      <Row label="Costo por m² (ARS)" value={formatCostoM2(ars, 'ARS')} />
      <Row label="Costo por m² (USD)" value={formatCostoM2(usd, 'USD')} />
      <Row label="Costo por m² (CAC último mes)" value={formatCostoM2Cac(cac, cacMesReferencia)} />
    </>
  );
};

const capitalize = (str) => {
  if (!str || typeof str !== 'string') return str || '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const renderRubros = (rubros = [], currency, totalNeto, costoM2Data, tieneAnexos, presupuesto) => {
  const rows = [];
  rubros.forEach((rubro, idx) => {
    const monto = Number(rubro.monto) || 0;
    const incidencia = Number.isFinite(Number(rubro.incidencia_pct))
      ? Number(rubro.incidencia_pct)
      : totalNeto > 0
      ? (monto / totalNeto) * 100
      : 0;

    rows.push(
      <View style={[styles.tableRow, styles.rubroRow]} key={`rubro-${idx}`}>
        <Text style={styles.tableCellItem}>{rubro.orden || idx + 1}</Text>
        <Text style={styles.tableCellDesc}>{capitalize(rubro.nombre || 'Rubro')}</Text>
        <Text style={styles.tableCellRight}>{formatCurrency(monto, currency)}</Text>
        <Text style={[styles.tableCellRight, { flex: 0.6 }]}>{incidencia.toFixed(1)}%</Text>
      </View>
    );

    const rubroNum = rubro.orden ?? idx + 1;
    (rubro.tareas || []).forEach((tarea, tareaIdx) => {
      const subItemLabel = `${rubroNum}.${tareaIdx + 1}`;
      rows.push(
        <View style={[styles.tableRow, styles.taskRow]} key={`tarea-${idx}-${tareaIdx}`}>
          <View style={styles.tableCellItem}>
            <Text style={{ fontWeight: 'normal', fontSize: 8 }}>{subItemLabel}</Text>
          </View>
          <Text style={styles.tableCellDesc}>{capitalize(tarea.descripcion || 'Tarea')}</Text>
          <Text style={styles.tableCellRight} />
          <Text style={[styles.tableCellRight, { flex: 0.6 }]} />
        </View>
      );
    });
  });
  rows.push(
    <View
      style={[styles.tableRow, { backgroundColor: '#0a4791', color: '#fff' }]}
      key="total-row"
    >
      <Text style={styles.tableCell} />
      <Text style={[styles.tableCellDesc, { color: '#fff' }]}>TOTAL PRESUPUESTO</Text>
      <Text style={[styles.tableCellRight, { color: '#fff' }]}>
        {formatCurrency(totalNeto, currency)}
      </Text>
      <Text style={[styles.tableCellRight, { flex: 0.6, color: '#fff' }]}>100%</Text>
    </View>
  );

  const equivRow = !tieneAnexos && presupuesto ? buildTotalEquivalenteRow(presupuesto, totalNeto) : null;
  if (equivRow) {
    rows.push(
      <View style={[styles.tableRow, { backgroundColor: '#0a4791', color: '#fff' }]} key="equiv-row">
        <Text style={styles.tableCellItem} />
        <Text style={[styles.tableCellDesc, { color: '#fff' }]}>Total en {equivRow.tipo}</Text>
        <Text style={[styles.tableCellRight, { color: '#fff' }]}>{equivRow.value}</Text>
        <Text style={[styles.tableCellRight, { flex: 0.6, color: '#fff' }]} />
      </View>
    );
  }

  if (!tieneAnexos && costoM2Data) {
    rows.push(
      <View key="costo-m2-rows">
        {renderCostoM2Rows(costoM2Data, true)}
      </View>
    );
  }

  return rows;
};

const buildSurfaceLines = (analisis, totalNeto, currency) => {
  if (!analisis) return [];
  const cubierta = Number(analisis.sup_cubierta_m2) || 0;
  const patios = Number(analisis.sup_patios_m2) || 0;
  const coef = Number(analisis.coef_patios) >= 0 ? (Number(analisis.coef_patios) || 0.5) : 0.5;
  const ponderadaOriginal = Number(analisis.sup_ponderada_m2) || 0;
  const ponderada = ponderadaOriginal || cubierta + patios * coef;
  const promedio = ponderada > 0 ? totalNeto / ponderada : null;
  const lines = [
    `Superficie cubierta: ${cubierta ? `${cubierta.toFixed(2)} m²` : '—'}`,
    `Superficie patios: ${patios ? `${patios.toFixed(2)} m²` : '—'}`,
    `Superficie ponderada: ${ponderada ? `${ponderada.toFixed(2)} m²` : '—'}`,
  ];
  if (promedio !== null && Number.isFinite(promedio)) {
    lines.push(`Promedio por m²: ${formatCurrency(promedio, currency)}`);
  }
  return lines;
};

const formatFecha = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatFechaAnexo = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/** Genera fila Total en USD/CAC: { value, label } o null */
const buildTotalEquivalenteRow = (presupuesto, totalActualizado) => {
  const snap = presupuesto?.cotizacion_snapshot || null;
  const moneda = (presupuesto?.moneda || 'ARS').toUpperCase();
  if (!snap || !['CAC', 'USD'].includes(snap.tipo) || !Number.isFinite(Number(snap.valor))) return null;
  const valor = Number(snap.valor);
  let value = null;
  let tipo = '';
  if (snap.tipo === 'USD') {
    tipo = 'USD';
    value = moneda === 'USD' ? totalActualizado : totalActualizado / valor;
  } else {
    tipo = 'CAC';
    value = totalActualizado / valor;
  }
  if (!Number.isFinite(value) || value <= 0) return null;
  const partes = [];
  if (snap.tipo === 'USD') {
    if (snap.fuente) partes.push(snap.fuente === 'blue' ? 'Blue' : 'Oficial');
    if (snap.referencia) partes.push(snap.referencia.charAt(0).toUpperCase() + snap.referencia.slice(1));
  } else {
    const ref = snap.referencia === 'mano_obra' ? 'Mano de Obra' : snap.referencia === 'materiales' ? 'Materiales' : 'Promedio';
    partes.push(ref);
  }
  if (snap.fecha_origen) {
    const f = snap.fecha_origen;
    partes.push(f.length >= 7 ? `${f.slice(5, 7)}/${f.slice(0, 4)}` : f);
  }
  const label = partes.length ? ` (${partes.join(', ')})` : '';
  const formatted = tipo === 'USD'
    ? formatCurrency(value, 'USD')
    : `CAC ${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return { value: `${formatted}${label}`, tipo };
};

const TIPO_ANEXO_LABEL = {
  adicion: 'Adición',
  deduccion: 'Deducción',
  modificacion: 'Modificación',
};

const renderAnexos = (anexos = [], currency) => {
  if (!anexos.length) return null;
  const sorted = [...anexos].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  return (
    <View style={{ marginTop: 10 }} wrap>
      <Text style={styles.sectionTitle}>ANEXOS</Text>
      <View style={[styles.tableHeader, { marginTop: 4 }]}>
        <Text style={[styles.tableCellDesc, { flex: 1.2 }]}>Fecha</Text>
        <Text style={[styles.tableCellDesc, { flex: 1.2 }]}>Tipo</Text>
        <Text style={styles.tableCellDesc}>Motivo</Text>
        <Text style={[styles.tableCellRight, { flex: 1 }]}>Impacto</Text>
      </View>
      {sorted.map((ax, i) => (
        <View style={styles.tableRow} key={i}>
          <Text style={[styles.tableCellDesc, { flex: 1.2 }]}>
            {formatFechaAnexo(ax.fecha)}
          </Text>
          <Text style={[styles.tableCellDesc, { flex: 1.2 }]}>
            {TIPO_ANEXO_LABEL[ax.tipo] || ax.tipo}
          </Text>
          <Text style={[styles.tableCellDesc, { flex: 2 }]}>{ax.motivo || '—'}</Text>
          <Text style={[styles.tableCellRight, { flex: 1 }]}>
            {formatCurrency(ax.monto_diferencia, currency)}
          </Text>
        </View>
      ))}
    </View>
  );
};

const renderResumenContractual = (totalOriginal, impactoAnexos, totalActualizado, currency, costoM2Data, presupuesto) => {
  const equivRow = presupuesto ? buildTotalEquivalenteRow(presupuesto, totalActualizado) : null;
  return (
    <View style={[styles.notesBox, { marginTop: 10 }]} wrap>
      <Text style={styles.sectionTitle}>RESUMEN CONTRACTUAL</Text>
      <View style={[styles.tableRow, { flexDirection: 'row', justifyContent: 'space-between' }]}>
        <Text style={styles.tableCellDesc}>Total original</Text>
        <Text style={styles.tableCellRight}>{formatCurrency(totalOriginal, currency)}</Text>
      </View>
      <View style={[styles.tableRow, { flexDirection: 'row', justifyContent: 'space-between' }]}>
        <Text style={styles.tableCellDesc}>Impacto anexos</Text>
        <Text style={styles.tableCellRight}>{formatCurrency(impactoAnexos, currency)}</Text>
      </View>
      <View style={[styles.tableRow, { backgroundColor: '#0a4791', flexDirection: 'row', justifyContent: 'space-between' }]}>
        <Text style={[styles.tableCellDesc, { color: '#fff', fontWeight: 'bold' }]}>
          Total actualizado (incluye anexos)
        </Text>
        <Text style={[styles.tableCellRight, { color: '#fff', fontWeight: 'bold' }]}>
          {formatCurrency(totalActualizado, currency)}
        </Text>
      </View>
      {equivRow && (
        <View style={[styles.tableRow, { backgroundColor: '#0a4791', flexDirection: 'row', justifyContent: 'space-between' }]}>
          <Text style={[styles.tableCellDesc, { color: '#fff', fontWeight: 'bold' }]}>Total en {equivRow.tipo}</Text>
          <Text style={[styles.tableCellRight, { color: '#fff', fontWeight: 'bold' }]}>{equivRow.value}</Text>
        </View>
      )}
      {costoM2Data && renderCostoM2Rows(costoM2Data)}
    </View>
  );
};

export const PresupuestoPdfDocument = ({ presupuesto, empresa, costoM2Data = {}, logoDataUrl = null }) => {
  const rubros = presupuesto?.rubros || [];
  const totalNeto =
    Number(presupuesto.total_neto) ||
    rubros.reduce((acc, rubro) => acc + (Number(rubro.monto) || 0), 0);
  const currency = presupuesto?.moneda || 'ARS';
  const surfaceLines = buildSurfaceLines(presupuesto?.analisis_superficies, totalNeto, currency);
  const notes = presupuesto?.notas_texto?.trim() || '';
  const anexos = presupuesto?.anexos || [];
  const impactoAnexos = anexos.reduce((s, a) => s + (Number(a.monto_diferencia) || 0), 0);
  const totalActualizado = totalNeto + impactoAnexos;
  const tieneAnexos = anexos.length > 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View fixed style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Presupuesto Profesional</Text>
            <View style={styles.headerMeta}>
              <Text>{empresa?.nombre || presupuesto?.empresa_nombre || 'Empresa'}</Text>
              <Text>{formatFecha(presupuesto?.fecha || presupuesto?.createdAt)}</Text>
            </View>
          </View>
          {logoDataUrl && (
            <Image src={logoDataUrl} style={styles.headerLogo} />
          )}
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Obra</Text>
          <Text>{presupuesto?.obra_direccion || '—'}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Proyecto</Text>
          <Text>{presupuesto?.proyecto_nombre || '—'}</Text>
          <Text style={[styles.metaLabel, { marginLeft: 12 }]}>Moneda</Text>
          <Text>{currency}</Text>
        </View>
        <View style={{ marginTop: 6 }}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCellItem}>Item</Text>
            <Text style={styles.tableCellDesc}>Descripción</Text>
            <Text style={styles.tableCellRight}>Total</Text>
            <Text style={[styles.tableCellRight, { flex: 0.6 }]}>Inc.</Text>
          </View>
          {renderRubros(rubros, currency, totalNeto, costoM2Data, tieneAnexos, presupuesto)}
        </View>
        {tieneAnexos && renderAnexos(anexos, currency)}
        {tieneAnexos && renderResumenContractual(totalNeto, impactoAnexos, totalActualizado, currency, costoM2Data, presupuesto)}
        {(notes || surfaceLines.length > 0) && (
          <View style={styles.notesBox} wrap>
            {notes ? (
              <>
                <Text style={styles.sectionTitle}>Notas / Condiciones</Text>
                <Text>{notes}</Text>
              </>
            ) : null}
            {surfaceLines.length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { marginTop: notes ? 8 : 0 }]}>
                  Análisis de superficies
                </Text>
                {surfaceLines.map((line, index) => (
                  <Text key={`surface-${index}`}>{line}</Text>
                ))}
              </>
            ) : null}
          </View>
        )}
        <View fixed style={styles.footer}>
          <Text>Este documento no es válido como factura.</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};
