"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PdfComprobanteMovimientoDocument = PdfComprobanteMovimientoDocument;
exports["default"] = void 0;
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));
var _react = _interopRequireDefault(require("react"));
var _renderer = require("@react-pdf/renderer");
import React from "react";
var __jsx = React.createElement;
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
var COLORS = {
  ink: '#1f2a44',
  body: '#33415c',
  label: '#64748b',
  icon: '#94a3b8',
  accent: '#2563eb',
  tableHead: '#eef2fb',
  border: '#e2e8f0'
};
var styles = _renderer.StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: COLORS.body,
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  logoImg: {
    maxWidth: 170,
    maxHeight: 52,
    objectFit: 'contain'
  },
  empresaText: {
    fontSize: 17,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.ink
  },
  headerRight: {
    alignItems: 'flex-end',
    maxWidth: '55%'
  },
  numero: {
    fontSize: 10.5,
    color: COLORS.accent,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3
  },
  titulo: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.ink,
    textAlign: 'right'
  },
  rule: {
    borderTopWidth: 2,
    borderColor: COLORS.accent,
    marginTop: 14,
    marginBottom: 18
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metaCol: {
    width: '48%'
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  metaIcon: {
    width: 20
  },
  metaLabel: {
    width: 96,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.label,
    letterSpacing: 0.3
  },
  metaValue: {
    flex: 1,
    fontSize: 9.5,
    color: COLORS.ink
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.ink,
    letterSpacing: 0.6,
    marginTop: 12,
    marginBottom: 8
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: COLORS.tableHead,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4
  },
  th: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.label,
    letterSpacing: 0.4
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border
  },
  cConcepto: {
    flex: 1,
    paddingRight: 8
  },
  cImporte: {
    width: 160,
    textAlign: 'right'
  },
  cellText: {
    fontSize: 9.5,
    color: COLORS.ink
  },
  cellImporte: {
    fontSize: 9.5,
    color: COLORS.ink,
    fontFamily: 'Helvetica-Bold'
  },
  obsBox: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    paddingVertical: 9,
    paddingHorizontal: 12
  },
  obsLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.label,
    letterSpacing: 0.4,
    marginBottom: 4
  },
  obsText: {
    fontSize: 9.5,
    color: COLORS.ink
  },
  adjuntoSection: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
    marginTop: 16
  },
  adjuntoFrame: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  adjuntoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain'
  }
});
function fmtMoney(n, moneda) {
  var v = Number(n);
  if (!Number.isFinite(v)) v = 0;
  var sign = moneda === 'USD' ? 'USD ' : '$ ';
  return sign + v.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
var ICON_PROPS = {
  stroke: COLORS.icon,
  strokeWidth: 1.7,
  fill: 'none',
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};
function Icon(_ref) {
  var name = _ref.name;
  var size = 13;
  var body = null;
  switch (name) {
    case 'calendar':
      body = /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, /*#__PURE__*/_react["default"].createElement(_renderer.Rect, (0, _extends2["default"])({
        x: "3",
        y: "4",
        width: "18",
        height: "17",
        rx: "2"
      }, ICON_PROPS)), /*#__PURE__*/_react["default"].createElement(_renderer.Line, (0, _extends2["default"])({
        x1: "16",
        y1: "2",
        x2: "16",
        y2: "6"
      }, ICON_PROPS)), /*#__PURE__*/_react["default"].createElement(_renderer.Line, (0, _extends2["default"])({
        x1: "8",
        y1: "2",
        x2: "8",
        y2: "6"
      }, ICON_PROPS)), /*#__PURE__*/_react["default"].createElement(_renderer.Line, (0, _extends2["default"])({
        x1: "3",
        y1: "10",
        x2: "21",
        y2: "10"
      }, ICON_PROPS)));
      break;
    case 'hash':
      body = /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, /*#__PURE__*/_react["default"].createElement(_renderer.Line, (0, _extends2["default"])({
        x1: "4",
        y1: "9",
        x2: "20",
        y2: "9"
      }, ICON_PROPS)), /*#__PURE__*/_react["default"].createElement(_renderer.Line, (0, _extends2["default"])({
        x1: "4",
        y1: "15",
        x2: "20",
        y2: "15"
      }, ICON_PROPS)), /*#__PURE__*/_react["default"].createElement(_renderer.Line, (0, _extends2["default"])({
        x1: "10",
        y1: "3",
        x2: "8",
        y2: "21"
      }, ICON_PROPS)), /*#__PURE__*/_react["default"].createElement(_renderer.Line, (0, _extends2["default"])({
        x1: "16",
        y1: "3",
        x2: "14",
        y2: "21"
      }, ICON_PROPS)));
      break;
    case 'user':
      body = /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, /*#__PURE__*/_react["default"].createElement(_renderer.Path, (0, _extends2["default"])({
        d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
      }, ICON_PROPS)), /*#__PURE__*/_react["default"].createElement(_renderer.Circle, (0, _extends2["default"])({
        cx: "12",
        cy: "7",
        r: "4"
      }, ICON_PROPS)));
      break;
    case 'folder':
      body = /*#__PURE__*/_react["default"].createElement(_renderer.Path, (0, _extends2["default"])({
        d: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
      }, ICON_PROPS));
      break;
    case 'file':
      body = /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, /*#__PURE__*/_react["default"].createElement(_renderer.Path, (0, _extends2["default"])({
        d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      }, ICON_PROPS)), /*#__PURE__*/_react["default"].createElement(_renderer.Path, (0, _extends2["default"])({
        d: "M14 2v6h6"
      }, ICON_PROPS)), /*#__PURE__*/_react["default"].createElement(_renderer.Line, (0, _extends2["default"])({
        x1: "16",
        y1: "13",
        x2: "8",
        y2: "13"
      }, ICON_PROPS)), /*#__PURE__*/_react["default"].createElement(_renderer.Line, (0, _extends2["default"])({
        x1: "16",
        y1: "17",
        x2: "8",
        y2: "17"
      }, ICON_PROPS)));
      break;
    case 'tag':
      body = /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, /*#__PURE__*/_react["default"].createElement(_renderer.Path, (0, _extends2["default"])({
        d: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
      }, ICON_PROPS)), /*#__PURE__*/_react["default"].createElement(_renderer.Circle, {
        cx: "7",
        cy: "7",
        r: "0.6",
        stroke: COLORS.icon,
        strokeWidth: "1.7",
        fill: COLORS.icon
      }));
      break;
    case 'card':
      body = /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, /*#__PURE__*/_react["default"].createElement(_renderer.Rect, (0, _extends2["default"])({
        x: "1",
        y: "4",
        width: "22",
        height: "16",
        rx: "2"
      }, ICON_PROPS)), /*#__PURE__*/_react["default"].createElement(_renderer.Line, (0, _extends2["default"])({
        x1: "1",
        y1: "10",
        x2: "23",
        y2: "10"
      }, ICON_PROPS)));
      break;
    default:
      body = null;
  }
  return /*#__PURE__*/_react["default"].createElement(_renderer.Svg, {
    width: size,
    height: size,
    viewBox: "0 0 24 24"
  }, body);
}
function MetaCol(_ref2) {
  var items = _ref2.items;
  var visibles = items.filter(function (_ref3) {
    var _ref4 = (0, _slicedToArray2["default"])(_ref3, 3),
      value = _ref4[2];
    return value;
  });
  return /*#__PURE__*/_react["default"].createElement(_renderer.View, {
    style: styles.metaCol
  }, visibles.map(function (_ref5) {
    var _ref6 = (0, _slicedToArray2["default"])(_ref5, 3),
      icon = _ref6[0],
      label = _ref6[1],
      value = _ref6[2];
    return /*#__PURE__*/_react["default"].createElement(_renderer.View, {
      style: styles.metaItem,
      key: label
    }, /*#__PURE__*/_react["default"].createElement(_renderer.View, {
      style: styles.metaIcon
    }, /*#__PURE__*/_react["default"].createElement(Icon, {
      name: icon
    })), /*#__PURE__*/_react["default"].createElement(_renderer.Text, {
      style: styles.metaLabel
    }, label), /*#__PURE__*/_react["default"].createElement(_renderer.Text, {
      style: styles.metaValue
    }, value));
  }));
}
function PdfComprobanteMovimientoDocument(_ref7) {
  var data = _ref7.data,
    logoDataUrl = _ref7.logoDataUrl,
    _ref7$empresaNombre = _ref7.empresaNombre,
    empresaNombre = _ref7$empresaNombre === void 0 ? '' : _ref7$empresaNombre;
  var d = data || {};
  var esIngreso = d.tipo === 'ingreso';
  var contraparteLabel = (d.contraparte_label || (esIngreso ? 'Cliente' : 'Proveedor')).toUpperCase();
  var concepto = d.categoria || d.observacion || (esIngreso ? 'Cobro' : 'Pago');
  var leftItems = [['calendar', 'FECHA DE EMISIÓN', d.fecha_emision], ['hash', 'N° DE OPERACIÓN', d.codigo_operacion], ['user', contraparteLabel, d.contraparte], ['folder', 'OBRA / PROYECTO', d.obra]];
  var rightItems = [['calendar', 'FECHA DEL MOVIMIENTO', d.fecha], ['file', 'COMPROBANTE', d.comprobante], ['tag', 'CATEGORÍA', d.categoria], ['card', 'MEDIO DE PAGO', d.medio_pago]];
  return /*#__PURE__*/_react["default"].createElement(_renderer.Document, null, /*#__PURE__*/_react["default"].createElement(_renderer.Page, {
    size: "A4",
    style: styles.page
  }, /*#__PURE__*/_react["default"].createElement(_renderer.View, {
    style: styles.header
  }, /*#__PURE__*/_react["default"].createElement(_renderer.View, null, logoDataUrl ? /*#__PURE__*/_react["default"].createElement(_renderer.Image, {
    src: logoDataUrl,
    style: styles.logoImg
  }) : /*#__PURE__*/_react["default"].createElement(_renderer.Text, {
    style: styles.empresaText
  }, empresaNombre || '')), /*#__PURE__*/_react["default"].createElement(_renderer.View, {
    style: styles.headerRight
  }, d.codigo_operacion ? /*#__PURE__*/_react["default"].createElement(_renderer.Text, {
    style: styles.numero
  }, "N\xB0 ", d.codigo_operacion) : null, /*#__PURE__*/_react["default"].createElement(_renderer.Text, {
    style: styles.titulo
  }, d.titulo || 'COMPROBANTE'))), /*#__PURE__*/_react["default"].createElement(_renderer.View, {
    style: styles.rule
  }), /*#__PURE__*/_react["default"].createElement(_renderer.View, {
    style: styles.metaGrid
  }, /*#__PURE__*/_react["default"].createElement(MetaCol, {
    items: leftItems
  }), /*#__PURE__*/_react["default"].createElement(MetaCol, {
    items: rightItems
  })), /*#__PURE__*/_react["default"].createElement(_renderer.Text, {
    style: styles.sectionTitle
  }, esIngreso ? 'DETALLE DEL COBRO' : 'DETALLE DEL PAGO'), /*#__PURE__*/_react["default"].createElement(_renderer.View, {
    style: styles.tableHead
  }, /*#__PURE__*/_react["default"].createElement(_renderer.Text, {
    style: [styles.th, styles.cConcepto]
  }, "CONCEPTO"), /*#__PURE__*/_react["default"].createElement(_renderer.Text, {
    style: [styles.th, styles.cImporte]
  }, "IMPORTE")), /*#__PURE__*/_react["default"].createElement(_renderer.View, {
    style: styles.row
  }, /*#__PURE__*/_react["default"].createElement(_renderer.Text, {
    style: [styles.cellText, styles.cConcepto]
  }, concepto), /*#__PURE__*/_react["default"].createElement(_renderer.Text, {
    style: [styles.cellImporte, styles.cImporte]
  }, fmtMoney(d.total, d.moneda))), d.observacion ? /*#__PURE__*/_react["default"].createElement(_renderer.View, {
    style: styles.obsBox
  }, /*#__PURE__*/_react["default"].createElement(_renderer.Text, {
    style: styles.obsLabel
  }, "OBSERVACI\xD3N"), /*#__PURE__*/_react["default"].createElement(_renderer.Text, {
    style: styles.obsText
  }, d.observacion)) : null, d.imagen_url ? /*#__PURE__*/_react["default"].createElement(_renderer.View, {
    style: styles.adjuntoSection
  }, /*#__PURE__*/_react["default"].createElement(_renderer.Text, {
    style: styles.sectionTitle
  }, "COMPROBANTE ADJUNTO"), /*#__PURE__*/_react["default"].createElement(_renderer.View, {
    style: styles.adjuntoFrame
  }, /*#__PURE__*/_react["default"].createElement(_renderer.Image, {
    src: d.imagen_url,
    style: styles.adjuntoImg
  }))) : null));
}
var _default = exports["default"] = PdfComprobanteMovimientoDocument;