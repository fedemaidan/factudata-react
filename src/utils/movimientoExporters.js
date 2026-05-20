// Helpers para exportar movimientos a Excel, AFIP, CSV y PDF.
// Extraídos desde pages/todosProyectos.js para que cajas.js los pueda reutilizar.

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatTimestamp } from 'src/utils/formatters';

export const CAMPOS_BASE = {
  codigo_operacion: 'Código',
  proyecto: 'Proyecto',
  nombre_proveedor: 'Proveedor',
  fecha_factura: 'Fecha',
  total: 'Monto',
  moneda: 'Moneda',
  type: 'Tipo',
};

export const CAMPOS_OPCIONALES = {
  categoria: 'Categoría',
  subcategoria: 'Subcategoría',
  nombre_proveedor: 'Proveedor',
  nombre_user: 'Usuario',
  observacion: 'Observación',
  detalle: 'Detalle',
  total_original: 'Monto Original',
  medio_pago: 'Medio de pago',
  tipo_factura: 'Tipo de factura',
  caja_chica: 'Caja chica',
  tags_extra: 'Extras',
  subtotal: 'Subtotal',
  impuestos: 'Impuestos',
  numero_factura: 'Número de factura',
  cuenta_interna: 'Cuenta interna',
};

const obtenerValorExportable = (campo, valor) => {
  if (valor === undefined || valor === null) return '';
  switch (campo) {
    case 'fecha_factura':
      return formatTimestamp(valor);
    case 'total':
    case 'total_original':
    case 'subtotal':
    case 'subtotal_usd_blue':
    case 'total_usd_blue':
    case 'subtotal_usd_oficial':
    case 'total_usd_oficial':
      return typeof valor === 'number' ? valor : Number(String(valor).replace(/[^\d.-]+/g, ''));
    case 'type':
      return valor === 'ingreso' ? 'Ingreso' : 'Egreso';
    case 'caja_chica':
      return valor ? 'Sí' : 'No';
    case 'tags_extra':
      return Array.isArray(valor) ? valor.join(' - ') : valor;
    case 'impuestos':
      return Array.isArray(valor)
        ? valor.map((imp) => `${imp.nombre}: ${imp.monto}`).join('\n')
        : valor;
    default:
      return valor;
  }
};

const formatearCampoPDF = (campo, valor) => {
  if (valor === undefined || valor === null) return '-';
  switch (campo) {
    case 'fecha_factura':
    case 'fecha_creacion':
      return formatTimestamp(valor);
    case 'total':
    case 'total_original':
      return formatCurrency(valor);
    case 'type':
      return valor === 'ingreso' ? 'Ingreso' : 'Egreso';
    case 'caja_chica':
      return valor ? 'Sí' : 'No';
    case 'tags_extra':
      return Array.isArray(valor) ? valor.join(' - ') : valor;
    case 'impuestos':
      return Array.isArray(valor)
        ? valor.map((imp) => `${imp.nombre}: ${formatCurrency(imp.monto)}`).join('\n')
        : valor;
    default:
      return valor;
  }
};

const opcionalesDeEmpresa = (empresa) => Object.fromEntries(
  Object.entries(CAMPOS_OPCIONALES).filter(([key]) => empresa?.comprobante_info?.[key])
);

export const exportMovimientosToExcel = ({ movimientos, empresa, fileName = 'movimientos.xlsx' }) => {
  const opcionales = opcionalesDeEmpresa(empresa);
  const rows = movimientos.map((mov) => {
    const fila = {};
    Object.entries(CAMPOS_BASE).forEach(([k, label]) => {
      fila[label] = obtenerValorExportable(k, mov[k]);
    });
    Object.entries(opcionales).forEach(([k, label]) => {
      fila[label] = obtenerValorExportable(k, mov[k]);
    });
    return fila;
  });
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buffer], { type: 'application/octet-stream' }), fileName);
};

export const exportMovimientosToCSV = ({ movimientos, empresa, fileName = 'movimientos.csv' }) => {
  const camposExportables = {
    id: 'id',
    ...CAMPOS_BASE,
    ...opcionalesDeEmpresa(empresa),
  };
  const headers = Object.values(camposExportables);
  const rows = movimientos.map((mov) =>
    Object.keys(camposExportables).map((campo) => obtenerValorExportable(campo, mov[campo]))
  );
  const csv = Papa.unparse({ fields: headers, data: rows });
  saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), fileName);
};

export const exportMovimientosToPDF = ({ movimientos, empresa, fileName = 'movimientos.pdf' }) => {
  const camposExportables = {
    ...CAMPOS_BASE,
    ...opcionalesDeEmpresa(empresa),
  };
  const headers = [Object.values(camposExportables)];
  const rows = movimientos.map((mov) =>
    Object.keys(camposExportables).map((campo) => formatearCampoPDF(campo, mov[campo]))
  );
  const doc = new jsPDF();
  autoTable(doc, {
    head: headers,
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [25, 118, 210] },
  });
  doc.save(fileName);
};

export const exportMovimientosAfip = ({ movimientos, empresa, proveedoresData = [] }) => {
  const rows = movimientos.map((mov) => {
    const camposAfip = {
      'FACTURA A': '1 - FACTURAS A',
      'FACTURA B': '6 - FACTURAS B',
      'FACTURA C': '11 - FACTURAS C',
    };
    const iva = mov.impuestos?.find((i) => i.nombre.includes('IVA'))?.monto || 0;
    const otrosTributos =
      mov.impuestos?.filter((i) => !i.nombre.includes('IVA')).reduce((a, i) => a + (i.monto || 0), 0) || 0;
    const proveedor = proveedoresData.find((p) => p._id === mov.id_proveedor);
    const punto_venta = mov.numero_factura?.split('-')[0] || '';
    const numero_desde = mov.numero_factura?.split('-')[1] || '';
    const iva0 = mov.impuestos?.find((i) => i.nombre.includes('IVA 0%'))?.monto ?? '';
    const iva25 = mov.impuestos?.find((i) => i.nombre.includes('IVA 2.5%'))?.monto ?? '';
    const iva5 = mov.impuestos?.find((i) => i.nombre.includes('IVA 5%'))?.monto ?? '';
    const iva105 = mov.impuestos?.find((i) => i.nombre.includes('IVA 10.5%'))?.monto ?? '';
    const iva21 = mov.impuestos?.find((i) => i.nombre.includes('IVA 21%'))?.monto ?? '';
    const iva27 = mov.impuestos?.find((i) => i.nombre.includes('IVA 27%'))?.monto ?? '';

    return {
      Fecha: formatTimestamp(mov.fecha_factura, 'DIA/MES/ANO') || '',
      Tipo: camposAfip[mov.tipo_factura] || '',
      'Punto de Venta': parseInt(punto_venta) || '',
      'Número Desde': parseInt(numero_desde) || '',
      'Número Hasta': '',
      'Cód. Autorización': '',
      'Tipo Doc. Emisor': 'CUIT',
      'Nro. Doc. Emisor': proveedor?.cuit || '',
      'Denominación Emisor': proveedor?.razon_social || mov.nombre_proveedor || '',
      'Tipo Doc. Receptor': 'CUIT',
      'Nro. Doc. Receptor': empresa?.cuit || '',
      'Tipo Cambio': 1,
      Moneda: mov.moneda === 'USD' ? 'U$S' : '$',
      'Neto Gravado IVA 0%': iva0 !== '' ? mov.total - iva0 - otrosTributos : '',
      'IVA 2,5%': iva25,
      'Neto Gravado IVA 2,5%': iva25 !== '' ? mov.total - iva25 - otrosTributos : '',
      'IVA 5%': iva5,
      'Neto Gravado IVA 5%': iva5 !== '' ? mov.total - iva5 - otrosTributos : '',
      'IVA 10,5%': iva105,
      'Neto Gravado IVA 10,5%': iva105 !== '' ? mov.total - iva105 - otrosTributos : '',
      'IVA 21%': iva21,
      'Neto Gravado IVA 21%': iva21 !== '' ? mov.total - iva21 - otrosTributos : '',
      'IVA 27%': iva27,
      'Neto Gravado IVA 27%': iva27 !== '' ? mov.total - iva27 - otrosTributos : '',
      'Neto Gravado Total': mov.total - iva,
      'Neto No Gravado': '',
      'Op. Exentas': '',
      'Otros Tributos': otrosTributos,
      'Total IVA': iva,
      'Imp. Total': mov.total || 0,
    };
  });

  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const fileTitle = `Mis Comprobantes Recibidos - CUIT ${empresa?.cuit}`;
  const firstRow = new Array(Math.max(headers.length, 9)).fill('');
  firstRow[8] = fileTitle;
  const aoa = [firstRow, headers, ...rows.map((r) => headers.map((h) => r[h] ?? ''))];
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'AFIP Comprobantes');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `${fileTitle}.xlsx`);
};
