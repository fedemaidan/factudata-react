import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Stack,
  Paper,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Autocomplete,
  TextField,
  MenuItem,
  Dialog,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useRouter } from 'next/router';

import AcopioService from 'src/services/acopioService';
import { getEmpresaById, updateEmpresaDetails } from 'src/services/empresaService';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { formatCurrency } from 'src/utils/formatters';
import { toNumber } from 'src/utils/importar/numbers';
import { fmtMoney } from 'src/utils/importar/money';
import { applyPriceFormulaToValue } from 'src/utils/importar/priceFormula';
import { codeFromDescription } from 'src/utils/importar/codeFromDescription';

export default function EditarAcopioPage() {
  const router = useRouter();
  const { empresaId, acopioId } = router.query;

  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  const [proveedoresOptions, setProveedoresOptions] = useState([]);
  const [proyectosOptions, setProyectosOptions] = useState([]);

  const [codigo, setCodigo] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [proyecto, setProyecto] = useState('');
  const [tipoLista, setTipoLista] = useState('');
  const [valorTotal, setValorTotal] = useState(0);
  const [productos, setProductos] = useState([]);
  const [urls, setUrls] = useState([]);

  const [selectionModel, setSelectionModel] = useState([]);
  const [formula, setFormula] = useState('');
  const [prefix, setPrefix] = useState('');
  const [maxLen, setMaxLen] = useState(16);

  const [openPreview, setOpenPreview] = useState(false);

const [currentIdx, setCurrentIdx] = useState(0);

const isPdf = (u = '') =>
  typeof u === 'string' &&
  (u.toLowerCase().endsWith('.pdf') || u.toLowerCase().startsWith('data:application/pdf'));

const safeSrc = (u = '') => u; // por si luego querés firmar URLs o pasar por proxy

const openAt = (idx) => {
  setCurrentIdx(idx);
  setOpenPreview(true);
};

const goPrev = () => setCurrentIdx((i) => (i - 1 + (urls?.length || 0)) % (urls?.length || 0));
const goNext = () => setCurrentIdx((i) => (i + 1) % (urls?.length || 0));

  // 📦 Cargar datos
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        if (!empresaId || !acopioId) return;
        const empresa = await getEmpresaById(empresaId);
        setProveedoresOptions(empresa?.proveedores || []);
        const proyectos = await getProyectosByEmpresa(empresa);
        setProyectosOptions(proyectos);

        const acopio = await AcopioService.obtenerAcopio(acopioId);
        setCodigo(acopio.codigo || '');
        setTipoLista(acopio.tipo || '');
        setProveedor(acopio.proveedor || '');
        setProyecto(acopio.proyecto_id || '');
        setValorTotal(acopio.valorTotal || 0);
        setUrls(acopio.url_imagen_compra || acopio.url_image || []);
        setCurrentIdx(0);

        const movimientos = await AcopioService.obtenerCompras(acopioId);
        
        setProductos(
          (movimientos || []).map((m, i) => ({
            id: `${acopioId}-${i}-${m.codigo || Math.random()}`,
            codigo: m.codigo || '',
            descripcion: m.descripcion || '',
            cantidad: m.cantidad || 0,
            valorUnitario: m.valorUnitario || 0,
            valorTotal: m.valorTotal || 0,
          }))
        );
      } catch (err) {
        console.error(err);
        setAlert({ open: true, message: 'Error al cargar datos', severity: 'error' });
      } finally {
        setCargando(false);
      }
    };
    cargarDatos();
  }, [empresaId, acopioId]);

  // 💾 Guardar cambios
  const guardarCambios = async () => {
    try {
      setGuardando(true);

      const proyecto_nombre = proyectosOptions.find((p) => p.id === proyecto)?.nombre;
      const acopio = {
        codigo,
        tipo: tipoLista,
        proveedor,
        proyecto_id: proyecto,
        proyecto_nombre,
        valorTotal: Number(valorTotal) || 0,
        url_imagen_compra: urls,
        productos: productos.map((p) => ({
          codigo: p.codigo,
          descripcion: p.descripcion,
          cantidad: Number(p.cantidad) || 0,
          valorUnitario: Number(p.valorUnitario) || 0,
          valorTotal: Number(p.valorTotal) || 0,
        })),
        empresaId,
      };

      if (proveedor && !proveedoresOptions.includes(proveedor)) {
        const nuevos = [...proveedoresOptions, proveedor];
        await updateEmpresaDetails(empresaId, { proveedores: nuevos });
      }

      await AcopioService.editarAcopio(acopioId, acopio);
      setAlert({ open: true, message: '✅ Acopio actualizado con éxito.', severity: 'success' });
      setTimeout(() => router.push(`/acopios?empresaId=${empresaId}`), 1500);
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: '❌ Error al guardar cambios', severity: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  // ✏️ Edición de filas
  const processRowUpdate = (newRow, oldRow) => {
    const updated = { ...newRow };
    const cantidad = toNumber(updated.cantidad);
    const valorUnitario = toNumber(updated.valorUnitario);
    if (tipoLista === 'materiales') {
      updated.valorTotal = cantidad * valorUnitario;
    }
    setProductos((rows) =>
      rows.map((r) => (String(r.id) === String(updated.id) ? updated : r))
    );
    return updated;
  };

  // ⚙️ Ediciones masivas
  const onApplyPriceFormula = (formula, scope = 'all') => {
    if (!formula?.trim()) return;
    setProductos((rows) => {
      const setSelected = new Set(selectionModel.map(String));
      return rows.map((r, i) => {
        const id = String(r.id ?? `${i}`);
        if (scope === 'selected' && !setSelected.has(id)) return r;
        const nuevoVU = applyPriceFormulaToValue(r.valorUnitario, formula);
        const actualizado = { ...r, valorUnitario: nuevoVU };
        if (tipoLista === 'materiales') {
          const cant = toNumber(actualizado.cantidad);
          actualizado.valorTotal = cant * toNumber(nuevoVU);
        }
        return actualizado;
      });
    });
  };

  const onGenerateMissingCodes = () => {
    setProductos((rows) => {
      const used = new Set(rows.map((r) => String(r.codigo || '').trim()).filter(Boolean));
      return rows.map((r) => {
        const codigo = String(r.codigo || '').trim();
        if (codigo) return r;
        const nuevo = codeFromDescription(r.descripcion, { prefix, maxLen }, used);
        return { ...r, codigo: nuevo };
      });
    });
  };

  const handleBulkDelete = () => {
    if (!selectionModel.length) return;
    setProductos((rows) => rows.filter((r) => !selectionModel.includes(String(r.id))));
    setSelectionModel([]);
  };

  const handleBulkPriceUpdate = () => {
    const mode = window.prompt('Escribí "%10" para aumentar 10%, o "=1500" para fijar a 1500.');
    if (!mode) return;
    setProductos((rows) =>
      rows.map((r) => {
        const id = String(r.id);
        if (!selectionModel.includes(id)) return r;
        let nuevoVU = toNumber(r.valorUnitario);
        if (mode.startsWith('%')) {
          const pct = toNumber(mode.slice(1)) / 100;
          nuevoVU = nuevoVU * (1 + pct);
        } else if (mode.startsWith('=')) {
          nuevoVU = toNumber(mode.slice(1));
        }
        const actualizado = { ...r, valorUnitario: nuevoVU };
        if (tipoLista === 'materiales')
          actualizado.valorTotal = toNumber(actualizado.cantidad) * nuevoVU;
        return actualizado;
      })
    );
  };

  const handleAddItem = (position = 'end') => {
    setProductos((rows) => {
      const nuevo = {
        id: `nuevo-${Date.now()}`,
        codigo: '',
        descripcion: '',
        cantidad: tipoLista === 'materiales' ? 1 : undefined,
        valorUnitario: 0,
        valorTotal: tipoLista === 'materiales' ? 0 : undefined,
      };

      if (position === 'start') {
        return [nuevo, ...rows];
      }

      if (typeof position === 'number' && position >= 0 && position < rows.length) {
        const copia = [...rows];
        copia.splice(position + 1, 0, nuevo);
        return copia;
      }

      return [...rows, nuevo];
    });
  };

  const moveColumnValues = (field, fromIndex, direction = 'up') => {
    setProductos((rows) => {
      if (!rows.length) return rows;
      if (fromIndex == null || fromIndex < 0 || fromIndex >= rows.length) {
        return rows;
      }
      const safeIndex = fromIndex;

      const updated = rows.map((row) => ({ ...row }));
      const lastIndex = updated.length - 1;

      if (direction === 'up') {
        for (let i = safeIndex; i < lastIndex; i += 1) {
          updated[i][field] = rows[i + 1]?.[field] ?? '';
        }
        updated[lastIndex][field] = '';
      } else {
        for (let i = lastIndex; i > safeIndex; i -= 1) {
          updated[i][field] = rows[i - 1]?.[field] ?? '';
        }
        updated[0][field] = '';
      }

      if (tipoLista === 'materiales' && field === 'valorUnitario') {
        for (let i = 0; i < updated.length; i += 1) {
          const cantidad = toNumber(updated[i].cantidad);
          const valorUnitario = toNumber(updated[i].valorUnitario);
          updated[i].valorTotal = cantidad * valorUnitario;
        }
      }

      return updated;
    });
  };

  // 📊 Config columnas
  const columns = React.useMemo(() => {
    const base = [
      { field: 'codigo', headerName: 'Código', flex: 1, editable: true },
      { field: 'descripcion', headerName: 'Descripción', flex: 2, editable: true },
    ];
    if (tipoLista === 'materiales') {
      base.push(
        {
          field: 'cantidad',
          headerName: 'Cantidad',
          type: 'number',
          align: 'right',
          flex: 0.7,
          editable: true,
        },
        {
          field: 'valorUnitario',
          headerName: 'Valor unitario',
          align: 'right',
          flex: 1,
          editable: true,
          valueFormatter: ({ value }) => formatCurrency(value),
        },
        {
          field: 'valorTotal',
          headerName: 'Valor total',
          align: 'right',
          flex: 1,
          editable: true,
          valueFormatter: ({ value }) => formatCurrency(value),
        }
      );
    } else {
      base.push({
        field: 'valorUnitario',
        headerName: 'Valor unitario',
        align: 'right',
        flex: 1,
        editable: true,
        valueFormatter: ({ value }) => formatCurrency(value),
      });
    }
    return base;
  }, [tipoLista]);

  const suma = productos.reduce(
    (acc, r) => acc + toNumber(r.valorTotal || r.cantidad * r.valorUnitario),
    0
  );
  const coincide = Math.abs(suma - valorTotal) < 0.01;

  if (cargando) {
    return (
      <Box sx={{ p: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Cargando acopio...</Typography>
      </Box>
    );
  }

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 6 }}>
      <Container maxWidth="lg">
        <Typography variant="h5" gutterBottom>
          ✏️ Editar Acopio {codigo ? `(${codigo})` : ''}
        </Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
{urls?.length > 0 && (
  <Stack sx={{ width: { xs: '100%', md: '40%' } }} spacing={1}>
    {urls.length > 1 && (
  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
    <Button size="small" variant="outlined" onClick={goPrev}>Anterior</Button>
    <Button size="small" variant="outlined" onClick={goNext}>Siguiente</Button>
  </Stack>
)}

    <Paper
      onClick={() => openAt(currentIdx)}
      sx={{
        height: { xs: 360, md: 'calc(100vh - 200px)' },
        position: { md: 'sticky' },
        top: { md: 80 },
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#fafafa',
        border: '1px solid #ddd',
        cursor: 'zoom-in',
      }}
    >
      {isPdf(urls[currentIdx]) ? (
        <embed src={safeSrc(urls[currentIdx])} type="application/pdf" width="100%" height="100%" />
      ) : (
        <img
          src={safeSrc(urls[currentIdx])}
          alt={`Vista previa ${currentIdx + 1}/${urls.length}`}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      )}
    </Paper>

    {/* Tira de miniaturas */}
    {urls.length > 1 && (
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          overflowX: 'auto',
          p: 1,
          border: '1px solid #eee',
          borderRadius: 1,
          bgcolor: '#fff',
        }}
      >
        {urls.map((u, idx) => (
          <Box
            key={`${u}-${idx}`}
            onClick={() => setCurrentIdx(idx)}
            sx={{
              flex: '0 0 auto',
              width: 84,
              height: 84,
              borderRadius: 1,
              border: idx === currentIdx ? '2px solid #1976d2' : '1px solid #ddd',
              overflow: 'hidden',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#fafafa',
            }}
            title={`Abrir ${idx + 1}/${urls.length}`}
          >
            {isPdf(u) ? (
              <Typography variant="caption" sx={{ p: 1, textAlign: 'center' }}>
                PDF
              </Typography>
            ) : (
              <img
                src={safeSrc(u)}
                alt={`thumb-${idx}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
          </Box>
        ))}
      </Box>
    )}
  </Stack>
)}


<Dialog
  open={openPreview}
  onClose={() => setOpenPreview(false)}
  maxWidth="xl"
  onKeyDown={(e) => {
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === 'ArrowRight') goNext();
  }}
>
  <Box
    sx={{
      bgcolor: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      width: '90vw',
      height: '90vh',
      outline: 'none',
    }}
    tabIndex={0}
  >
    {/* Botón previo */}
    {urls.length > 1 && (
      <Button
        onClick={goPrev}
        sx={{
          position: 'absolute',
          left: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          minWidth: 0,
          width: 40,
          height: 40,
          borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.15)',
          color: '#fff',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
        }}
      >
        ←
      </Button>
    )}

    {/* Contenido */}
    {isPdf(urls[currentIdx]) ? (
      <embed src={safeSrc(urls[currentIdx])} type="application/pdf" width="100%" height="100%" />
    ) : (
      <img
        src={safeSrc(urls[currentIdx])}
        alt={`preview-${currentIdx}`}
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
      />
    )}

    {/* Botón siguiente */}
    {urls.length > 1 && (
      <Button
        onClick={goNext}
        sx={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          minWidth: 0,
          width: 40,
          height: 40,
          borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.15)',
          color: '#fff',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
        }}
      >
        →
      </Button>
    )}

    {/* Indicador */}
    <Box
      sx={{
        position: 'absolute',
        bottom: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#fff',
        bgcolor: 'rgba(0,0,0,0.4)',
        px: 1,
        py: 0.5,
        borderRadius: 1,
        fontSize: 12,
      }}
    >
      {currentIdx + 1} / {urls.length}
    </Box>
  </Box>
</Dialog>


          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack spacing={2}>
              {/* Datos generales */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} size="small" />
                <Autocomplete
                  freeSolo
                  options={proveedoresOptions}
                  value={proveedor}
                  onInputChange={(_, v) => setProveedor(v)}
                  renderInput={(p) => <TextField {...p} label="Proveedor" size="small" />}
                />
                <TextField
                  select
                  label="Proyecto"
                  value={proyecto}
                  onChange={(e) => setProyecto(e.target.value)}
                  size="small"
                  fullWidth
                >
                  {proyectosOptions.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.nombre}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              
                <TextField
                  label="Valor acopiado"
                  value={valorTotal}
                  onChange={(e) => setValorTotal(toNumber(e.target.value))}
                  size="small"
                  fullWidth
                />
              

              {/* Acciones masivas */}
              <Stack spacing={1}>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Fórmula"
                    placeholder="%10 | -100 | *1.21"
                    value={formula}
                    onChange={(e) => setFormula(e.target.value)}
                    size="small"
                    fullWidth
                  />
                  <Button
                    variant="contained"
                    onClick={() => onApplyPriceFormula(formula, 'selected')}
                    disabled={!selectionModel.length}
                  >
                    Aplicar a seleccionados
                  </Button>
                  <Button variant="outlined" onClick={() => onApplyPriceFormula(formula, 'all')}>
                    Aplicar a todos
                  </Button>
                </Stack>

                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Prefijo código"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    size="small"
                  />
                  <TextField
                    type="number"
                    label="Largo máx"
                    value={maxLen}
                    onChange={(e) => setMaxLen(parseInt(e.target.value || '16', 10))}
                    size="small"
                  />
                  <Button variant="outlined" onClick={onGenerateMissingCodes}>
                    Generar códigos faltantes
                  </Button>
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap">
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!selectionModel.length}
                    onClick={() => {
                      const firstId = selectionModel[0];
                      const fromIndex = productos.findIndex(
                        (p) => String(p.id) === String(firstId)
                      );
                      moveColumnValues('valorUnitario', fromIndex, 'up');
                    }}
                  >
                    ⬆️ Subir precios desde aquí
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!selectionModel.length}
                    onClick={() => {
                      const firstId = selectionModel[0];
                      const fromIndex = productos.findIndex(
                        (p) => String(p.id) === String(firstId)
                      );
                      moveColumnValues('valorUnitario', fromIndex, 'down');
                    }}
                  >
                    ⬇️ Bajar precios desde aquí
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!selectionModel.length}
                    onClick={() => {
                      const firstId = selectionModel[0];
                      const fromIndex = productos.findIndex(
                        (p) => String(p.id) === String(firstId)
                      );
                      moveColumnValues('codigo', fromIndex, 'up');
                    }}
                  >
                    ⬆️ Subir códigos desde aquí
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!selectionModel.length}
                    onClick={() => {
                      const firstId = selectionModel[0];
                      const fromIndex = productos.findIndex(
                        (p) => String(p.id) === String(firstId)
                      );
                      moveColumnValues('codigo', fromIndex, 'down');
                    }}
                  >
                    ⬇️ Bajar códigos desde aquí
                  </Button>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={!selectionModel.length}
                    onClick={handleBulkDelete}
                  >
                    🗑️ Eliminar seleccionados
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={!selectionModel.length}
                    onClick={handleBulkPriceUpdate}
                  >
                    💲 Actualizar precio…
                  </Button>
                  <Button variant="outlined" size="small" onClick={() => handleAddItem('start')}>
                    ➕ Agregar al inicio
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={!selectionModel.length}
                    onClick={() => {
                      const firstId = selectionModel[0];
                      const firstIndex = productos.findIndex(
                        (p) => String(p.id) === String(firstId)
                      );
                      handleAddItem(firstIndex);
                    }}
                  >
                    ➕ Agregar debajo del seleccionado
                  </Button>
                  <Button variant="outlined" size="small" onClick={() => handleAddItem('end')}>
                    ➕ Agregar al final
                  </Button>
                </Stack>
              </Stack>

              {/* Grilla */}
              <Box sx={{ height: 520 }}>
                <DataGrid
                  rows={productos}
                  getRowId={(r) => r.id}
                  columns={columns}
                  checkboxSelection
                  onRowSelectionModelChange={(m) => setSelectionModel(m.map(String))}
                  rowSelectionModel={selectionModel}
                  processRowUpdate={processRowUpdate}
                  disableRowSelectionOnClick
                  experimentalFeatures={{ newEditingApi: true }}
                  slots={{ toolbar: GridToolbar }}
                  slotProps={{
                    toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 300 } },
                  }}
                />
              </Box>

              {/* Suma total */}
              {tipoLista === 'materiales' && (
                <Box
                  sx={{
                    p: 2,
                    border: '1px dashed #ccc',
                    borderRadius: 2,
                    bgcolor: coincide ? 'rgba(76,175,80,0.08)' : 'rgba(244,67,54,0.06)',
                  }}
                >
                  <Typography variant="body2">
                    <strong>Suma total:</strong> {fmtMoney(suma)} —{' '}
                    <strong>Valor acopiado:</strong> {fmtMoney(valorTotal)}{' '}
                    {coincide ? '✅ Coinciden' : '⚠️ No coinciden'}
                  </Typography>
                </Box>
              )}

              {/* Botón guardar */}
              <Button
                variant="contained"
                color="primary"
                disabled={guardando}
                startIcon={guardando ? <CircularProgress size={20} color="inherit" /> : null}
                onClick={guardarCambios}
              >
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Container>

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert({ ...alert, open: false })}
      >
        <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

EditarAcopioPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
