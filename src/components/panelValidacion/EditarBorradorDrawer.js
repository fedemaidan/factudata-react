import {
  Box, Button, Drawer, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material';
import ImagenModal from 'src/components/ImagenModal';
import { formatNumberWithThousands, parsearMonto } from 'src/utils/celulandia/separacionMiles';

const DRAWER_WIDTH = 720;

const CAMPOS_EDITABLES = [
  'proyecto_id',
  'nombre_proveedor',
  'observacion',
  'categoria',
  'subcategoria',
  'total',
  'numero_factura',
  'medio_pago',
  'fecha_factura',
];

const LABELS = {
  proyecto_id: 'Proyecto',
  nombre_proveedor: 'Proveedor',
  observacion: 'Observación',
  categoria: 'Categoría',
  subcategoria: 'Subcategoría',
  total: 'Total',
  numero_factura: 'Número de factura',
  medio_pago: 'Medio de pago',
  fecha_factura: 'Fecha de factura',
};

function EditarBorradorFormContent({
  form,
  proyectos,
  onFormChange,
  onSave,
  onClose,
  saving,
  formatFecha,
}) {
  const camposSinProyecto = CAMPOS_EDITABLES.filter((k) => k !== 'proyecto_id');

  const renderCampo = (key) => {
    if (key === 'total') {
      const displayValue = (form[key] === '' || form[key] === undefined || form[key] === null)
        ? ''
        : formatNumberWithThousands(form[key]);
      return (
        <TextField
          key={key}
          fullWidth
          size="small"
          label={LABELS[key]}
          type="text"
          value={displayValue}
          onChange={(e) => {
            const valorParseado = parsearMonto(e.target.value).replace(',', '.');
            if (valorParseado === '') {
              onFormChange({ ...form, [key]: '' });
            } else {
              const num = parseFloat(valorParseado);
              if (!isNaN(num)) {
                onFormChange({ ...form, [key]: num });
              }
            }
          }}
        />
      );
    }
    return (
      <TextField
        key={key}
        fullWidth
        size="small"
        label={LABELS[key] || key.replace(/_/g, ' ')}
        value={key === 'fecha_factura' ? formatFecha(form[key]) : (form[key] ?? '')}
        onChange={(e) => onFormChange({ ...form, [key]: e.target.value })}
        type={key === 'fecha_factura' ? 'date' : 'text'}
        InputLabelProps={key === 'fecha_factura' ? { shrink: true } : undefined}
      />
    );
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
        Editar borrador
      </Typography>
      <FormControl fullWidth size="small">
        <InputLabel id="edit-proyecto-label">Proyecto</InputLabel>
        <Select
          labelId="edit-proyecto-label"
          label="Proyecto"
          value={form.proyecto_id ?? ''}
          onChange={(e) => onFormChange({ ...form, proyecto_id: e.target.value || '' })}
        >
          <MenuItem value="">Sin proyecto</MenuItem>
          {proyectos.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.nombre || p.name || p.id}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {camposSinProyecto.map((key) => renderCampo(key))}

      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={
            saving ||
            !form.proyecto_id ||
            form.total === '' ||
            form.total === undefined ||
            form.total === null ||
            !form.fecha_factura
          }
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
        <Button variant="outlined" onClick={onClose}>
          Cancelar
        </Button>
      </Stack>
    </Stack>
  );
}

function EditarBorradorDrawer({
  open,
  mov,
  form,
  proyectos = [],
  onClose,
  onSave,
  onFormChange,
  saving = false,
}) {
  const urlImagen = mov?.url_imagen || mov?.url_image;
  const isPdf = urlImagen && String(urlImagen).toLowerCase().includes('.pdf');
  const tieneImagen = Boolean(urlImagen) && !isPdf;

  const formatFecha = (val) => {
    if (!val) return '';
    if (typeof val === 'string' && val.includes('T')) return val.split('T')[0];
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    if (val?.toDate) return val.toDate().toISOString().split('T')[0];
    return '';
  };

  const formContent = (
    <EditarBorradorFormContent
      form={form}
      proyectos={proyectos}
      onFormChange={onFormChange}
      onSave={onSave}
      onClose={onClose}
      saving={saving}
      formatFecha={formatFecha}
    />
  );

  if (tieneImagen) {
    return (
      <ImagenModal
        open={open}
        onClose={onClose}
        imagenUrl={urlImagen}
        fileName={mov?.nombre_proveedor ? `Comprobante - ${mov.nombre_proveedor}` : 'Comprobante'}
        leftContent={formContent}
      />
    );
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: DRAWER_WIDTH } } }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          {/* Imagen o PDF a la izquierda */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 2,
              bgcolor: 'grey.50',
              borderRight: 1,
              borderColor: 'divider',
            }}
          >
            {urlImagen ? (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  minHeight: 280,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1,
                  overflow: 'hidden',
                  bgcolor: 'grey.100',
                }}
              >
                {isPdf ? (
                  <embed src={urlImagen} width="100%" height="100%" style={{ minHeight: 400 }} />
                ) : (
                  <img
                    src={urlImagen}
                    alt="Comprobante"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                    }}
                  />
                )}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Sin archivo adjunto
              </Typography>
            )}
          </Box>

          {/* Formulario al lado */}
          <Box sx={{ width: 360, p: 2, overflowY: 'auto' }}>
            {formContent}
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}

export default EditarBorradorDrawer;
