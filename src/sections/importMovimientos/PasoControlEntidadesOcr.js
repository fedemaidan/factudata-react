import React, { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { buscarCanonicoEnLista, normalizarNombre } from 'src/utils/normalizarNombre';

const ENTIDADES_EXCLUIDAS_CATEGORIA = new Set(['ingreso dinero', 'ajuste']);
const ENTIDADES_EXCLUIDAS_PROVEEDOR = new Set(['ajuste']);

function buildFilas(items, getValor, catalogo, getNombreCatalogo, excluidas) {
  const detectados = new Map(); // norm -> { detectado original, count }
  for (const it of items) {
    if (it.omitido) continue;
    const valor = getValor(it);
    if (!valor || typeof valor !== 'string') continue;
    const norm = normalizarNombre(valor);
    if (!norm || excluidas.has(norm)) continue;
    if (!detectados.has(norm)) {
      detectados.set(norm, { detectado: valor, count: 1 });
    } else {
      detectados.get(norm).count += 1;
    }
  }
  return Array.from(detectados.entries()).map(([norm, info]) => {
    const match = buscarCanonicoEnLista(info.detectado, catalogo, getNombreCatalogo);
    return {
      detectadoNorm: norm,
      detectado: info.detectado,
      ocurrencias: info.count,
      estado: match.estado,
      coincidencia: match.canonico,
      accion: match.estado === 'nueva' ? 'crear_nueva' : 'usar_existente',
    };
  });
}

function FilaTabla({ fila, onAccionChange }) {
  const chipColor = fila.estado === 'nueva' ? 'warning' : fila.estado === 'variante' ? 'info' : 'success';
  const chipLabel =
    fila.estado === 'variante'
      ? `Variante de "${fila.coincidencia}"`
      : fila.estado === 'nueva'
        ? 'No existe'
        : 'Coincide exacto';

  const opciones =
    fila.estado === 'nueva'
      ? [{ value: 'crear_nueva', label: '✨ Crear nueva' }]
      : [
          { value: 'usar_existente', label: `✓ Usar "${fila.coincidencia}"` },
          { value: 'crear_nueva', label: `✨ Crear como "${fila.detectado}"` },
        ];

  return (
    <TableRow>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {fila.detectado}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {fila.ocurrencias} comprobante(s)
        </Typography>
      </TableCell>
      <TableCell>
        <Chip label={chipLabel} color={chipColor} size="small" />
      </TableCell>
      <TableCell>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <Select
            value={fila.accion}
            onChange={(e) => onAccionChange(fila.detectadoNorm, e.target.value)}
          >
            {opciones.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </TableCell>
    </TableRow>
  );
}

const PasoControlEntidadesOcr = forwardRef(
  (
    {
      batchItems,
      setBatchItems,
      empresaCategorias = [],
      proveedoresCatalogo = [],
    },
    ref,
  ) => {
    const filasIniciales = useMemo(() => {
      const cats = buildFilas(
        batchItems,
        (it) => it.form?.categoria,
        empresaCategorias,
        (c) => (typeof c === 'string' ? c : c?.name || ''),
        ENTIDADES_EXCLUIDAS_CATEGORIA,
      );
      const provs = buildFilas(
        batchItems,
        (it) => it.form?.nombre_proveedor,
        proveedoresCatalogo,
        (p) => (typeof p === 'string' ? p : p?.nombre || p?.name || ''),
        ENTIDADES_EXCLUIDAS_PROVEEDOR,
      );
      return { cats, provs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [filasCategorias, setFilasCategorias] = useState(filasIniciales.cats);
    const [filasProveedores, setFilasProveedores] = useState(filasIniciales.provs);

    const onAccionCategoria = (norm, accion) => {
      setFilasCategorias((prev) => prev.map((f) => (f.detectadoNorm === norm ? { ...f, accion } : f)));
    };
    const onAccionProveedor = (norm, accion) => {
      setFilasProveedores((prev) => prev.map((f) => (f.detectadoNorm === norm ? { ...f, accion } : f)));
    };

    useImperativeHandle(
      ref,
      () => ({
        submitStep: async () => {
          const mapeoCat = new Map();
          filasCategorias.forEach((f) => {
            const final = f.accion === 'usar_existente' && f.coincidencia ? f.coincidencia : f.detectado;
            mapeoCat.set(f.detectadoNorm, final);
          });
          const mapeoProv = new Map();
          filasProveedores.forEach((f) => {
            const final = f.accion === 'usar_existente' && f.coincidencia ? f.coincidencia : f.detectado;
            mapeoProv.set(f.detectadoNorm, final);
          });

          setBatchItems((prev) =>
            prev.map((it) => {
              if (it.omitido) return it;
              const cat = it.form?.categoria;
              const prov = it.form?.nombre_proveedor;
              const catFinal = cat ? mapeoCat.get(normalizarNombre(cat)) || cat : cat;
              const provFinal = prov ? mapeoProv.get(normalizarNombre(prov)) || prov : prov;
              if (catFinal === cat && provFinal === prov) return it;
              return {
                ...it,
                form: { ...it.form, categoria: catFinal, nombre_proveedor: provFinal },
              };
            }),
          );
        },
      }),
      [filasCategorias, filasProveedores, setBatchItems],
    );

    const variantesCat = filasCategorias.filter((f) => f.estado === 'variante').length;
    const variantesProv = filasProveedores.filter((f) => f.estado === 'variante').length;
    const totalFilas = filasCategorias.length + filasProveedores.length;

    return (
      <Stack spacing={3}>
        <Alert severity={variantesCat + variantesProv > 0 ? 'info' : 'success'}>
          {totalFilas === 0
            ? 'No se detectaron categorías ni proveedores nuevos en este lote.'
            : variantesCat + variantesProv > 0
              ? `Detectamos ${variantesCat + variantesProv} variante(s) de entidades existentes (case/acentos/espacios). Revisá si querés mapearlas o crearlas como nuevas.`
              : 'Revisá las categorías y proveedores detectados antes de continuar.'}
        </Alert>

        {filasCategorias.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Categorías detectadas
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Detectada</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Acción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filasCategorias.map((f) => (
                      <FilaTabla key={f.detectadoNorm} fila={f} onAccionChange={onAccionCategoria} />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {filasProveedores.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Proveedores detectados
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Detectado</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Acción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filasProveedores.map((f) => (
                      <FilaTabla key={f.detectadoNorm} fila={f} onAccionChange={onAccionProveedor} />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {totalFilas === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Continuá al siguiente paso para validar los comprobantes uno por uno.
            </Typography>
          </Box>
        )}
      </Stack>
    );
  },
);

PasoControlEntidadesOcr.displayName = 'PasoControlEntidadesOcr';

export default PasoControlEntidadesOcr;
