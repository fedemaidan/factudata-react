import { useEffect, useMemo, useState } from 'react';
import PresupuestoProfesionalService from 'src/services/presupuestoProfesional/presupuestoProfesionalService';

const mapRubrosImportados = (rubros = []) => {
  return (rubros || []).map((r) => ({
    nombre: r.nombre || '',
    incidencia_pct_sugerida:
      r.incidencia_pct_sugerida != null && !Number.isNaN(Number(r.incidencia_pct_sugerida))
        ? Number(r.incidencia_pct_sugerida)
        : null,
    tareas: (r.tareas || []).map((t) => ({
      descripcion: t.descripcion || '',
      incidencia_pct_sugerida:
        t.incidencia_pct_sugerida != null && !Number.isNaN(Number(t.incidencia_pct_sugerida))
          ? Number(t.incidencia_pct_sugerida)
          : null,
    })),
  }));
};

const isImageFile = (file) =>
  file.type?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name);

const validateImportFiles = (files) => {
  if (!files.length) return null;

  const allImages = files.every(isImageFile);
  const hasNonImages = files.some((file) => !isImageFile(file));
  if (allImages && hasNonImages) return 'Subí solo imágenes o solo un PDF/Excel.';
  if (allImages && files.length > 10) return 'Máximo 10 imágenes por importación.';
  if (!allImages && files.length > 1) return 'Solo se permite un archivo PDF o Excel.';

  if (!allImages) {
    const file = files[0];
    if (!/\.(xls|xlsx|pdf)$/i.test(file.name)) return 'Formato no soportado.';
  }

  return null;
};

const isExcelFile = (file) =>
  /\.(xlsx|xls)$/i.test(file?.name || '') ||
  (file?.type || '').includes('spreadsheet') ||
  (file?.type || '').includes('excel');

const usePlantillaImport = ({ empresaId, showAlert, onImportSuccess }) => {
  const [openImport, setOpenImport] = useState(false);
  const [importFiles, setImportFiles] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importName, setImportName] = useState('');
  const [importTipo, setImportTipo] = useState('');
  const [importPhase, setImportPhase] = useState('idle');
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [inspecting, setInspecting] = useState(false);

  const baseFileError = useMemo(() => validateImportFiles(importFiles), [importFiles]);
  const sheetSelectionPending =
    importFiles.length === 1 && isExcelFile(importFiles[0]) && availableSheets.length > 1 && !selectedSheet;
  const fileGroupError = baseFileError || (sheetSelectionPending ? 'Elegí qué hoja importar.' : null);

  useEffect(() => {
    if (importFiles.length !== 1) {
      setAvailableSheets([]);
      setSelectedSheet('');
      return;
    }
    const file = importFiles[0];
    if (isImageFile(file)) {
      setAvailableSheets([]);
      setSelectedSheet('');
      return;
    }

    let cancelled = false;
    setInspecting(true);
    PresupuestoProfesionalService.inspectPlantilla(file)
      .then((res) => {
        if (cancelled) return;
        const sheets = Array.isArray(res?.sheets) ? res.sheets : [];
        setAvailableSheets(sheets);
        setSelectedSheet(sheets.length === 1 ? sheets[0] : '');
      })
      .catch(() => {
        if (cancelled) return;
        setAvailableSheets([]);
        setSelectedSheet('');
      })
      .finally(() => {
        if (!cancelled) setInspecting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [importFiles]);

  const handleAddImportFiles = (files = []) => {
    if (!files.length) return;
    setImportFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveImportFile = (index) => {
    setImportFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveImportFile = (fromIndex, toIndex) => {
    setImportFiles((prev) => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= prev.length || toIndex >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const resetImportDialog = () => {
    setImportFiles([]);
    setImportName('');
    setImportTipo('');
    setImportPhase('idle');
    setAvailableSheets([]);
    setSelectedSheet('');
    setInspecting(false);
  };

  const handleOpenImportDialog = () => {
    resetImportDialog();
    setOpenImport(true);
  };

  const handleCloseImportDialog = () => {
    setOpenImport(false);
    resetImportDialog();
  };

  const handleImportPlantilla = async () => {
    if (!importFiles.length) {
      showAlert('Seleccioná un archivo', 'warning');
      return;
    }

    if (fileGroupError) {
      showAlert(fileGroupError, 'warning');
      return;
    }

    setImportPhase('uploading');
    setImportLoading(true);
    try {
      setImportPhase('analizando');
      const result = await PresupuestoProfesionalService.uploadPlantilla(
        importFiles,
        empresaId,
        importName,
        importTipo,
        selectedSheet || undefined
      );

      const sourceName = importFiles[0]?.name || '';
      const nombreSug =
        result.nombre_sugerido || importName || sourceName.replace(/\.[^.]+$/, '') || 'Importada';
      const tipoSug = result.tipo_sugerido || importTipo || '';

      onImportSuccess({
        nombre: nombreSug,
        tipo: tipoSug,
        activa: true,
        rubros: mapRubrosImportados(result.rubros),
        notas: result.notas || '',
      });

      setOpenImport(false);
      resetImportDialog();
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err.message ||
        'Error al importar';
      showAlert(msg, 'error');
    } finally {
      setImportLoading(false);
      setImportPhase('idle');
    }
  };

  return {
    openImport,
    importFiles,
    importLoading,
    importName,
    importTipo,
    importPhase,
    fileGroupError,
    availableSheets,
    selectedSheet,
    inspecting,
    setImportName,
    setImportTipo,
    setSelectedSheet,
    handleOpenImportDialog,
    handleCloseImportDialog,
    handleAddImportFiles,
    handleRemoveImportFile,
    handleMoveImportFile,
    handleImportPlantilla,
  };
};

export default usePlantillaImport;
