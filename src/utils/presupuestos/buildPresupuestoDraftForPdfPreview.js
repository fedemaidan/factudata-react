import { hoyIso } from 'src/components/presupuestosProfesionales/monedaAjusteConfig';

/**
 * Arma un objeto compatible con PresupuestoPdfDocument / exportación a partir del borrador del formulario.
 */
export const buildPresupuestoDraftForPdfPreview = (form, empresaNombre = '') => {
  if (!form || typeof form !== 'object') return null;

  const rubros = (form.rubros || [])
    .filter((r) => r.nombre?.trim())
    .map((r, i) => ({
      nombre: r.nombre.trim(),
      monto: Number(r.monto) || 0,
      orden: i + 1,
      tareas: (r.tareas || [])
        .filter((t) => t.descripcion?.trim())
        .map((t) => {
          const tm = Number(t.monto) || 0;
          const montoRubro = Number(r.monto) || 0;
          const incidencia_pct = montoRubro > 0 ? (tm / montoRubro) * 100 : 0;
          return {
            descripcion: t.descripcion.trim(),
            monto: tm,
            incidencia_pct,
          };
        }),
    }));

  const total_neto = rubros.reduce((s, r) => s + r.monto, 0);

  const escalaRaw = Number(form.logo_pdf_escala);
  const logo_pdf_escala =
    Number.isFinite(escalaRaw) && escalaRaw > 0
      ? Math.min(2, Math.max(0.5, Math.round(escalaRaw * 100) / 100))
      : 1;

  const fecha = (form.fecha && String(form.fecha).trim()) || hoyIso();

  return {
    titulo: form.titulo || '',
    fecha,
    fecha_presupuesto: fecha,
    obra_direccion: form.obra_direccion?.trim() || null,
    proyecto_nombre: form.proyecto_nombre?.trim() || null,
    moneda: form.moneda || 'ARS',
    indexacion: form.indexacion ?? null,
    cac_tipo: form.cac_tipo ?? null,
    base_calculo: form.base_calculo || 'total',
    usd_fuente: form.usd_fuente ?? null,
    usd_valor: form.usd_valor ?? null,
    cotizacion_snapshot: form.cotizacion_snapshot ?? null,
    rubros,
    total_neto,
    notas_texto: form.notas_texto ?? '',
    analisis_superficies: form.analisis_superficies || null,
    empresa_logo_url: form.empresa_logo_url || null,
    logo_pdf_escala,
    header_bg_color: form.header_bg_color || '#0a4791',
    header_text_color: form.header_text_color || '#ffffff',
    empresa_nombre: empresaNombre?.trim() || null,
    anexos: [],
    version_actual: 0,
    versiones: [],
  };
};
