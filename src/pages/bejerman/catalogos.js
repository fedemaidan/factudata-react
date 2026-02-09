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
  Divider
} from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import bejermanService from 'src/services/bejermanService';

const CatalogosBejermanPage = () => {
  const { user } = useAuthContext();
  const empresaId = useMemo(() => user?.empresa?.id, [user]);

  const [vista, setVista] = useState('');
  const [campos, setCampos] = useState('');
  const [filtros, setFiltros] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);

  const parseDatos = (datosJson) => {
    if (!datosJson) return null;
    try {
      return JSON.parse(datosJson);
    } catch (err) {
      return datosJson;
    }
  };

  const handleConsultar = async () => {
    if (!empresaId) return;
    if (!vista || !campos) {
      setError('Completá Vista y Campos.');
      return;
    }
    setError('');
    setLoading(true);
    setResultado(null);

    const parametrosJson = filtros
      ? [vista, campos, filtros]
      : [vista, campos];

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
    const columns = Object.keys(data[0] || {}).slice(0, 12);
    return (
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col}>{col}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.slice(0, 50).map((row, idx) => (
            <TableRow key={idx}>
              {columns.map((col) => (
                <TableCell key={col}>{String(row?.[col] ?? '')}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
                  Ingresá la Vista, los Campos y opcionalmente el Filtro. Esto trae los códigos desde Bejerman sin ejecutar el .exe.
                </Typography>

                <TextField
                  label="Vista"
                  placeholder="Ej: VW_MOV_FONDOS"
                  value={vista}
                  onChange={(e) => setVista(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Campos"
                  placeholder="Ej: CODIGO,DESCRIPCION"
                  value={campos}
                  onChange={(e) => setCampos(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Filtro (opcional)"
                  placeholder="Ej: ACTIVO=1"
                  value={filtros}
                  onChange={(e) => setFiltros(e.target.value)}
                  fullWidth
                />

                <Stack direction="row" spacing={2}>
                  <Button variant="contained" onClick={handleConsultar} disabled={loading}>
                    {loading ? 'Consultando...' : 'Consultar'}
                  </Button>
                  <Button variant="outlined" onClick={() => { setResultado(null); setError(''); }}>
                    Limpiar
                  </Button>
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
