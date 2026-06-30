import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Box, Stack, Typography, Button, Grid, Card, CardContent, CardMedia,
  Divider, Chip, IconButton, Tooltip, CircularProgress,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import pdfPlantillaService from 'src/services/pdfPlantillaService';

const PdfPlantillaChatDialog = dynamic(
  () => import('src/components/plantillasPdf/PdfPlantillaChatDialog'),
  { ssr: false }
);

/**
 * Sección reutilizable de plantillas para un `documentType`: lista la plantilla
 * por defecto + las custom de la empresa (editar / marcar principal / eliminar)
 * y abre el diálogo de chat (generador + corrector con visión) para crear/editar.
 * Genérica: se renderiza una vez por cada tipo de documento en /plantillas-pdf.
 */
export default function SeccionPlantillas({
  empresaId,
  empresaNombre = '',
  logos = [],
  documentType,
  titulo,
  descripcionDefault,
  sampleData,
  buildSampleData = null,
  sampleDataModes = [],
  defaultDocumentLoader,
  onNotify,
}) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const cargar = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    const ts = await pdfPlantillaService.listar(empresaId, documentType);
    setTemplates(ts || []);
    setLoading(false);
  }, [empresaId, documentType]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirNueva = () => { setEditingTemplate(null); setChatOpen(true); };
  const abrirEditar = (t) => { setEditingTemplate(t); setChatOpen(true); };
  const handleGuardada = () => { onNotify?.('Plantilla guardada'); cargar(); };

  const handleEliminar = async (t) => {
    const ok = await pdfPlantillaService.eliminar(t._id);
    if (ok) { onNotify?.('Plantilla eliminada'); cargar(); }
    else onNotify?.('No se pudo eliminar', 'error');
  };

  const handleMarcarPrincipal = async (t) => {
    const updated = await pdfPlantillaService.actualizar(t._id, { es_principal: true });
    if (updated) { onNotify?.('Plantilla marcada como principal'); cargar(); }
    else onNotify?.('No se pudo actualizar', 'error');
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>{titulo}</Typography>
        <Button startIcon={<AutoFixHighIcon />} variant="contained" size="small" onClick={abrirNueva}>
          Nueva plantilla
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
      ) : (
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
                <Typography variant="caption" color="text.secondary">{descripcionDefault}</Typography>
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
                    <IconButton size="small" color="error" onClick={() => handleEliminar(t)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </Stack>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {empresaId && (
        <PdfPlantillaChatDialog
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          empresaId={empresaId}
          documentType={documentType}
          sampleData={sampleData}
          buildSampleData={buildSampleData}
          sampleDataModes={sampleDataModes}
          defaultDocumentLoader={defaultDocumentLoader}
          empresaNombre={empresaNombre}
          logos={logos}
          initialTemplate={editingTemplate}
          onSaved={handleGuardada}
        />
      )}
    </Box>
  );
}
