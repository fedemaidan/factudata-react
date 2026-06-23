import { useState, useEffect, useCallback } from 'react';
import TrabajoRegistradoService from 'src/services/dhn/TrabajoRegistradoService';

const EMPTY_FORM = {
  horasNormales: null,
  horas50: null,
  horas100: null,
  horasAltura: null,
  horasHormigon: null,
  horasZanjeo: null,
  horasNocturnas: null,
  fechaLicencia: false,
  tipoLicencia: null,
};

/**
 * Estado de formulario + guardado para editar un trabajo diario registrado con
 * el modal estilo conciliación (CorreccionConciliacionModal). Recibe el objeto
 * `edit` de useTrabajoDiarioPage (open/entity/onSave/onClose) y devuelve lo que
 * el modal necesita: formHoras, setFormHoras (onFormHorasChange), saving
 * (selectionLoading) y onSave.
 */
export default function useEditarTrabajoDiario(edit) {
  const [formHoras, setFormHoras] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!edit.open || !edit.entity) return;
    const t = edit.entity;
    const he = t.horasExcel || {};
    setFormHoras({
      horasNormales: he.horasNormales ?? t.horasNormales ?? null,
      horas50: he.horas50 ?? t.horas50 ?? null,
      horas100: he.horas100 ?? t.horas100 ?? null,
      horasAltura: t.horasAltura ?? null,
      horasHormigon: t.horasHormigon ?? null,
      horasZanjeo: t.horasZanjeo ?? null,
      horasNocturnas: he.horasNocturnas ?? t.horasNocturnas ?? null,
      fechaLicencia: t.fechaLicencia || false,
      tipoLicencia: t.tipoLicencia ?? null,
    });
  }, [edit.open, edit.entity]);

  const onSave = useCallback(async () => {
    const entity = edit.entity;
    if (!entity?._id) return;
    setSaving(true);
    try {
      const base = entity.horasExcel || {};
      const payload = {
        fechaLicencia: Boolean(formHoras.fechaLicencia),
        tipoLicencia: formHoras.fechaLicencia ? (formHoras.tipoLicencia ?? null) : null,
        horasAltura: formHoras.horasAltura ?? null,
        horasHormigon: formHoras.horasHormigon ?? null,
        horasZanjeo: formHoras.horasZanjeo ?? null,
        horasExcel: {
          ...base,
          horasNormales: formHoras.horasNormales ?? null,
          horas50: formHoras.horas50 ?? null,
          horas100: formHoras.horas100 ?? null,
          horasNocturnas: formHoras.horasNocturnas ?? null,
        },
      };
      await TrabajoRegistradoService.update(entity._id, payload);
      await edit.onSave();
      edit.onClose();
    } catch (e) {
      console.error('Error al actualizar trabajo diario', e);
    } finally {
      setSaving(false);
    }
  }, [edit, formHoras]);

  return { formHoras, setFormHoras, saving, onSave };
}
