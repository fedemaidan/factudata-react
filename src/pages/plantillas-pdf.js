import React, { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import {
  Alert, Box, Button, Card, CardContent, CardMedia, Chip, CircularProgress, Container,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid, IconButton, Menu,
  MenuItem, Snackbar, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import empresaLogoService from 'src/services/empresaLogoService';
import pdfPlantillaService from 'src/services/pdfPlantillaService';
import CONTROL_PRESUPUESTO_SAMPLE_DATA from 'src/utils/controlPresupuesto/sampleData';

// El documento por defecto se carga client-side (importa @react-pdf, que no debe entrar al bundle SSR de la página).
const loadDefaultControlPresupuestoDoc = () =>
  import('src/utils/controlPresupuesto/PdfControlPresupuestoDocument').then((m) => m.PdfControlPresupuestoDocument);

const PdfPlantillaChatDialog = dynamic(
  () => import('src/components/plantillasPdf/PdfPlantillaChatDialog'),
  { ssr: false }
);

const DOC_TYPE = 'control_presupuesto';

const PlantillasPdfPage = () => {
  const { user } = useAuthContext();
  const [empresa, setEmpresa] = useState(null);
  const [logos, setLogos] = useState([]);
  const [templates, setTemplates] = useState([]);
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

  // Chat dialog (crear/editar plantilla)
  const [chatOpen, setChatOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const empresaId = empresa?.id || null;
  const notify = (msg, severity = 'success') => setSnack({ msg, severity });

  const cargar = useCallback(async (empId) => {
    setLoading(true);
    const [ls, ts] = await Promise.all([
      empresaLogoService.listar(empId),
      pdfPlantillaService.listar(empId, DOC_TYPE),
    ]);
    setLogos(ls || []);
    setTemplates(ts || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const emp = await getEmpresaDetailsFromUser(user);
      if (cancelled || !emp) { setLoading(false); return; }
      setEmpresa(emp);
      await cargar(emp.id);
    })();
    return () => { cancelled = true; };
  }, [user, cargar]);

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
      cargar(empresaId);
    } else {
      notify('No se pudo subir el logo', 'error');
    }
  };

  const handleRenombrarLogo = async () => {
    const logo = logoMenu.logo;
    setRenameOpen(false);
    const updated = await empresaLogoService.renombrar(logo._id, renameValue);
    if (updated) { notify('Logo renombrado'); cargar(empresaId); }
    else notify('No se pudo renombrar', 'error');
  };

  const handleEliminarLogo = async () => {
    const logo = logoMenu.logo;
    setLogoMenu({ anchor: null, logo: null });
    const ok = await empresaLogoService.eliminar(logo._id);
    if (ok) { notify('Logo eliminado'); cargar(empresaId); }
    else notify('No se pudo eliminar', 'error');
  };

  // ── Plantillas ───────────────────────────────────────────────────────────────
  const abrirNueva = () => { setEditingTemplate(null); setChatOpen(true); };
  const abrirEditar = (t) => { setEditingTemplate(t); setChatOpen(true); };

  const handlePlantillaGuardada = () => { notify('Plantilla guardada'); cargar(empresaId); };

  const handleEliminarPlantilla = async (t) => {
    const ok = await pdfPlantillaService.eliminar(t._id);
    if (ok) { notify('Plantilla eliminada'); cargar(empresaId); }
    else notify('No se pudo eliminar', 'error');
  };

  const handleMarcarPrincipal = async (t) => {
    const updated = await pdfPlantillaService.actualizar(t._id, { es_principal: true });
    if (updated) { notify('Plantilla marcada como principal'); cargar(empresaId); }
    else notify('No se pudo actualizar', 'error');
  };

  return (
    <>
      <Head><title>Plantillas y logos</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="lg">
          <Stack spacing={1} sx={{ mb: 3 }}>
            <Typography variant="h4">Plantillas y logos</Typography>
            <Typography variant="body2" color="text.secondary">
              Configurá los logos de tu empresa y diseñá las plantillas de exportación de tus documentos.
              Hoy disponible para <strong>Control de presupuesto</strong> (recibo de pagos).
            </Typography>
          </Stack>

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
                <Typography variant="caption" color="text.secondary">
                  Subí uno o varios logos (por ejemplo, uno por cliente). Después elegís cuál usar en cada plantilla.
                </Typography>

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
              <Box>
                <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography variant="h6" sx={{ flex: 1 }}>Plantillas de control de presupuesto</Typography>
                  <Button startIcon={<AutoFixHighIcon />} variant="contained" size="small" onClick={abrirNueva}>
                    Nueva plantilla
                  </Button>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Diseñá el recibo de pagos con IA y una vista previa en tiempo real. Si no creás ninguna, se usa la plantilla por defecto.
                </Typography>

                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  {/* Plantilla por defecto */}
                  <Grid item xs={12} sm={6} md={4}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <Box sx={{ height: 120, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <DescriptionOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
                      </Box>
                      <Divider />
                      <CardContent sx={{ py: 1.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="subtitle2" sx={{ flex: 1 }}>Plantilla por defecto</Typography>
                          <Chip label="Siempre disponible" size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          Recibo de pagos estándar. Se usa cuando no hay una plantilla principal.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Plantillas custom */}
                  {templates.map((t) => (
                    <Grid item xs={12} sm={6} md={4} key={t._id}>
                      <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {t.preview_image_url ? (
                          <CardMedia component="img" image={t.preview_image_url} alt={t.nombre} sx={{ height: 120, objectFit: 'cover', objectPosition: 'top', bgcolor: 'grey.100' }} />
                        ) : (
                          <Box sx={{ height: 120, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <DescriptionOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
                          </Box>
                        )}
                        <Divider />
                        <CardContent sx={{ py: 1.5, flex: 1 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="subtitle2" noWrap sx={{ flex: 1 }} title={t.nombre}>{t.nombre}</Typography>
                            {t.es_principal && <Chip color="primary" label="Principal" size="small" sx={{ fontSize: 10, height: 20 }} />}
                          </Stack>
                        </CardContent>
                        <Divider />
                        <Stack direction="row" sx={{ px: 0.5, py: 0.5 }}>
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => abrirEditar(t)}><EditOutlinedIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title={t.es_principal ? 'Es la principal' : 'Marcar como principal'}>
                            <span>
                              <IconButton size="small" disabled={t.es_principal} onClick={() => handleMarcarPrincipal(t)}>
                                {t.es_principal ? <StarIcon fontSize="small" color="primary" /> : <StarBorderIcon fontSize="small" />}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Box sx={{ flex: 1 }} />
                          <Tooltip title="Eliminar">
                            <IconButton size="small" color="error" onClick={() => handleEliminarPlantilla(t)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        </Stack>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
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

      {/* Chat dialog */}
      {empresaId && (
        <PdfPlantillaChatDialog
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          empresaId={empresaId}
          documentType={DOC_TYPE}
          sampleData={CONTROL_PRESUPUESTO_SAMPLE_DATA}
          defaultDocumentLoader={loadDefaultControlPresupuestoDoc}
          empresaNombre={empresa?.nombre || ''}
          logos={logos}
          initialTemplate={editingTemplate}
          onSaved={handlePlantillaGuardada}
        />
      )}

      <Snackbar open={!!snack} autoHideDuration={3500} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack ? <Alert severity={snack.severity} onClose={() => setSnack(null)} variant="filled">{snack.msg}</Alert> : null}
      </Snackbar>
    </>
  );
};

PlantillasPdfPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default PlantillasPdfPage;
