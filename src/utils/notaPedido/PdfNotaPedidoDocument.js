import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

const BORDER = '#D8DDE6';
const TEXT = '#202733';
const MUTED = '#6B7280';
const SOFT = '#F6F7FB';
const ACCENT = '#2D4FE4';

const baseStyles = (layout) => {
  const fs = Number(layout?.fontSize) || 10;
  const compact = layout?.lineSpacing === 'compact';
  const lineHeight = compact ? 1.22 : 1.35;
  const sectionGap = compact ? 8 : 11;

  return StyleSheet.create({
    page: {
      paddingTop: 20,
      paddingBottom: 24,
      paddingHorizontal: 22,
      fontFamily: 'Helvetica',
      color: TEXT,
      fontSize: fs,
      lineHeight,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    topBarLeft: {
      fontSize: fs - 1,
      color: MUTED,
    },
    topBarRight: {
      fontSize: fs - 1,
      color: MUTED,
      fontWeight: 'bold',
    },
    logoWrap: {
      borderWidth: 1,
      borderColor: BORDER,
      borderRadius: 8,
      minHeight: 72,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 10,
      marginBottom: 8,
    },
    logoImg: {
      maxWidth: 210,
      maxHeight: 56,
      objectFit: 'contain',
    },
    logoPlaceholder: {
      fontSize: fs - 0.5,
      color: MUTED,
      textAlign: 'center',
      fontWeight: 'bold',
    },
    title: {
      fontSize: 15,
      fontWeight: 'bold',
      textAlign: 'center',
      letterSpacing: 0.3,
      marginBottom: 8,
    },
    titleCode: {
      color: ACCENT,
    },
    infoGrid: {
      borderWidth: 1,
      borderColor: BORDER,
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: sectionGap,
    },
    infoRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
      minHeight: 28,
    },
    infoCell: {
      width: '50%',
      flexDirection: 'row',
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRightWidth: 1,
      borderRightColor: BORDER,
    },
    infoCellLast: {
      borderRightWidth: 0,
    },
    infoLabel: {
      width: 72,
      color: MUTED,
      fontSize: fs - 1,
      fontWeight: 'bold',
    },
    infoValue: {
      flex: 1,
      fontSize: fs - 0.4,
    },
    sectionCard: {
      borderWidth: 1,
      borderColor: BORDER,
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: sectionGap,
    },
    sectionHead: {
      backgroundColor: SOFT,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    sectionHeadText: {
      fontSize: fs - 0.2,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    sectionBody: {
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    paragraph: {
      fontSize: fs - 0.2,
      marginBottom: 5,
    },
    ruledLine: {
      borderBottomWidth: 0.8,
      borderBottomColor: '#E6EAF2',
      marginBottom: compact ? 8 : 11,
    },
    materialesHeader: {
      flexDirection: 'row',
      backgroundColor: SOFT,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
      paddingVertical: 5,
      paddingHorizontal: 8,
    },
    checkHeader: {
      width: 22,
      textAlign: 'center',
      fontWeight: 'bold',
      color: MUTED,
      fontSize: fs - 1,
    },
    descHeader: {
      flex: 1,
      fontWeight: 'bold',
      fontSize: fs - 0.4,
    },
    materialRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#EDF0F6',
      paddingVertical: 5,
      paddingHorizontal: 8,
      minHeight: 24,
    },
    checkBox: {
      width: 22,
      alignItems: 'center',
      justifyContent: 'center',
      color: '#9CA3AF',
      fontSize: fs - 1,
    },
    materialText: {
      flex: 1,
      fontSize: fs - 0.3,
      paddingLeft: 2,
    },
    muted: {
      color: MUTED,
    },
  });
};

function formatFechaNota(fechaCreacion) {
  if (!fechaCreacion) return '';
  try {
    if (fechaCreacion._seconds != null) {
      return new Date(fechaCreacion._seconds * 1000).toLocaleDateString('es-AR');
    }
    if (fechaCreacion.seconds != null) {
      return new Date(fechaCreacion.seconds * 1000).toLocaleDateString('es-AR');
    }
    return new Date(fechaCreacion).toLocaleDateString('es-AR');
  } catch {
    return '';
  }
}

function splitDescripcionMateriales(descripcion) {
  const t = String(descripcion || '').trim();
  if (!t) return [];
  return t
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function chunkPairs(list) {
  const out = [];
  for (let i = 0; i < list.length; i += 2) {
    out.push([list[i], list[i + 1] || null]);
  }
  return out;
}

export function NotaPedidoPdfDocument({ nota, layout = {}, logoDataUrl, empresaNombre = '' }) {
  const styles = baseStyles(layout);
  const fechaStr = formatFechaNota(nota?.fechaCreacion);
  const observacionLines = Math.min(11, Math.max(4, Number(layout.observacionLines) || 6));
  const lineasCheck = Math.min(7, Math.max(2, Number(layout.lineasCheck) || 4));
  const materiales = splitDescripcionMateriales(nota?.descripcion);
  const comentarios = Array.isArray(nota?.comentarios) ? nota.comentarios.filter((c) => (c.texto || '').trim() || c.url) : [];
  const codigo = String(nota?.codigo ?? '').padStart(5, '0');

  const infoItems = [
    ['Fecha', fechaStr || '—'],
    ['Estado', nota?.estado || '—'],
    ['Proyecto', nota?.proyecto_nombre || '—'],
    ['Responsable', nota?.owner_name || '—'],
    ['Creado por', nota?.creador_name || '—'],
    ['Proveedor', layout.showProveedor === false ? 'Oculto' : nota?.proveedor || '—'],
  ];
  const infoRows = chunkPairs(infoItems);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topBar}>
          <Text style={styles.topBarLeft}>{empresaNombre || 'Nota de pedido'}</Text>
          <Text style={styles.topBarRight}>Emisión: {fechaStr || '—'}</Text>
        </View>

        <View style={styles.logoWrap}>
          {logoDataUrl ? (
            <Image src={logoDataUrl} style={styles.logoImg} />
          ) : (
            <Text style={styles.logoPlaceholder}>Logo no configurado</Text>
          )}
        </View>

        <Text style={styles.title}>
          NOTA DE PEDIDO <Text style={styles.titleCode}>#{codigo}</Text>
        </Text>

        <View style={styles.infoGrid}>
          {infoRows.map((pair, idx) => (
            <View key={`meta-${idx}`} style={{ ...styles.infoRow, borderBottomWidth: idx === infoRows.length - 1 ? 0 : 1 }}>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>{pair[0][0]}</Text>
                <Text style={styles.infoValue}>{pair[0][1]}</Text>
              </View>
              <View style={{ ...styles.infoCell, ...styles.infoCellLast }}>
                {pair[1] ? (
                  <>
                    <Text style={styles.infoLabel}>{pair[1][0]}</Text>
                    <Text style={styles.infoValue}>{pair[1][1]}</Text>
                  </>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionHeadText}>Observación</Text>
          </View>
          <View style={styles.sectionBody}>
            <Text style={styles.paragraph}>{nota?.descripcion || ' '}</Text>
            {Array.from({ length: observacionLines }).map((_, i) => (
              <View key={`obs-line-${i}`} style={styles.ruledLine} />
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionHeadText}>Materiales / items</Text>
          </View>
          <View style={styles.materialesHeader}>
            <Text style={styles.descHeader}>Descripción</Text>
          </View>
          {(materiales.length ? materiales : ['(Sin líneas cargadas)']).map((line, idx) => (
            <View key={`mat-${idx}`} style={styles.materialRow}>
              <Text style={styles.checkBox}>□</Text>
              <Text style={styles.materialText}>{line}</Text>
            </View>
          ))}
          {Array.from({ length: lineasCheck }).map((_, i) => (
            <View key={`mat-extra-${i}`} style={styles.materialRow}>
              <Text style={styles.checkBox}>□</Text>
              <Text style={styles.materialText}> </Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionHeadText}>Observaciones adicionales</Text>
          </View>
          <View style={styles.sectionBody}>
            {comentarios.length === 0 ? (
              <>
                <Text style={{ ...styles.paragraph, ...styles.muted }}>Sin comentarios adicionales.</Text>
                <View style={styles.ruledLine} />
                <View style={styles.ruledLine} />
                <View style={styles.ruledLine} />
              </>
            ) : (
              comentarios.slice(0, 4).map((c, idx) => (
                <View key={`com-${idx}`} style={{ marginBottom: 6 }}>
                  <Text style={styles.paragraph}>
                    {c.texto || '(archivo adjunto)'}
                  </Text>
                  <View style={styles.ruledLine} />
                </View>
              ))
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}
