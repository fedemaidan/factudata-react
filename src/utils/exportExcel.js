import * as XLSX from 'xlsx';

export const exportPlanObraExcel = (etapas) => {
  const rowsM = [];
  const rowsC = [];
  etapas.forEach(e => {
    (e.materiales || []).forEach(m => rowsM.push({
      etapa: e.nombre,
      nombre: m.nombre,
      unidad: m.unidad,
      cantidad_plan: m.cantidad_plan,
      cantidad_usada: m.cantidad_usada,
      precio_unit_plan: m.precio_unit_plan,
      sku: m.sku,
      aliases: (m.aliases || []).join('|'),
    }));
    (e.certificados || []).forEach(c => rowsC.push({
      etapa: e.nombre,
      descripcion: c.descripcion,
      contratista: c.contratista,
      fecha_inicio: c.fecha_inicio,
      fecha_fin: c.fecha_fin,
      monto: c.monto,
      porcentaje_certificado: c.porcentaje_certificado,
    }));
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsM), 'Materiales');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsC), 'Certificados');
  XLSX.writeFile(wb, `plan_obra_${new Date().toISOString().slice(0,10)}.xlsx`);
};
