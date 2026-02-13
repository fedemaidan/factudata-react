import { useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Box,
  Container,
  Stack,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Divider,
  Chip,
  TableContainer
} from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import bejermanService from 'src/services/bejermanService';

const CatalogosBejermanPage = () => {
  const { user } = useAuthContext();
  const empresaId = useMemo(() => user?.empresa?.id, [user]);

  const [modulo, setModulo] = useState('INTE');
  const [vista, setVista] = useState('');
  const [filtros, setFiltros] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);

  const parseDatos = (datosJson) => {
    if (!datosJson) return null;
    try {
      let parsed = JSON.parse(datosJson);
      // Bejerman a veces devuelve string con doble escape: "[{...}]"
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      return parsed;
    } catch (err) {
      return datosJson;
    }
  };

  const handleConsultar = async () => {
    if (!empresaId) return;
    const moduloValue = modulo.trim();
    const vistaValue = vista.trim();
    const filtrosValue = filtros.trim();

    if (!moduloValue || !vistaValue) {
      setError('Completá Módulo y Vista.');
      return;
    }
    setError('');
    setLoading(true);
    setResultado(null);

    // Formato confirmado por Bejerman: ["MODULO", "Vista", "[{Campo,Valor}]"]
    const parametrosJson = filtrosValue
      ? [moduloValue, vistaValue, filtrosValue]
      : [moduloValue, vistaValue];

    try {
      const response = await bejermanService.query({
        empresaId,
        circuito: 'QUERIES',
        operacion: 'ObtenerJsonQueryVista',
        parametrosJson
      });
      const parsed = parseDatos(response?.datosJson);
      setResultado({
        raw: response,
        parsed
      });
    } catch (err) {
      const apiError = err?.response?.data;
      const detalle = apiError?.details?.soapFault || apiError?.details?.status;
      setError(apiError?.error || err?.message || 'Error consultando');
      if (detalle) {
        setResultado({ raw: apiError?.details, parsed: apiError?.details?.soapFault || apiError?.details });
      }
    } finally {
      setLoading(false);
    }
  };

  const renderTable = (data) => {
    if (!Array.isArray(data) || data.length === 0) return null;
    const columns = Object.keys(data[0] || {});
    return (
      <TableContainer sx={{ maxHeight: 500 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col} sx={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}>{col}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.slice(0, 100).map((row, idx) => (
              <TableRow key={idx}>
                {columns.map((col) => (
                  <TableCell key={col} sx={{ whiteSpace: 'nowrap' }}>{String(row?.[col] ?? '')}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <>
      <Head>
        <title>Bejerman - Catálogos</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="lg">
          <Stack spacing={3}>
            <Typography variant="h4">Bejerman | Catálogos</Typography>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Typography variant="subtitle1">
                  Consulta QUERIES (ObtenerJsonQueryVista)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Formato: Módulo (ej: INTE), Vista (ej: Bitrix24/Productos) y opcionalmente Filtro JSON [{'"'}Campo{'"'}:{'"'}SKU{'"'},{'"'}Valor{'"'}:{'"'}123{'"'}].
                </Typography>

                <TextField
                  label="Módulo"
                  placeholder="Ej: INTE"
                  value={modulo}
                  onChange={(e) => setModulo(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Vista"
                  placeholder="Ej: Bitrix24/Productos"
                  value={vista}
                  onChange={(e) => setVista(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Filtro JSON (opcional)"
                  placeholder='Ej: [{"Campo":"SKU","Valor":"024202"}]'
                  value={filtros}
                  onChange={(e) => setFiltros(e.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                />

                <Stack direction="row" spacing={2}>
                  <Button variant="contained" onClick={handleConsultar} disabled={loading}>
                    {loading ? 'Consultando...' : 'Consultar'}
                  </Button>
                  <Button variant="outlined" onClick={() => { setResultado(null); setError(''); setVista(''); setFiltros(''); }}>
                    Limpiar
                  </Button>
                </Stack>

                <Divider />
                <Typography variant="caption" color="text.secondary">Vistas rápidas (click para cargar):</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {[
                    { label: 'Productos', vista: 'Bitrix24/Productos', filtro: '' },
                    { label: 'Productos (SKU)', vista: 'Bitrix24/Productos', filtro: '[{"Campo":"SKU","Valor":"024202"}]' },
                    { label: 'Clientes', vista: 'Bitrix24/Clientes', filtro: '' },
                    { label: 'Proveedores', vista: 'Bitrix24/Proveedores', filtro: '' },
                    { label: 'Bancos', vista: 'Bitrix24/Bancos', filtro: '' },
                    { label: 'Cuentas Bancarias', vista: 'Bitrix24/CuentasBancarias', filtro: '' },
                    { label: 'Cajas', vista: 'Bitrix24/Cajas', filtro: '' },
                    { label: 'Mov. Fondos', vista: 'Bitrix24/TiposMovFondos', filtro: '' },
                    { label: 'Monedas', vista: 'Bitrix24/Monedas', filtro: '' },
                  ].map((v) => (
                    <Chip
                      key={v.label}
                      label={v.label}
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setModulo('INTE');
                        setVista(v.vista);
                        setFiltros(v.filtro);
                        setResultado(null);
                        setError('');
                      }}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Stack>

                {error && <Alert severity="error">{error}</Alert>}
              </Stack>
            </Paper>

            {resultado && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <Typography variant="h6">Resultado</Typography>
                  <Divider />
                  {renderTable(resultado.parsed)}
                  {!Array.isArray(resultado.parsed) && (
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                      {typeof resultado.parsed === 'string'
                        ? resultado.parsed
                        : JSON.stringify(resultado.parsed, null, 2)}
                    </pre>
                  )}
                  {!resultado.parsed && (
                    <Alert severity="warning">
                      La respuesta no trae DatosJSON. Revisá Resultado y ErrorMsg en el detalle.
                    </Alert>
                  )}
                  <Divider />
                  <Typography variant="subtitle2">Detalle respuesta</Typography>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                    {JSON.stringify(resultado.raw, null, 2)}
                  </pre>
                </Stack>
              </Paper>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
};

CatalogosBejermanPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default CatalogosBejermanPage;
