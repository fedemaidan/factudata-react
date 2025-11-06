import { useState } from "react";
import { applyMappingToRows } from "src/utils/importar/mapping";


function useColumnMapping() {
  const [rawRows, setRawRows] = useState([]);
  const [previewCols, setPreviewCols] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});

  // Esta función la llamás cuando el backend devuelve la previsualización
  const loadPreview = ({ rawRows, cols, rows, mapping }) => {
    setRawRows(rawRows);
    setPreviewCols(cols);
    setPreviewRows(rows);
    setColumnMapping(mapping);
  };

  // ✅ Esta es la nueva versión que incluye la opción "Incluir primera fila"
  const confirmMapping = (tipoLista, { includeHeaderAsRow = false } = {}) => {
    console.log(rawRows, previewCols, columnMapping, tipoLista, includeHeaderAsRow);
    let rowsToUse = rawRows;
    // Si se pide incluir la primera fila como dato, la agregamos al principio
    if (includeHeaderAsRow && previewRows?.length) {
      const first = previewRows[0];
      if (Array.isArray(first)) {
        rowsToUse = [first, ...rawRows];
      } else if (typeof first === 'object') {
        rowsToUse = [first, ...rawRows];
      }
    }

    return applyMappingToRows(rowsToUse, previewCols, columnMapping, tipoLista);
  };

  return {
    rawRows,
    previewCols,
    previewRows,
    columnMapping,
    setColumnMapping,
    setPreviewCols,
    setPreviewRows,
    loadPreview,
    confirmMapping,
  };
}

export default useColumnMapping;
