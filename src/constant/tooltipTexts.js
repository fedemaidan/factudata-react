// src/constant/tooltipTexts.js
// Textos de ayuda para tooltips - UX a prueba de boludos

export const TOOLTIP_ACOPIOS = {
  exportarExcel: {
    title: '📥 Exportar a Excel',
    steps: [
      'Descarga un archivo .xlsx',
      'Incluye: Fecha, Código, Proveedor, Proyecto, Total',
      'Abrilo con Excel o Google Sheets'
    ]
  },
  crearAcopio: {
    title: '➕ Crear Acopio',
    steps: [
      'Elegí tipo: materiales o lista de precios',
      'Seleccioná proveedor y proyecto',
      'Cargá desde factura, Excel o manualmente'
    ]
  },
  actualizar: {
    title: '🔄 Actualizar',
    description: 'Recarga el listado desde el servidor para ver los últimos cambios.'
  },
  buscar: {
    title: '🔍 Buscar',
    description: 'Filtrá por código, proveedor, proyecto o descripción.'
  }
};

export const TOOLTIP_MOVIMIENTOS = {
  exportarInforme: {
    title: '📊 Exportar Informe',
    steps: [
      'Genera un Excel detallado',
      'Incluye todos los remitos y materiales',
      'Muestra saldo parcial acumulado por fecha'
    ]
  },
  subirHojas: {
    title: '📎 Subir Hojas',
    steps: [
      'Agregá imágenes o PDFs de respaldo',
      'Pueden ser facturas, remitos o comprobantes',
      'Se guardan asociados al acopio'
    ]
  },
  editar: {
    title: '✏️ Editar Acopio',
    description: 'Modificá código, proveedor, proyecto, precios y productos del acopio.'
  },
  recalibrar: {
    title: '🔧 Recalibrar Imágenes',
    description: 'Reprocesa las imágenes para mejorar la extracción de datos (solo admin).'
  }
};

export const TOOLTIP_CREAR_ACOPIO = {
  importarExcel: {
    title: '📄 Importar desde Excel/CSV',
    steps: [
      'Subí un archivo .xlsx o .csv',
      'Mapeá las columnas: código, descripción, cantidad, precio',
      'Revisá los datos y guardá'
    ]
  },
  importarFactura: {
    title: '🧾 Importar desde Factura',
    steps: [
      'Subí imagen o PDF de la factura',
      'El sistema extrae automáticamente los materiales',
      'Revisá y corregí si es necesario'
    ]
  },
  cargaManual: {
    title: '✍️ Carga Manual',
    description: 'Ingresá los productos uno por uno manualmente.'
  },
  copiarAcopio: {
    title: '📋 Copiar de otro Acopio',
    steps: [
      'Seleccioná un acopio existente',
      'Se copian todos los productos',
      'Podés modificar cantidades y precios'
    ]
  }
};

export const TOOLTIP_EDITAR_ACOPIO = {
  guardar: {
    title: '💾 Guardar Cambios',
    description: 'Guardá todos los cambios realizados. Atajo: Ctrl+S'
  },
  aplicarFormula: {
    title: '🔢 Aplicar Fórmula',
    steps: [
      'Modificá precios con operaciones matemáticas',
      'Ej: *1.21 (agregar IVA), /1.21 (quitar IVA)',
      'Ej: +100 (sumar $100), *1.15 (aumentar 15%)'
    ]
  },
  generarCodigos: {
    title: '🏷️ Generar Códigos',
    description: 'Genera códigos automáticos para productos que no tengan.'
  },
  agregarProducto: {
    title: '➕ Agregar Producto',
    description: 'Añade una nueva fila vacía al final de la lista.'
  },
  eliminarSeleccionados: {
    title: '🗑️ Eliminar Seleccionados',
    description: 'Elimina los productos que hayas seleccionado con los checkboxes.'
  },
  exportarExcel: {
    title: '📥 Exportar a Excel',
    steps: [
      'Descarga los productos en formato .xlsx',
      'Útil para editar en Excel y volver a importar',
      'Incluye código, descripción, cantidad y precio'
    ]
  }
};

export const TOOLTIP_REVISION_FINAL = {
  agregar: {
    title: '➕ Agregar Producto',
    description: 'Añade una fila vacía al final para agregar un nuevo material manualmente.'
  },
  eliminar: {
    title: '🗑️ Eliminar Seleccionados',
    steps: [
      'Seleccioná productos con los checkboxes',
      'Clickeá este botón para eliminarlos',
      'Se eliminan solo de esta lista, no afecta al acopio guardado'
    ]
  },
  exportarExcel: {
    title: '📥 Descargar Excel',
    steps: [
      'Descarga la lista actual en formato .xlsx',
      'Podés editarlo en Excel o Google Sheets',
      'Luego importalo de nuevo si hiciste cambios'
    ]
  },
  importarExcel: {
    title: '📤 Importar desde Excel',
    steps: [
      'Subí un archivo .xlsx o .csv',
      'Debe tener columnas: Código, Descripción, Cantidad, Precio',
      'Reemplaza los materiales actuales'
    ]
  },
  accionesRapidas: {
    title: '⚡ Acciones Rápidas',
    steps: [
      'Aplicá IVA 21% o 10.5% a todos o seleccionados',
      'Aumentá o reducí precios por porcentaje',
      'Sumá o restá un monto fijo a cada precio'
    ]
  },
  ivaAgregar: {
    title: '➕ Agregar IVA 21%',
    description: 'Multiplica los precios por 1.21 (agrega IVA). Aplica a seleccionados o a todos.'
  },
  ivaQuitar: {
    title: '➖ Quitar IVA 21%',
    description: 'Divide los precios por 1.21 (quita IVA). Útil si los precios ya incluyen IVA.'
  },
  porcentaje: {
    title: '📊 Ajustar por Porcentaje',
    steps: [
      'Ingresá un porcentaje (ej: 10)',
      'Aumentar: multiplica por 1.10',
      'Reducir: divide por 1.10'
    ]
  },
  montoFijo: {
    title: '💵 Ajustar Monto Fijo',
    steps: [
      'Ingresá un monto en pesos (ej: 100)',
      'Sumar: agrega $100 a cada precio',
      'Restar: quita $100 de cada precio'
    ]
  },
  verDocumento: {
    title: '👁️ Ver Documento Original',
    description: 'Abre el visor para comparar los datos con la factura/remito original.'
  }
};
