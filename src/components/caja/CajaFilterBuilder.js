import React from 'react';
import {
  Box, Stack, Select, MenuItem, FormControl, TextField, IconButton, Button,
  Typography, Autocomplete, InputAdornment, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AddIcon from '@mui/icons-material/Add';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import {
  CAMPOS, getCampoMeta, getOperadores, getOperadorMeta, PRESETS_RELATIVOS,
} from 'src/utils/cajaFiltros';

/**
 * Constructor de filtros de caja estilo Notion (TAR-633).
 * Controlado: `value` = { match, condiciones }, `onChange(nuevoValue)`.
 * `options` = options del backend (categorias, mediosPago, asignados, ...).
 */

const opcionesDeCampo = (campoKey, options, empresa) => {
  const meta = getCampoMeta(campoKey);
  if (!meta) return [];
  if (Array.isArray(meta.opciones)) return meta.opciones;
  const fromBackend = options?.[meta.optionsKey];
  if (Array.isArray(fromBackend) && fromBackend.length > 0) return fromBackend;
  // Fallbacks desde la empresa cuando el backend todavía no trajo options.
  if (campoKey === 'categoria') {
    return (Array.isArray(empresa?.categorias) ? empresa.categorias : [])
      .map((c) => (typeof c === 'string' ? c : c?.name)).filter(Boolean);
  }
  if (campoKey === 'medio_pago') return Array.isArray(empresa?.medios_pago) ? empresa.medios_pago : [];
  if (campoKey === 'asignado') return (Array.isArray(empresa?.asignados) ? empresa.asignados : []).filter(Boolean);
  return [];
};

// Operador por defecto al elegir un campo (o al cambiar de tipo).
const operadorDefault = (tipo) => (getOperadores(tipo)[0]?.key || '');

const condicionVaciaPara = (campoKey) => {
  const meta = getCampoMeta(campoKey);
  const operador = operadorDefault(meta?.tipo);
  const base = { campo: campoKey, operador };
  if (meta?.tipo === 'select') base.valores = [];
  if (meta?.tipo === 'date' && operador === 'relativa') base.valor = 'este_mes';
  return base;
};

const CajaFilterBuilder = ({ value, onChange, options, empresa }) => {
  const match = value?.match === 'any' ? 'any' : 'all';
  const condiciones = Array.isArray(value?.condiciones) ? value.condiciones : [];

  const camposDisponibles = React.useMemo(
    () => CAMPOS.filter((c) => !c.soloSiConEstados || empresa?.con_estados),
    [empresa?.con_estados],
  );

  const emit = (next) => onChange?.({ match, condiciones, ...next });
  const setMatch = (m) => { if (m) emit({ match: m }); };
  const setCondiciones = (arr) => emit({ condiciones: arr });

  const actualizar = (idx, patch) => setCondiciones(
    condiciones.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
  );
  const quitar = (idx) => setCondiciones(condiciones.filter((_, i) => i !== idx));
  const agregar = () => setCondiciones([...condiciones, condicionVaciaPara(camposDisponibles[0]?.key || 'categoria')]);

  const cambiarCampo = (idx, campoKey) => actualizar(idx, condicionVaciaPara(campoKey));

  const cambiarOperador = (idx, operador) => {
    const cond = condiciones[idx];
    const meta = getCampoMeta(cond.campo);
    const patch = { operador, valor: null, valorHasta: null, cantidad: null };
    if (meta?.tipo === 'select') patch.valores = cond.valores || [];
    if (meta?.tipo === 'date' && operador === 'relativa') patch.valor = 'este_mes';
    actualizar(idx, patch);
  };

  const vacio = condiciones.length === 0;

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1.25}
        alignItems="center"
        sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' }, rowGap: 0.5 }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
          Mostrar los movimientos que cumplan
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={match}
          onChange={(_, m) => setMatch(m)}
          sx={{
            '& .MuiToggleButton-root': {
              textTransform: 'none',
              fontWeight: 700,
              px: 1.5,
              py: 0.35,
              borderColor: 'neutral.300',
              color: 'text.secondary',
            },
            '& .Mui-selected': {
              bgcolor: 'primary.main !important',
              color: 'primary.contrastText !important',
              borderColor: 'primary.main !important',
            },
          }}
        >
          <ToggleButton value="all">Todos</ToggleButton>
          <ToggleButton value="any">Cualquiera</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
          de estos filtros
        </Typography>
      </Stack>

      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, mb: 1.5 }}>
        {match === 'any'
          ? 'Con que se cumpla al menos una condición, el movimiento entra.'
          : 'El movimiento entra solo si cumple todas las condiciones.'}
      </Typography>

      {vacio ? (
        <Box
          sx={{
            border: '1px dashed',
            borderColor: 'neutral.300',
            borderRadius: 2,
            px: 2,
            py: 2.5,
            textAlign: 'center',
          }}
        >
          <FilterAltOutlinedIcon sx={{ color: 'neutral.400', fontSize: 28, mb: 0.5 }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Esta caja incluye todos los movimientos</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Agregá una condición para acotar qué entra.
          </Typography>
          <Button onClick={agregar} startIcon={<AddIcon />} variant="outlined" size="small" sx={{ textTransform: 'none', fontWeight: 700 }}>
            Agregar filtro
          </Button>
        </Box>
      ) : (
        <>
          <Stack spacing={1}>
            {condiciones.map((cond, idx) => (
              <FilaCondicion
                // eslint-disable-next-line react/no-array-index-key
                key={idx}
                cond={cond}
                campos={camposDisponibles}
                options={options}
                empresa={empresa}
                onCampo={(c) => cambiarCampo(idx, c)}
                onOperador={(o) => cambiarOperador(idx, o)}
                onPatch={(p) => actualizar(idx, p)}
                onQuitar={() => quitar(idx)}
              />
            ))}
          </Stack>

          <Button
            onClick={agregar}
            startIcon={<AddIcon />}
            fullWidth
            sx={{
              mt: 1,
              textTransform: 'none',
              fontWeight: 700,
              justifyContent: 'center',
              border: '1px dashed',
              borderColor: 'neutral.300',
              color: 'text.secondary',
              '&:hover': { borderColor: 'primary.main', color: 'primary.main', bgcolor: 'primary.alpha4' },
            }}
          >
            Agregar filtro
          </Button>
        </>
      )}
    </Box>
  );
};

const FilaCondicion = ({ cond, campos, options, empresa, onCampo, onOperador, onPatch, onQuitar }) => {
  const meta = getCampoMeta(cond.campo);
  const tipo = meta?.tipo;
  const operadores = getOperadores(tipo);
  const opMeta = getOperadorMeta(tipo, cond.operador);

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
        '&:hover .fila-quitar': { opacity: 1 },
      }}
    >
      <FormControl size="small" sx={{ flex: { xs: '1 1 100%', sm: '0 0 150px' }, minWidth: 0 }}>
        <Select value={cond.campo} onChange={(e) => onCampo(e.target.value)}>
          {campos.map((c) => <MenuItem key={c.key} value={c.key}>{c.label}</MenuItem>)}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ flex: { xs: '1 1 100%', sm: '0 0 132px' }, minWidth: 0 }}>
        <Select value={cond.operador} onChange={(e) => onOperador(e.target.value)}>
          {operadores.map((o) => <MenuItem key={o.key} value={o.key}>{o.label}</MenuItem>)}
        </Select>
      </FormControl>

      <Box sx={{ flex: '1 1 auto', minWidth: 0, width: '100%' }}>
        <ValorCondicion cond={cond} meta={meta} opMeta={opMeta} options={options} empresa={empresa} onPatch={onPatch} />
      </Box>

      <IconButton
        className="fila-quitar"
        size="small"
        onClick={onQuitar}
        aria-label="Quitar filtro"
        sx={{
          flex: '0 0 auto',
          opacity: { xs: 1, sm: 0.35 },
          transition: 'opacity .15s, color .15s',
          '&:hover': { color: 'error.main', bgcolor: 'error.alpha8' },
        }}
      >
        <CloseRoundedIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
};

const ValorCondicion = ({ cond, meta, opMeta, options, empresa, onPatch }) => {
  if (!meta || !opMeta || opMeta.sinValor) {
    return <Box sx={{ height: 40 }} />;
  }

  if (meta.tipo === 'select') {
    const opciones = opcionesDeCampo(meta.key, options, empresa);
    const valores = Array.isArray(cond.valores) ? cond.valores : [];
    return (
      <Autocomplete
        multiple
        size="small"
        limitTags={2}
        disableCloseOnSelect
        options={opciones}
        value={valores}
        onChange={(_, v) => onPatch({ valores: v })}
        ChipProps={{ size: 'small' }}
        renderInput={(params) => (
          <TextField {...params} placeholder={valores.length === 0 ? 'Elegí uno o varios' : undefined} />
        )}
      />
    );
  }

  if (meta.tipo === 'number') {
    const adorno = { startAdornment: <InputAdornment position="start">$</InputAdornment> };
    if (opMeta.rango) {
      return (
        <Stack direction="row" spacing={1}>
          <TextField
            size="small" type="number" placeholder="Desde" fullWidth InputProps={adorno}
            value={cond.valor ?? ''}
            onChange={(e) => onPatch({ valor: e.target.value === '' ? null : Number(e.target.value) })}
          />
          <TextField
            size="small" type="number" placeholder="Hasta" fullWidth InputProps={adorno}
            value={cond.valorHasta ?? ''}
            onChange={(e) => onPatch({ valorHasta: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </Stack>
      );
    }
    return (
      <TextField
        size="small" type="number" fullWidth placeholder="Monto" InputProps={adorno}
        value={cond.valor ?? ''}
        onChange={(e) => onPatch({ valor: e.target.value === '' ? null : Number(e.target.value) })}
      />
    );
  }

  if (meta.tipo === 'date') {
    if (cond.operador === 'relativa') {
      return (
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
            <Select value={cond.valor || 'este_mes'} onChange={(e) => onPatch({ valor: e.target.value })}>
              {PRESETS_RELATIVOS.map((p) => <MenuItem key={p.key} value={p.key}>{p.label}</MenuItem>)}
            </Select>
          </FormControl>
          {cond.valor === 'ultimos_n_dias' && (
            <TextField
              size="small" type="number" sx={{ width: 120, flex: '0 0 auto' }}
              value={cond.cantidad ?? 7}
              onChange={(e) => onPatch({ cantidad: Math.max(1, Number(e.target.value) || 1) })}
              InputProps={{ endAdornment: <InputAdornment position="end">días</InputAdornment> }}
            />
          )}
        </Stack>
      );
    }
    return (
      <Stack direction="row" spacing={1}>
        <TextField
          size="small" type="date" fullWidth label="Desde" InputLabelProps={{ shrink: true }}
          value={cond.valor || ''}
          onChange={(e) => onPatch({ valor: e.target.value || null })}
        />
        <TextField
          size="small" type="date" fullWidth label="Hasta" InputLabelProps={{ shrink: true }}
          value={cond.valorHasta || ''}
          onChange={(e) => onPatch({ valorHasta: e.target.value || null })}
        />
      </Stack>
    );
  }

  return null;
};

export default CajaFilterBuilder;
