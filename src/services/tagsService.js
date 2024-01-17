const tagsDefault = [
    "Emisor",
    "Número de factura",
    "Condición IVA",
    "Fecha",
    "Neto",
    "IVA 21%",
    "IVA 10.5%",
    "Total",
]

const tagsMapper = {
    "libro_iva": tagsDefault,
    "analisis_gasto": tagsDefault,
    "comprobantes_compatibles_con_Otros": tagsDefault,
    "custom": tagsDefault,
    "comprobantes_compatibles_con_Xubio": [
        "NUMERODECONTROL",
        "PROVEEDOR",
        "TIPO",
        "NUMERO",
        "FECHA",
        "VENCIMIENTODELPAGO",
        "MONEDA",
        "COTIZACION",
        "FECHAFISCAL",
        "OBSERVACIONES",
        "PRODUCTOSERVICIOPERCEPCION",
        "CENTRODECOSTO",
        "CANTIDAD",
        "PRECIO",
        "IMPORTE",
        "IVA",
        "EXENOGRAV"
    ],
    "comprobantes_compatibles_con_Tango": [
        "COD_PROVE",
        "NOM_PROVE",
        "COND_IVA",
        "IDENTIFTRI",
        "N_INTERNO",
        "T_COMP",
        "N_COMP",
        "PORC_IVA",
        "IMP_EXENTO",
        "IMP_NETO",
        "IMP_IVA",
        "IMP_TOTAL",
        "N_ING_BRU",
        "OTROSIMP"
    ],
    "comprobantes_compatibles_con_SOS-Contador": [
        "COD_PROVE",
        "NOM_PROVE",
        "COND_IVA",
        "IDENTIFTRI",
        "N_INTERNO",
        "T_COMP",
        "N_COMP",
        "PORC_IVA",
        "IMP_EXENTO",
        "IMP_NETO",
        "IMP_IVA",
        "IMP_TOTAL",
        "N_ING_BRU",
        "OTROSIMP"
    ],
    "comprobantes_compatibles_con_Colppy": [
        "Comprobante",
        "Letra",
        "Proveedor",
        "CUIT",
        "nroFactura",
        "Fecha Contable",
        "Fecha Factura",
        "Fecha Vencimiento",
        "Descripcion de la Compra",
        "Total Factura $",
        "IVA 10,5% $",
        "IVA 21% $",
        "IVA 27% $",
        "Neto Gravado $",
        "No Gravado $",
        "Percepcion IIBB $",
        "Percepcion IVA $",
        "Cuenta Gasto",
        "Medio de Pago"
    ],
    "comprobantes_compatibles_con_Colppy-Afip": [
        "Fecha",
        "Tipo",
        "Punto de Venta",
        "Número Desde",
        "Número Hasta",
        "Cód. Autorización",
        "Tipo Doc. Emisor",
        "Nro. Doc. Emisor",
        "Denominación Emisor",
        "Tipo Cambio",
        "Moneda",
        "Imp. Neto Gravado",
        "Imp. Neto No Gravado",
        "Imp. Op. Exentas",
        "Otros Tributos",
        "IVA",
        "Imp. Total"
    ]
}

const tagsService = {
  getTags: (workType, compatibleType) => {
    try {
        if (workType != "comprobantes_compatibles_con")
            return tagsMapper[workType];
        else
            return tagsMapper[workType + "_" + compatibleType];
    } catch (err) {
        console.error(err);
      return false;
    }
  }};

export default tagsService;
