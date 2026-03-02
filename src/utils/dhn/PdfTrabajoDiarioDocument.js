import React from 'react';
import { Document, Page, StyleSheet, Text, View, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingBottom: 28,
    paddingHorizontal: 20,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.4,
  },
  headerBox: {
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#0a4791',
    color: '#fff',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  metaRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
  },
  metaLabel: {
    fontWeight: 'bold',
    marginRight: 4,
  },
  section: {
    marginTop: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.4,
    borderColor: '#d1d1d1',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
  },
  chip: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 0.4,
    borderColor: '#d1d1d1',
    fontSize: 8,
    textAlign: 'center',
  },
  entrada: {
    color: '#0f7d38',
    borderColor: '#0f7d38',
  },
  salida: {
    color: '#a30000',
    borderColor: '#a30000',
  },
  comprobantesWrapper: {
    marginTop: 4,
  },
  comprobanteBlock: {
    marginBottom: 10,
    padding: 8,
    borderWidth: 0.4,
    borderColor: '#d1d1d1',
    borderRadius: 4,
    backgroundColor: '#fafafa',
  },
  comprobanteLabel: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  comprobanteImage: {
    marginTop: 6,
    width: '100%',
    height: 170,
    borderRadius: 3,
    objectFit: 'cover',
  },
  footerNote: {
    marginTop: 12,
    fontSize: 8,
    color: '#555',
  },
});

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatFechaLong = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const capitalize = (value) => {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export const PdfTrabajoDiarioDocument = ({ trabajo }) => {
  const trabajador = trabajo?.trabajadorId || trabajo?.trabajador || {};
  const apellido = trabajador?.apellido || '';
  const nombre = trabajador?.nombre || trabajo?.trabajador || '';
  const dni = trabajador?.dni || trabajo?.dni || '-';
  const fechaLabel = trabajo?.fecha ? formatFechaLong(trabajo.fecha) : '-';
  const rawRows = Array.isArray(trabajo?.dataRawExcel) ? trabajo.dataRawExcel : [];
  const hasHoras = (Array.isArray(trabajo?.comprobantes) ? trabajo.comprobantes : []).some(
    (c) => (c?.type || '').toString().toLowerCase() === 'horas'
  );
  const comprobantesConImagen = (Array.isArray(trabajo?.comprobantes) ? trabajo.comprobantes : []).filter(
    (comprobante) => Boolean(comprobante?.imageSrc || comprobante?.url)
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBox}>
          <View style={styles.metaRow}>
            <Text>
              <Text style={styles.metaLabel}>Trabajador:</Text>
              {`${apellido} ${nombre}`.trim() || '-'}
            </Text>
            <Text>
              <Text style={styles.metaLabel}>DNI:</Text>
              {dni}
            </Text>
          </View>
          <View style={[styles.metaRow, { marginTop: 4 }]}>
            <Text>
              <Text style={styles.metaLabel}>Fecha:</Text>
              {fechaLabel}
            </Text>
          </View>
        </View>

        {hasHoras && rawRows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fichadas del Excel</Text>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableHeaderCell}>Fecha</Text>
              <Text style={styles.tableHeaderCell}>Hora</Text>
              <Text style={styles.tableHeaderCell}>E/S</Text>
            </View>
            {rawRows.map((row, index) => {
              const tipo = (row?.entradaSalida || '').toString();
              const isEntrada = tipo === 'E';
              return (
                <View style={styles.tableRow} key={`fichada-${index}`}>
                  <Text style={styles.tableCell}>{formatDate(row?.fecha)}</Text>
                  <Text style={styles.tableCell}>{row?.hora || '-'}</Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.chip,
                      tipo ? (isEntrada ? styles.entrada : styles.salida) : null,
                    ]}
                  >
                    {tipo || '-'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {comprobantesConImagen.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comprobantes</Text>
            <View style={styles.comprobantesWrapper}>
              {comprobantesConImagen.map((comprobante, index) => {
                const typeLabel = capitalize(comprobante?.type || 'comprobante');
                return (
                  <View key={`comprobante-${index}`} style={styles.comprobanteBlock}>
                    <Text style={styles.comprobanteLabel}>{typeLabel}</Text>
                    <Image style={styles.comprobanteImage} src={comprobante.imageSrc || comprobante.url} />
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default PdfTrabajoDiarioDocument;
