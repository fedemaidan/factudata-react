import PropTypes from 'prop-types';
import {
  Box,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { PREGUNTA_VALOR_OTRO } from '../cargaMasivaPreguntasUtils';

/**
 * Proyecto obligatorio arriba, opcionalmente preguntas GPT, y campos fijos del lote
 * (misma fuente de categorías que movementForm: categorias[].name).
 */
function PreguntasContextoStep({
  contexto,
  onChange,
  proyectos,
  files,
  categorias,
  mediosPago,
  preguntasGpt,
  respuestasGpt,
  onRespuestasChange,
}) {
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

  const handleSeleccion = (qid, value) => {
    onRespuestasChange(qid, {
      seleccion: value,
      ...(value !== PREGUNTA_VALOR_OTRO ? { otro: '' } : {}),
    });
  };

  const nombresCategorias = (categorias || []).map((c) => c?.name).filter(Boolean);
  const listaMedios = Array.isArray(mediosPago) && mediosPago.length > 0 ? mediosPago : [];

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        El proyecto por defecto y los datos fijos enriquecen el contexto del OCR para todo el lote. Las preguntas
        adicionales solo aparecen cuando hace falta. Podés corregir por comprobante en el paso siguiente.
      </Typography>

      {(pdfCount > 0 || imgCount > 0) && (
        <Alert severity="info">
          Lote: {imgCount} imagen(es), {pdfCount} PDF.
          {files.length > 20 && ' Volúmenes grandes pueden tardar varios minutos en analizarse.'}
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

      {Array.isArray(preguntasGpt) && preguntasGpt.length === 0 && (
        <Alert severity="success">
          No se generaron preguntas extra: el modelo no detectó dudas que no estén ya cubiertas por este formulario.
        </Alert>
      )}

      {Array.isArray(preguntasGpt) &&
        preguntasGpt.map((q) => {
          const r = respuestasGpt[q.id] || {};
          const showOtroField = r.seleccion === PREGUNTA_VALOR_OTRO;
          return (
            <FormControl key={q.id} component="fieldset" variant="standard" fullWidth sx={{ mt: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                {q.texto}
              </Typography>
              <RadioGroup
                value={r.seleccion || ''}
                onChange={(e) => handleSeleccion(q.id, e.target.value)}
              >
                {(q.opciones || []).map((op) => (
                  <FormControlLabel
                    key={op.id}
                    value={op.id}
                    control={<Radio size="small" />}
                    label={op.etiqueta}
                  />
                ))}
                <FormControlLabel
                  value={PREGUNTA_VALOR_OTRO}
                  control={<Radio size="small" />}
                  label="Otro / especificar"
                />
              </RadioGroup>
              {showOtroField && (
                <TextField
                  size="small"
                  fullWidth
                  sx={{ mt: 1 }}
                  label="Detalle (obligatorio si elegiste Otro)"
                  multiline
                  minRows={2}
                  value={r.otro || ''}
                  onChange={(e) => onRespuestasChange(q.id, { otro: e.target.value })}
                  required
                />
              )}
            </FormControl>
          );
        })}

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

      <FormControl fullWidth size="small">
        <InputLabel id="cm-cat-candidatas">Categorías candidatas (opcional)</InputLabel>
        <Select
          labelId="cm-cat-candidatas"
          multiple
          value={Array.isArray(contexto.default_categorias) ? contexto.default_categorias : []}
          onChange={(e) => handleChange('default_categorias', e.target.value)}
          input={<OutlinedInput label="Categorías candidatas (opcional)" />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => (
                <Chip key={value} label={value} size="small" />
              ))}
            </Box>
          )}
        >
          {nombresCategorias.map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </Select>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Misma lista que en nuevo movimiento. Si elegís una sola, se usa como categoría por defecto; si varias, se
          envían como pistas al OCR.
        </Typography>
      </FormControl>

      <FormControl fullWidth size="small">
        <InputLabel id="cm-medios-candidatos">Medios de pago candidatos (opcional)</InputLabel>
        <Select
          labelId="cm-medios-candidatos"
          multiple
          value={Array.isArray(contexto.default_medios_pago) ? contexto.default_medios_pago : []}
          onChange={(e) => handleChange('default_medios_pago', e.target.value)}
          input={<OutlinedInput label="Medios de pago candidatos (opcional)" />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => (
                <Chip key={value} label={value} size="small" />
              ))}
            </Box>
          )}
        >
          {listaMedios.map((m) => (
            <MenuItem key={m} value={m}>
              {m}
            </MenuItem>
          ))}
        </Select>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Si elegís uno solo, se usa como medio por defecto; si varios, se envían como pistas al OCR.
        </Typography>
      </FormControl>

      <TextField
        size="small"
        fullWidth
        label="Notas para el lote (opcional)"
        multiline
        minRows={2}
        value={contexto.notas_lote || ''}
        onChange={(e) => handleChange('notas_lote', e.target.value)}
        helperText="Se agregan al contexto del lote."
      />
    </Stack>
  );
}

PreguntasContextoStep.propTypes = {
  contexto: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  proyectos: PropTypes.arrayOf(PropTypes.object).isRequired,
  files: PropTypes.arrayOf(PropTypes.object).isRequired,
  categorias: PropTypes.arrayOf(PropTypes.object),
  mediosPago: PropTypes.arrayOf(PropTypes.string),
  preguntasGpt: PropTypes.arrayOf(PropTypes.object),
  respuestasGpt: PropTypes.object,
  onRespuestasChange: PropTypes.func.isRequired,
};

PreguntasContextoStep.defaultProps = {
  categorias: [],
  mediosPago: [],
  preguntasGpt: [],
  respuestasGpt: {},
};

export default PreguntasContextoStep;
