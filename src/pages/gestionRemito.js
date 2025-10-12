import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Button, Container, Stack, Typography, TextField, Snackbar, Alert,
  Grid, Paper, CircularProgress, Dialog, DialogContent, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/router';

import AcopioService from 'src/services/acopioService';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import RemitoReadOnlyTable from 'src/components/remitoReadOnlyTable';
import RemitoItemEditDialog from 'src/components/remitoItemEditDialog';
import InstructionBarIA from 'src/components/instructionBarIA';
import ProductosFormSelect from 'src/components/ProductosFormSelect';

function normalizar(t) {
  return (t || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function completarPorFuzzy(m, baseMateriales) {
  const desc = normalizar(m.descripcion);
  let mejor = null, mejorScore = -1;
  for (const b of baseMateriales) {
    const bd = normalizar(b.descripcion);
    let score = 0;
    for (const p of desc.split(/\s+/)) if (p && bd.includes(p)) score++;
    if (score > mejorScore) { mejorScore = score; mejor = b; }
  }
  return {
    ...m,
    codigo: m.codigo || (mejor && mejor.codigo) || '',
    descripcion: m.descripcion || (mejor && mejor.descripcion) || '',
    valorUnitario: m.valorUnitario != null ? m.valorUnitario : (mejor && mejor.valorUnitario) || 0
  };
}

const GestionRemitoPage = () => {
  const router = useRouter();
  const { acopioId, remitoId: ridQuery } = router.query || {};

  // metadatos remito
  const [numeroRemito, setNumeroRemito] = useState('');
  const [fecha, setFecha] = useState('');
  const [remitoId, setRemitoId] = useState(null);
  const [tipoAcopio, setTipoAcopio] = useState('materiales'); // 'materiales' | 'lista_precios'

  // archivo/preview
  const [archivoRemitoUrl, setArchivoRemitoUrl] = useState(null);
  const [archivoRemitoFile, setArchivoRemitoFile] = useState(null);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  // datos
  const [materialesDisponibles, setMaterialesDisponibles] = useState([]);
  const [items, setItems] = useState([]);

  // ui state
  const [loadingInit, setLoadingInit] = useState(false);
  const [loadingProceso, setLoadingProceso] = useState(false);
  const [alert, setAlert] = useState({ open:false, message:'', severity:'info' });

  // mover remito
  const [dialogoMoverAbierto, setDialogoMoverAbierto] = useState(false);
  const [acopiosDisponibles, setAcopiosDisponibles] = useState([]);
  const [nuevoAcopioSeleccionado, setNuevoAcopioSeleccionado] = useState('');

  // total
  const valorTotal = useMemo(
    () => items.reduce((s, it) => s + (Number(it.valorUnitario || 0) * Number(it.cantidad || 0)), 0),
    [items]
  );

  const [editOpen, setEditOpen] = useState(false);
const [editIndex, setEditIndex] = useState(-1);
const [editItem, setEditItem] = useState(null);

const openEdit = (idx) => {
  const it = items[idx];
  setEditIndex(idx);
  setEditItem(it);
  setEditOpen(true);
};
const closeEdit = () => {
  setEditOpen(false);
  setTimeout(() => { setEditItem(null); setEditIndex(-1); }, 0);
};
const saveEdit = (updated) => {
  const next = items.slice();
  next[editIndex] = { ...next[editIndex], ...updated };
  setItems(next);
  closeEdit();
  setAlert({ open: true, message: 'Ítem actualizado', severity: 'success' });
};

const deleteFromDialog = () => {
  if (editIndex < 0) return;
  const next = items.slice();
  next.splice(editIndex, 1);
  setItems(next);
  closeEdit();
  setAlert({ open: true, message: 'Ítem eliminado', severity: 'success' });
};
const deleteFromTable = (idx) => {
  const next = items.slice();
  next.splice(idx, 1);
  setItems(next);
  setAlert({ open: true, message: 'Ítem eliminado', severity: 'success' });
};


  // load init
  useEffect(() => {
    const cargar = async () => {
      if (!acopioId) return;
      setLoadingInit(true);
      try {
        const acopio = await AcopioService.obtenerAcopio(acopioId);
        setTipoAcopio((acopio && acopio.tipo) || 'materiales');

        // base para fuzzy
        const disponibles = await AcopioService.getMaterialesAcopiados(acopioId);
        setMaterialesDisponibles(disponibles || []);

        // edición
        const rid = ridQuery;
        if (rid) {
          setRemitoId(rid);
          const remito = await AcopioService.obtenerRemito(acopioId, rid);
          setFecha(remito.fecha || '');
          setNumeroRemito(remito.numero_remito || '');
          const url = Array.isArray(remito.url_remito) ? remito.url_remito[0] : remito.url_remito;
          setArchivoRemitoUrl(url || null);
          setItems(remito.movimientos || []);

          const todos = await AcopioService.listarAcopios(acopio.empresaId);
          setAcopiosDisponibles((todos || []).filter(a => a.id !== acopioId));
        }
      } catch (e) {
        console.error(e);
        setAlert({ open:true, message:'Error al cargar datos', severity:'error' });
      } finally {
        setLoadingInit(false);
      }
    };
    cargar();
  }, [acopioId, ridQuery]);

  // handlers
  const handleArchivoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setArchivoRemitoFile(file);
    setArchivoRemitoUrl(URL.createObjectURL(file));
  };

  const extraer = async () => {
    try {
      if (!archivoRemitoFile && !archivoRemitoUrl) {
        setAlert({ open:true, message:'Primero subí un archivo del remito.', severity:'warning' });
        return;
      }
      setLoadingProceso(true);
      const sinMateriales = tipoAcopio === 'lista_precios';
      const data = await AcopioService.extraerDatosDesdeArchivo(
        acopioId, archivoRemitoFile, archivoRemitoUrl, { sinMateriales }
      );

      if (data && data.materiales) {
        let mats = data.materiales.map(m => ({
          ...m,
          cantidad: Number(m.cantidad || 0),
          valorUnitario: Number(m.valorUnitario || 0)
        }));

        if (sinMateriales || mats.some(m => !m.codigo)) {
          const base = materialesDisponibles || [];
          mats = mats.map(m => completarPorFuzzy(m, base));
        }

        setItems(mats);
        setAlert({ open:true, message:'Datos extraídos con éxito.', severity:'success' });
      } else {
        setAlert({ open:true, message:'No se detectaron materiales.', severity:'warning' });
      }
    } catch (e) {
      console.error(e);
      setAlert({ open:true, message:'Error al extraer datos del remito.', severity:'error' });
    } finally {
      setLoadingProceso(false);
    }
  };

  const guardarRemito = async () => {
    try {
      if (!fecha || items.length === 0) {
        setAlert({ open:true, message:'Completá fecha y al menos un ítem.', severity:'warning' });
        return;
      }
      setLoadingProceso(true);

      if (remitoId) {
        await AcopioService.editarRemito(
          acopioId, remitoId, items,
          { fecha, valorOperacion: valorTotal, estado: 'confirmado', numero_remito: numeroRemito },
          archivoRemitoFile || undefined
        );
        setAlert({ open:true, message:'Remito actualizado con éxito', severity:'success' });
        router.push(`/movimientosAcopio?acopioId=${acopioId}&tab=remitos`);
      } else {
        await AcopioService.crearRemitoConMovimientos(acopioId, items, {
          fecha,
          archivo: archivoRemitoFile || undefined,
          numero_remito: numeroRemito
        });
        setAlert({ open:true, message:'Remito creado con éxito', severity:'success' });
        router.push(`/movimientosAcopio?acopioId=${acopioId}`);
      }
    } catch (e) {
      console.error(e);
      setAlert({ open:true, message:'Error al guardar remito', severity:'error' });
    } finally {
      setLoadingProceso(false);
    }
  };

  if (loadingInit) {
    return (
      <Box component="main" style={{ paddingTop: 64 }}>
        <Container maxWidth="xl" style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:300 }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
      <Container maxWidth="xl">
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">{remitoId ? 'Editar Remito' : 'Crear nuevo Remito'}</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="text" startIcon={<ArrowBackIcon />} onClick={() => router.push(`/movimientosAcopio?acopioId=${acopioId || ''}`)}>
              Volver a resumen del acopio
            </Button>
          </Stack>
        </Stack>

        <Grid container spacing={3}>
          {/* Archivo + Extracción */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Archivo del Remito</Typography>

              {archivoRemitoUrl ? (
                archivoRemitoUrl.endsWith('.pdf') ? (
                  <iframe src={archivoRemitoUrl} width="100%" height="480" title="Remito PDF" />
                ) : (
                  <Box
                    sx={{
                      width: '100%', height: 480, backgroundImage: `url(${archivoRemitoUrl})`,
                      backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
                      cursor: 'zoom-in', borderRadius: 1, bgcolor: 'background.default'
                    }}
                    onClick={() => setFullscreenOpen(true)}
                  />
                )
              ) : (
                <Typography variant="body2" color="text.secondary">No hay archivo cargado.</Typography>
              )}

              <Stack direction="row" spacing={1} mt={2}>
                <Button component="label" variant="outlined" fullWidth>
                  {archivoRemitoUrl ? 'Cambiar archivo' : 'Subir archivo'}
                  <input type="file" hidden onChange={handleArchivoChange} />
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={extraer}
                  disabled={loadingProceso || (!archivoRemitoFile && !archivoRemitoUrl)}
                >
                  {loadingProceso ? <CircularProgress size={20} /> : 'Extraer datos'}
                </Button>
              </Stack>
              {tipoAcopio === 'lista_precios' && (
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                  * Acopio tipo <b>lista de precios</b>: extraemos sin catálogos cargados; luego podés ajustar con instrucciones.
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* Datos remito */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Stack spacing={2}>
                <TextField
                  label="Número de Remito"
                  placeholder="Ej: 0001-123456"
                  value={numeroRemito}
                  onChange={(e) => setNumeroRemito(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Fecha"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  fullWidth
                />

                {!items.length && (
                  <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="subtitle1" gutterBottom>Extraer materiales del archivo</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Subí una imagen o PDF y presioná <b>Extraer datos</b> para leer las líneas automáticamente.
                    </Typography>
                  </Box>
                )}

                {!!items.length && (
                  <>

{tipoAcopio === 'materiales' ? (
  <ProductosFormSelect
    productos={items}
    setProductos={setItems}
    valorTotal={valorTotal}
    // setValorTotal={setValorTotal}
    opcionesMateriales={materialesDisponibles}
    acopioId={acopioId}
    autoCompletarValoresUnitarios
  />
) : (
  <>
    
    {!!movimientos?.length && (
      <>
    <RemitoReadOnlyTable items={items} onEditItem={openEdit}  onDeleteItem={deleteFromTable}/>

<InstructionBarIA
  acopioId={acopioId}
  items={items}
  setItems={setItems}
  onResumen={(msg) => setAlert({ open: true, message: msg || 'Edición aplicada', severity: 'success' })}
/>
      </>
    )}
  </>
)}
                  
                    <Typography variant="subtitle1" sx={{ pt: 1 }}>
                      Valor total: ${valorTotal.toLocaleString('es-AR')}
                    </Typography>
                  </>
                )}

                <Button
                  variant="contained"
                  onClick={guardarRemito}
                  disabled={loadingProceso || !items.length || !fecha}
                >
                  {loadingProceso ? <CircularProgress size={20} /> : 'Guardar Remito'}
                </Button>

                {remitoId && (
                  <Button variant="outlined" color="warning" onClick={() => setDialogoMoverAbierto(true)}>
                    Mover este remito a otro acopio
                  </Button>
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
        <RemitoItemEditDialog
          open={editOpen}
          item={editItem}
          onClose={closeEdit}
          onSave={saveEdit}
          onDelete={deleteFromDialog}
        />
        {/* Snackbar */}
        <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert({ ...alert, open:false })}>
          <Alert onClose={() => setAlert({ ...alert, open:false })} severity={alert.severity}>
            {alert.message}
          </Alert>
        </Snackbar>

        {/* Imagen fullscreen */}
        <Dialog open={fullscreenOpen} onClose={() => setFullscreenOpen(false)} maxWidth={false} fullScreen>
          <DialogContent sx={{ p: 0, backgroundColor: '#000' }}>
            <IconButton onClick={() => setFullscreenOpen(false)} sx={{ position: 'absolute', top: 16, right: 16, color: '#fff', zIndex: 1 }}>
              <CloseIcon />
            </IconButton>
            {archivoRemitoUrl && (
              <img src={archivoRemitoUrl} alt="Remito Completo" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
            )}
          </DialogContent>
        </Dialog>

        {/* Mover remito */}
        <Dialog open={dialogoMoverAbierto} onClose={() => setDialogoMoverAbierto(false)} fullWidth maxWidth="sm">
          <DialogContent>
            <Typography variant="h6" gutterBottom>Mover remito a otro acopio</Typography>
            <TextField
              select
              fullWidth
              label="Seleccioná un acopio de destino"
              value={nuevoAcopioSeleccionado}
              onChange={(e) => setNuevoAcopioSeleccionado(e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="">-- Seleccionar --</option>
              {acopiosDisponibles.map(a => (
                <option key={a.id} value={a.id}>{a.codigo} - {a.proveedor} ({a.proyecto_nombre})</option>
              ))}
            </TextField>

            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button onClick={() => setDialogoMoverAbierto(false)}>Cancelar</Button>
              <Button
                variant="contained"
                color="primary"
                disabled={!nuevoAcopioSeleccionado}
                onClick={async () => {
                  const confirmado = confirm('¿Mover este remito al nuevo acopio?');
                  if (!confirmado) return;
                  setLoadingProceso(true);
                  const ok = await AcopioService.moverRemitoAotroAcopio(remitoId, acopioId, nuevoAcopioSeleccionado);
                  setLoadingProceso(false);
                  if (ok) {
                    setAlert({ open:true, message:'Remito movido con éxito', severity:'success' });
                    router.push(`/movimientosAcopio?acopioId=${nuevoAcopioSeleccionado}&tab=remitos`);
                  } else {
                    setAlert({ open:true, message:'No se pudo mover el remito', severity:'error' });
                  }
                  setDialogoMoverAbierto(false);
                }}
              >
                Confirmar movimiento
              </Button>
            </Stack>
          </DialogContent>
        </Dialog>
      </Container>
    </Box>
  );
};

GestionRemitoPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default GestionRemitoPage;
