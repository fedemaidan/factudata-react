import PropTypes from 'prop-types';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
} from '@mui/material';

/**
 * Preguntas fijas + pistas según el lote (híbrido sin LLM extra en v1).
 */
const PreguntasContextoStep = ({ contexto, onChange, proyectos, files }) => {
  const pdfCount = files.filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)).length;
  const imgCount = files.length - pdfCount;

  const handleChange = (field, value) => {
    onChange({ ...contexto, [field]: value });
  };

  const handleProyecto = (e) => {
    const id = e.target.value;
    const p = proyectos.find((x) => x.id === id);
    onChange({
      ...contexto,
      proyecto_id: id,
      proyecto_nombre: p ? p.nombre || p.name : '',
    });
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Estas respuestas enriquecen el contexto del OCR para todo el lote. Podés corregir proyecto y datos por
        comprobante en el paso siguiente.
      </Typography>

      {(pdfCount > 0 || imgCount > 0) && (
        <Alert severity="info">
          Lote: {imgCount} imagen(es), {pdfCount} PDF. {files.length > 20 && 'Volúmenes grandes pueden tardar varios minutos en analizarse.'}
        </Alert>
      )}

      <FormControl fullWidth size="small" required>
        <InputLabel id="cm-proyecto-default">Proyecto por defecto</InputLabel>
        <Select
          labelId="cm-proyecto-default"
          label="Proyecto por defecto"
          value={contexto.proyecto_id || ''}
          onChange={handleProyecto}
        >
          <MenuItem value="">
            <em>Seleccionar</em>
          </MenuItem>
          {proyectos.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.nombre || p.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth size="small">
        <InputLabel>Tipo por defecto</InputLabel>
        <Select
          label="Tipo por defecto"
          value={contexto.default_type || 'egreso'}
          onChange={(e) => handleChange('default_type', e.target.value)}
        >
          <MenuItem value="egreso">Egreso</MenuItem>
          <MenuItem value="ingreso">Ingreso</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth size="small">
        <InputLabel>Moneda por defecto</InputLabel>
        <Select
          label="Moneda por defecto"
          value={contexto.default_moneda || 'ARS'}
          onChange={(e) => handleChange('default_moneda', e.target.value)}
        >
          <MenuItem value="ARS">ARS</MenuItem>
          <MenuItem value="USD">USD</MenuItem>
        </Select>
      </FormControl>

      <TextField
        size="small"
        fullWidth
        label="Categoría sugerida (opcional)"
        value={contexto.default_categoria || ''}
        onChange={(e) => handleChange('default_categoria', e.target.value)}
        helperText="Si el comprobante no trae categoría clara, se puede usar este valor."
      />

      <TextField
        size="small"
        fullWidth
        label="Medio de pago por defecto (opcional)"
        value={contexto.default_medio_pago || ''}
        onChange={(e) => handleChange('default_medio_pago', e.target.value)}
      />

      <TextField
        size="small"
        fullWidth
        label="Notas para el lote (opcional)"
        multiline
        minRows={2}
        value={contexto.notas_lote || ''}
        onChange={(e) => handleChange('notas_lote', e.target.value)}
        helperText="Se agregan a la observación detectada para ayudar al contexto."
      />
    </Stack>
  );
};

PreguntasContextoStep.propTypes = {
  contexto: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  proyectos: PropTypes.arrayOf(PropTypes.object).isRequired,
  files: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default PreguntasContextoStep;
