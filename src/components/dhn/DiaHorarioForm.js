import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Collapse,
  Divider,
  FormControl,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { TIPO_META, TIPOS_HORA } from 'src/utils/dhn/tiposHora';
import {
  DIA_LABEL,
  FRACCIONES_VALIDAS,
  TIPOS_DIA_SIMPLE,
  TIPOS_HORA_EXTRA,
  cloneDia,
  validarDia,
} from 'src/utils/dhn/configHorarios';
import TurnoVariantesEditor from './TurnoVariantesEditor';
import TramosEditor from './TramosEditor';
import FranjaNocturnaEditor from './FranjaNocturnaEditor';

const DiaHorarioForm = ({ diaKey, value, onChange, otrosDias }) => {
  const [avanzadoAbierto, setAvanzadoAbierto] = useState(false);
  const [copyAnchor, setCopyAnchor] = useState(null);

  const errores = useMemo(() => validarDia(value), [value]);

  const setCampo = useCallback(
    (campo, v) => {
      onChange({ ...value, [campo]: v });
    },
    [value, onChange],
  );

  const tipoDiaSimple = useMemo(() => {
    if (!Array.isArray(value?.tramos)) return null;
    if (value.tramos.length !== 1) return 'mixto';
    return value.tramos[0]?.tipo || null;
  }, [value]);

  const handleTipoDiaSimpleChange = useCallback(
    (nuevoTipo) => {
      onChange({
        ...value,
        tramos: [{ desde: '00:00', hasta: '24:00', tipo: nuevoTipo }],
      });
    },
    [value, onChange],
  );

  const handleCopy = useCallback(
    (origenKey) => {
      const origen = otrosDias?.[origenKey];
      if (!origen) return;
      const copia = cloneDia(origen);
      onChange(copia);
      setCopyAnchor(null);
    },
    [otrosDias, onChange],
  );

  if (!value) return null;

  return (
    <Box>
      {/* Modo Simple */}
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ sm: 'flex-end' }}
          sx={{ flexWrap: 'wrap' }}
        >
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Tipo de hora del día</InputLabel>
            <Select
              label="Tipo de hora del día"
              value={tipoDiaSimple || ''}
              onChange={(e) => handleTipoDiaSimpleChange(e.target.value)}
              disabled={tipoDiaSimple === 'mixto'}
            >
              {tipoDiaSimple === 'mixto' ? (
                <MenuItem value="mixto" disabled>
                  Mixto (ver Avanzado)
                </MenuItem>
              ) : null}
              {TIPOS_DIA_SIMPLE.map((tipo) => (
                <MenuItem key={tipo} value={tipo}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: TIPO_META[tipo]?.color,
                      }}
                    />
                    <span>{TIPO_META[tipo]?.label || tipo}</span>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Tipo de hora extra</InputLabel>
            <Select
              label="Tipo de hora extra"
              value={value.horaExtra || TIPOS_HORA.EXTRA_50}
              onChange={(e) => setCampo('horaExtra', e.target.value)}
            >
              {TIPOS_HORA_EXTRA.map((tipo) => (
                <MenuItem key={tipo} value={tipo}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: TIPO_META[tipo]?.color,
                      }}
                    />
                    <span>{TIPO_META[tipo]?.label || tipo}</span>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ width: 180 }}>
            <InputLabel>Fracción de redondeo</InputLabel>
            <Select
              label="Fracción de redondeo"
              value={FRACCIONES_VALIDAS.includes(value.fraccion) ? value.fraccion : 'custom'}
              onChange={(e) => {
                if (e.target.value === 'custom') return;
                setCampo('fraccion', Number(e.target.value));
              }}
            >
              {FRACCIONES_VALIDAS.map((m) => (
                <MenuItem key={m} value={m}>
                  {m} min ({Math.round((m / 60) * 100) / 100}h)
                </MenuItem>
              ))}
              {!FRACCIONES_VALIDAS.includes(value.fraccion) ? (
                <MenuItem value="custom">{value.fraccion} min (custom)</MenuItem>
              ) : null}
            </Select>
          </FormControl>
        </Stack>

        <Divider flexItem />

        <TurnoVariantesEditor
          label="Turno diurno"
          helper="Horario nominal de entrada/salida. Hasta 2 variantes."
          variantes={value.turnoDiurno}
          onChange={(v) => setCampo('turnoDiurno', v)}
        />

        <TurnoVariantesEditor
          label="Turno noche"
          helper="Horario nominal nocturno (la salida cruza al día siguiente). Hasta 2 variantes."
          variantes={value.turnoNoche}
          onChange={(v) => setCampo('turnoNoche', v)}
        />

        {/* Avanzado: tramos + franja nocturna */}
        <Box>
          <Button
            onClick={() => setAvanzadoAbierto((v) => !v)}
            startIcon={avanzadoAbierto ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            size="small"
            sx={{ textTransform: 'none' }}
          >
            {avanzadoAbierto ? 'Ocultar' : 'Mostrar'} configuración avanzada (tramos + franja nocturna)
          </Button>
          <Collapse in={avanzadoAbierto || tipoDiaSimple === 'mixto'} unmountOnExit>
            <Stack spacing={3} sx={{ mt: 2, pl: 1, borderLeft: 2, borderColor: 'divider' }}>
              <TramosEditor
                tramos={value.tramos}
                onChange={(v) => setCampo('tramos', v)}
              />
              <FranjaNocturnaEditor
                franjas={value.franjaNocturna}
                onChange={(v) => setCampo('franjaNocturna', v)}
              />
            </Stack>
          </Collapse>
        </Box>

        {/* Errores */}
        {errores.length > 0 ? (
          <Alert severity="warning" variant="outlined">
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Revisá la configuración:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              {errores.map((e, i) => (
                <li key={i}>
                  <Typography variant="caption">{e}</Typography>
                </li>
              ))}
            </Box>
          </Alert>
        ) : null}

        {/* Copiar de... */}
        <Stack direction="row" justifyContent="flex-end">
          <Button
            size="small"
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={(e) => setCopyAnchor(e.currentTarget)}
            sx={{ textTransform: 'none' }}
          >
            Copiar configuración de otro día
          </Button>
          <Menu anchorEl={copyAnchor} open={Boolean(copyAnchor)} onClose={() => setCopyAnchor(null)}>
            {Object.entries(otrosDias || {})
              .filter(([k]) => k !== diaKey)
              .map(([k]) => (
                <MenuItem key={k} onClick={() => handleCopy(k)}>
                  Copiar de {DIA_LABEL[k] || k}
                </MenuItem>
              ))}
          </Menu>
        </Stack>
      </Stack>
    </Box>
  );
};

export default DiaHorarioForm;
