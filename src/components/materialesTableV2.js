// src/components/MaterialesTableV2.js
import React, { useMemo, useState, useEffect } from 'react';
import { Box, Stack, TextField, Button, Typography, IconButton, Tooltip, Snackbar } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { DataGrid } from '@mui/x-data-grid';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { formatCurrency } from 'src/utils/formatters';

function fmtCurrency(n) {
  if (n === null || n === undefined) return '$ 0';
  const num = Number(n) || 0;
  return num.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });
}

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

/**
 * Props:
 * - materialesAgrupados: objeto { codigo -> { codigo, descripcion, cantidadAcopiada, cantidadDesacopiada, valorTotalAcopiado, valorTotalDesacopiado, detalles[] } }
 * - loading: bool
 * - tipo: 'materiales' | 'lista_precios'
 *
 * Si tipo === 'lista_precios' se ocultan columnas/totales de Acopiado
 */
export default function MaterialesTableV2({ materialesAgrupados, loading, tipo }) {
  const isLista = (tipo || 'materiales') === 'lista_precios';

  const [qCodigo, setQCodigo] = useState('');
  const [qDesc, setQDesc] = useState('');
  const [selectionModel, setSelectionModel] = useState([]);
  const [copySnackbar, setCopySnackbar] = useState(false);

  // Función para copiar al portapapeles
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopySnackbar(true);
  };

  // visibilidad por defecto (se guarda por modo)
  const defaultVisibility = isLista
    ? { codigo: true, descripcion: true, cantidadDesacopiada: true, valorTotalDesacopiado: true }
    : { codigo: true, descripcion: true, cantidadAcopiada: true, cantidadDesacopiada: true, valorTotalAcopiado: true, valorTotalDesacopiado: true };

  const [columnVisibilityModel, setColumnVisibilityModel] = useLocalStorage(
    `acopio_materiales_columns_v2_${isLista ? 'lista' : 'mat'}`,
    defaultVisibility
  );

  const rows = useMemo(() => {
    const arr = Object.values(materialesAgrupados || {});
    return arr
      .filter(m =>
        (String(m.codigo || '')).toLowerCase().includes(qCodigo.toLowerCase()) &&
        (String(m.descripcion || '')).toLowerCase().includes(qDesc.toLowerCase())
      )
      .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo)))
      .map((m, idx) => ({
        id: m.codigo + '_' + m.descripcion + '_' + idx,
        codigo: m.codigo,
        descripcion: m.descripcion,
        valorUnitario: formatCurrency(m.valorUnitario) || 0,
        cantidadAcopiada: Number(m.cantidadAcopiada) || 0,
        cantidadDesacopiada: Number(m.cantidadDesacopiada) || 0,
        valorTotalAcopiado: Number(m.valorTotalAcopiado) || 0,
        valorTotalDesacopiado: Number(m.valorTotalDesacopiado) || 0
      }));
  }, [materialesAgrupados, qCodigo, qDesc]);

  const totals = useMemo(() => {
    return rows.reduce((acc, r) => {
      if (!isLista) {
        acc.cantA += r.cantidadAcopiada;
        acc.valA += r.valorTotalAcopiado;
      }
      acc.cantD += r.cantidadDesacopiada;
      acc.valD += r.valorTotalDesacopiado;
      return acc;
    }, { cantA: 0, cantD: 0, valA: 0, valD: 0 });
  }, [rows, isLista]);

  const columns = useMemo(() => {
    const base = [
      { field: 'codigo', headerName: 'Código', flex: 0.8, minWidth: 140 },
      { field: 'descripcion', headerName: 'Descripción', flex: 1.6, minWidth: 260 },
      { field: 'valorUnitario', headerName: 'Valor unitario', flex: 0.8, minWidth: 140 },
    ];

    if (!isLista) {
      base.push({ field: 'cantidadAcopiada', headerName: 'Cant. Acopiada', type: 'number', flex: 0.9, minWidth: 150 });
    }

    base.push({ field: 'cantidadDesacopiada', headerName: 'Cant. Desacopiada', type: 'number', flex: 0.9, minWidth: 160 });

    if (!isLista) {
      base.push({
        field: 'valorTotalAcopiado',
        headerName: 'Valor Total Acopiado',
        flex: 1,
        minWidth: 190,
        valueFormatter: (p) => fmtCurrency(p.value)
      });
    }

    base.push({
      field: 'valorTotalDesacopiado',
      headerName: 'Valor Total Desacopiado',
      flex: 1,
      minWidth: 200,
      valueFormatter: (p) => fmtCurrency(p.value)
    });

    // Columna de acciones
    base.push({
      field: 'acciones',
      headerName: '',
      width: 60,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Tooltip title="Copiar código y descripción">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleCopy(`${params.row.codigo} - ${params.row.descripcion}`);
            }}
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )
    });

    return base;
  }, [isLista]);

  function exportExcel() {
    const data = rows.map(r => {
      const out = {
        Codigo: r.codigo,
        Descripcion: r.descripcion,
        CantidadDesacopiada: r.cantidadDesacopiada,
        ValorTotalDesacopiado: r.valorTotalDesacopiado
      };
      if (!isLista) {
        out.CantidadAcopiada = r.cantidadAcopiada;
        out.ValorTotalAcopiado = r.valorTotalAcopiado;
      }
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Materiales');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'materiales.xlsx');
  }

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ my: 2, flexWrap: 'wrap' }}>
        <TextField label="Buscar código" value={qCodigo} onChange={(e) => setQCodigo(e.target.value)} size="small" />
        <TextField label="Buscar descripción" value={qDesc} onChange={(e) => setQDesc(e.target.value)} size="small" />
        <Button variant="outlined" onClick={exportExcel}>Exportar Excel</Button>
      </Stack>

      <div style={{ height: 520, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={Boolean(loading)}
          checkboxSelection
          disableRowSelectionOnClick
          onRowSelectionModelChange={(m) => setSelectionModel(m)}
          rowSelectionModel={selectionModel}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={setColumnVisibilityModel}
          pagination
          pageSizeOptions={[25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25, page: 0 } },
            sorting: { sortModel: [{ field: 'codigo', sort: 'asc' }] }
          }}
        />
      </div>

      {/* Totales: mostrar sólo lo desacopiado en listas de precio */}
      <Stack direction="row" spacing={3} sx={{ mt: 1, color: 'text.secondary', flexWrap: 'wrap' }}>
        {!isLista && (
          <>
            <Typography variant="body2">Total Acopiado: <b>{fmtCurrency(totals.valA)}</b></Typography>
            <Typography variant="body2">Cant. A: <b>{totals.cantA}</b></Typography>
          </>
        )}
        <Typography variant="body2">Total Desacopiado: <b>{fmtCurrency(totals.valD)}</b></Typography>
        <Typography variant="body2">Cant. D: <b>{totals.cantD}</b></Typography>
        {selectionModel?.length > 0 && (
          <Typography variant="body2">Seleccionadas: <b>{selectionModel.length}</b></Typography>
        )}
      </Stack>

      {/* Snackbar de copiado */}
      <Snackbar
        open={copySnackbar}
        autoHideDuration={2000}
        onClose={() => setCopySnackbar(false)}
        message="✓ Copiado al portapapeles"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
