import React, { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import {
  Alert, Box, Button, Card, CardContent, CardMedia, CircularProgress, Container,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid, IconButton, Menu,
  MenuItem, Snackbar, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import empresaLogoService from 'src/services/empresaLogoService';
import SeccionPlantillas from 'src/components/plantillasPdf/SeccionPlantillas';
import CONTROL_PRESUPUESTO_SAMPLE_DATA, { buildSampleData as buildControlPresupuestoSampleData } from 'src/utils/controlPresupuesto/sampleData';
import COMPROBANTE_MOVIMIENTO_SAMPLE_DATA from 'src/utils/comprobanteMovimiento/sampleData';

// Los documentos por defecto se cargan client-side (importan @react-pdf, fuera del bundle SSR).
const loadDefaultControlPresupuestoDoc = () =>
  import('src/utils/controlPresupuesto/PdfControlPresupuestoDocument').then((m) => m.PdfControlPresupuestoDocument);
const loadDefaultComprobanteMovimientoDoc = () =>
  import('src/utils/comprobanteMovimiento/PdfComprobanteMovimientoDocument').then((m) => m.PdfComprobanteMovimientoDocument);

const PlantillasPdfPage = () => {
  const { user } = useAuthContext();
  const [empresa, setEmpresa] = useState(null);
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState(null); // { msg, severity }

  // Logo: alta
  const [logoDialogOpen, setLogoDialogOpen] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoNombre, setLogoNombre] = useState('');
  const [logoSaving, setLogoSaving] = useState(false);
  const logoFileRef = useRef(null);

  // Logo: menú contextual + renombrar
  const [logoMenu, setLogoMenu] = useState({ anchor: null, logo: null });
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const empresaId = empresa?.id || null;
  const empresaNombre = empresa?.nombre || '';
  const notify = (msg, severity = 'success') => setSnack({ msg, severity });

  const cargarLogos = useCallback(async (empId) => {
    const ls = await empresaLogoService.listar(empId);
    setLogos(ls || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const emp = await getEmpresaDetailsFromUser(user);
      if (cancelled || !emp) { setLoading(false); return; }
      setEmpresa(emp);
      await cargarLogos(emp.id);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, cargarLogos]);

  // ── Logos ──────────────────────────────────────────────────────────────────
  const handlePickLogoFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLogoFile(file);
    if (!logoNombre) setLogoNombre(file.name.replace(/\.[^.]+$/, ''));
  };

  const handleGuardarLogo = async () => {
    if (!logoFile) return;
    setLogoSaving(true);
    const created = await empresaLogoService.subir({ empresaId, file: logoFile, nombre: logoNombre });
    setLogoSaving(false);
    if (created) {
      setLogoDialogOpen(false); setLogoFile(null); setLogoNombre('');
      notify('Logo agregado');
      cargarLogos(empresaId);
    } else {
      notify('No se pudo subir el logo', 'error');
    }
  };

  const handleRenombrarLogo = async () => {
    const logo = logoMenu.logo;
    setRenameOpen(false);
    const updated = await empresaLogoService.renombrar(logo._id, renameValue);
    if (updated) { notify('Logo renombrado'); cargarLogos(empresaId); }
    else notify('No se pudo renombrar', 'error');
  };

  const handleEliminarLogo = async () => {
    const logo = logoMenu.logo;
    setLogoMenu({ anchor: null, logo: null });
    const ok = await empresaLogoService.eliminar(logo._id);
    if (ok) { notify('Logo eliminado'); cargarLogos(empresaId); }
    else notify('No se pudo eliminar', 'error');
  };

  return (
    <>
      <Head><title>Plantillas y logos</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="lg">
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
          ) : (
            <Stack spacing={4}>
              {/* ─── Logos ─── */}
              <Box>
                <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography variant="h6" sx={{ flex: 1 }}>Logos de la empresa</Typography>
                  <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={() => setLogoDialogOpen(true)}>
                    Agregar logo
                  </Button>
                </Stack>
                {logos.length === 0 ? (
                  <Card variant="outlined" sx={{ mt: 1.5, p: 3, textAlign: 'center', borderStyle: 'dashed' }}>
                    <ImageOutlinedIcon sx={{ fontSize: 36, color: 'text.disabled' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Todavía no cargaste ningún logo.
                    </Typography>
                  </Card>
                ) : (
                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    {logos.map((logo) => (
                      <Grid item xs={6} sm={4} md={3} key={logo._id}>
                        <Card variant="outlined" sx={{ position: 'relative' }}>
                          <CardMedia
                            component="img"
                            image={logo.url}
                            alt={logo.nombre}
                            sx={{ height: 96, objectFit: 'contain', bgcolor: 'grey.50', p: 1 }}
                          />
                          <Divider />
                          <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 }, display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body2" noWrap sx={{ flex: 1 }} title={logo.nombre}>{logo.nombre}</Typography>
                            <IconButton size="small" onClick={(e) => setLogoMenu({ anchor: e.currentTarget, logo })}>
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>

              <Divider />

              {/* ─── Plantillas de control de presupuesto ─── */}
              <SeccionPlantillas
                empresaId={empresaId}
                empresaNombre={empresaNombre}
                logos={logos}
                documentType="control_presupuesto"
                titulo="Plantillas de control de presupuesto"
                descripcionDefault="Recibo de pagos estándar. Se usa cuando no hay una plantilla principal."
                sampleData={CONTROL_PRESUPUESTO_SAMPLE_DATA}
                buildSampleData={buildControlPresupuestoSampleData}
                sampleDataModes={['nominal', 'cac', 'usd']}
                defaultDocumentLoader={loadDefaultControlPresupuestoDoc}
                onNotify={notify}
              />

              <Divider />

              {/* ─── Plantillas de comprobantes de movimiento ─── */}
              <SeccionPlantillas
                empresaId={empresaId}
                empresaNombre={empresaNombre}
                logos={logos}
                documentType="comprobante_movimiento"
                titulo="Plantillas de comprobantes de movimiento"
                descripcionDefault="Comprobante de pago/cobro estándar. Se usa cuando no hay una plantilla principal."
                sampleData={COMPROBANTE_MOVIMIENTO_SAMPLE_DATA}
                defaultDocumentLoader={loadDefaultComprobanteMovimientoDoc}
                onNotify={notify}
              />
            </Stack>
          )}
        </Container>
      </Box>

      {/* Menú de logo */}
      <Menu anchorEl={logoMenu.anchor} open={!!logoMenu.anchor} onClose={() => setLogoMenu({ anchor: null, logo: null })}>
        <MenuItem onClick={() => { setRenameValue(logoMenu.logo?.nombre || ''); setRenameOpen(true); }}>
          <EditOutlinedIcon fontSize="small" sx={{ mr: 1 }} /> Renombrar
        </MenuItem>
        <MenuItem onClick={handleEliminarLogo} sx={{ color: 'error.main' }}>
          <DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} /> Eliminar
        </MenuItem>
      </Menu>

      {/* Renombrar logo */}
      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Renombrar logo</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth size="small" label="Nombre" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleRenombrarLogo} disabled={!renameValue.trim()}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Alta de logo */}
      <Dialog open={logoDialogOpen} onClose={() => !logoSaving && setLogoDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Agregar logo</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <input ref={logoFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePickLogoFile} />
            <Button variant="outlined" startIcon={<ImageOutlinedIcon />} onClick={() => logoFileRef.current?.click()}>
              {logoFile ? 'Cambiar imagen' : 'Elegir imagen'}
            </Button>
            {logoFile && (
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Box component="img" src={URL.createObjectURL(logoFile)} alt="" sx={{ maxHeight: 96, maxWidth: '100%', objectFit: 'contain' }} />
              </Box>
            )}
            <TextField fullWidth size="small" label="Nombre del logo" placeholder="Ej: Logo principal" value={logoNombre} onChange={(e) => setLogoNombre(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoDialogOpen(false)} disabled={logoSaving}>Cancelar</Button>
          <Button variant="contained" onClick={handleGuardarLogo} disabled={!logoFile || logoSaving} startIcon={logoSaving ? <CircularProgress size={14} color="inherit" /> : null}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3500} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack ? <Alert severity={snack.severity} onClose={() => setSnack(null)} variant="filled">{snack.msg}</Alert> : null}
      </Snackbar>
    </>
  );
};

PlantillasPdfPage.getLayout = (page) => (
  <DashboardLayout title="Plantillas y logos">{page}</DashboardLayout>
);

export default PlantillasPdfPage;
