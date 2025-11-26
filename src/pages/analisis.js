import { useEffect, useState } from 'react';
import Head from 'next/head';
import { 
  Box, 
  Container, 
  Stack, 
  Typography, 
  TextField, 
  Button, 
  Grid,
  CardContent,
  Card,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Chip,
  Tabs,
  Tab,
  IconButton,
  TableSortLabel
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { fetchAnalisis, exportConversacion } from 'src/services/analisisService';
import { format } from 'date-fns';

const getScoreColor = (score) => {
  if (score >= 80) return 'success';
  if (score >= 50) return 'warning';
  return 'error';
};

function descendingComparator(a, b, orderBy) {
  const getVal = (obj, path) => {
      if (path === 'correcciones') {
          return (obj.metricas?.correcciones_caja || 0) + (obj.metricas?.correcciones_acopio || 0);
      }
      return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };
  
  let bVal = getVal(b, orderBy);
  let aVal = getVal(a, orderBy);

  if (bVal < aVal) {
    return -1;
  }
  if (bVal > aVal) {
    return 1;
  }
  return 0;
}

function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function applySort(array, comparator) {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

const AnalisisRow = ({ row, handleDownload }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <TableRow hover>
      <TableCell>
        {row.rango_analisis?.inicio ? format(new Date(row.rango_analisis.inicio), 'dd/MM/yyyy') : '-'}
      </TableCell>
      <TableCell sx={{ maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <Typography variant="subtitle2" noWrap>
          {row.empresa?.nombre || 'Sin nombre'}
        </Typography>
        <Typography variant="caption" color="textSecondary" noWrap display="block">
          {row.empresa?.id}
        </Typography>
      </TableCell>
      <TableCell sx={{ maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <Typography variant="body2" noWrap>
          {row.usuario?.nombre || 'Desconocido'}
        </Typography>
        <Typography variant="caption" color="textSecondary" noWrap display="block">
          {row.usuario?.telefono}
        </Typography>
      </TableCell>
      <TableCell align="center">{row.metricas?.movimientos_caja_creados}</TableCell>
      <TableCell align="center">{row.metricas?.remitos_cargados}</TableCell>
      <TableCell align="center">{row.metricas?.acopios_cargados}</TableCell>
      <TableCell align="center">
        {(row.metricas?.correcciones_caja || 0) + (row.metricas?.correcciones_acopio || 0)}
      </TableCell>
      <TableCell align="center">
        {row.metricas?.flujo_roto > 0 ? (
          <Chip label={row.metricas.flujo_roto} color="error" size="small" />
        ) : (
          0
        )}
      </TableCell>
      <TableCell align="center">
        <Chip 
          label={row.metricas?.experiencia_cliente} 
          color={getScoreColor(row.metricas?.experiencia_cliente)}
          size="small"
        />
      </TableCell>
      <TableCell sx={{ maxWidth: 120 }}>
        <Typography 
          variant="body2" 
          onClick={() => setExpanded(!expanded)}
          sx={{ 
            cursor: 'pointer',
            whiteSpace: expanded ? 'normal' : 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {row.resumen}
        </Typography>
      </TableCell>
      <TableCell align="center">
        <IconButton 
          onClick={() => handleDownload(row._id, `conversacion_${row.usuario?.telefono || 'anon'}.txt`)}
          title="Descargar conversación"
        >
          <DownloadIcon />
        </IconButton>
      </TableCell>
    </TableRow>
  );
};

const Page = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  
  const today = new Date();
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(today.getDate() - 14);

  const [filters, setFilters] = useState({
    fechaInicio: twoWeeksAgo.toISOString().split('T')[0],
    fechaFin: today.toISOString().split('T')[0],
    empresaId: '',
    empresaNombre: '',
    usuario: ''
  });
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('rango_analisis.inicio');

  const [groupedOrder, setGroupedOrder] = useState('desc');
  const [groupedOrderBy, setGroupedOrderBy] = useState('count');

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleRequestGroupedSort = (property) => {
    const isAsc = groupedOrderBy === property && groupedOrder === 'asc';
    setGroupedOrder(isAsc ? 'desc' : 'asc');
    setGroupedOrderBy(property);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchAnalisis({ ...filters, limit: 10000 });
      setData(result.data || []);
    } catch (error) {
      console.error("Error loading analisis:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleSearch = () => {
    loadData();
  };

  const handleDownload = async (id, filename) => {
    try {
      const response = await exportConversacion(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || 'conversacion.txt');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error downloading conversation:", error);
    }
  };

  const metrics = data.reduce((acc, curr) => {
    acc.totalConversations++;
    acc.totalScore += curr.metricas?.experiencia_cliente || 0;
    acc.totalMovimientos += curr.metricas?.movimientos_caja_creados || 0;
    acc.totalRemitos += curr.metricas?.remitos_cargados || 0;
    acc.totalAcopios += curr.metricas?.acopios_cargados || 0;
    acc.totalCorrecciones += (curr.metricas?.correcciones_caja || 0) + (curr.metricas?.correcciones_acopio || 0);
    acc.totalFlujoRoto += curr.metricas?.flujo_roto || 0;
    return acc;
  }, {
    totalConversations: 0,
    totalScore: 0,
    totalMovimientos: 0,
    totalRemitos: 0,
    totalAcopios: 0,
    totalCorrecciones: 0,
    totalFlujoRoto: 0
  });

  const avgScore = metrics.totalConversations ? (metrics.totalScore / metrics.totalConversations).toFixed(1) : 0;

  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getGroupedData = (keySelector, nameSelector, subSelector) => {
    const grouped = data.reduce((acc, curr) => {
      const key = keySelector(curr) || 'unknown';
      if (!acc[key]) {
        acc[key] = {
          key,
          name: nameSelector(curr),
          sub: subSelector ? subSelector(curr) : null,
          count: 0,
          totalScore: 0,
          movimientos: 0,
          remitos: 0,
          acopios: 0,
          correcciones: 0,
          flujoRoto: 0
        };
      }
      acc[key].count++;
      acc[key].totalScore += curr.metricas?.experiencia_cliente || 0;
      acc[key].movimientos += curr.metricas?.movimientos_caja_creados || 0;
      acc[key].remitos += curr.metricas?.remitos_cargados || 0;
      acc[key].acopios += curr.metricas?.acopios_cargados || 0;
      acc[key].correcciones += (curr.metricas?.correcciones_caja || 0) + (curr.metricas?.correcciones_acopio || 0);
      acc[key].flujoRoto += curr.metricas?.flujo_roto || 0;
      return acc;
    }, {});

    const array = Object.values(grouped).map(item => ({
        ...item,
        avgScore: item.count ? (item.totalScore / item.count) : 0
    }));

    return applySort(array, getComparator(groupedOrder, groupedOrderBy));
  };

  const companyData = getGroupedData(
    c => c.empresa?.id, 
    c => c.empresa?.nombre || 'Sin nombre',
    c => c.empresa?.id
  );

  const userData = getGroupedData(
    c => c.usuario?.telefono, 
    c => c.usuario?.nombre || 'Desconocido',
    c => c.usuario?.telefono
  );

  const renderGroupedTable = (groupedData, entityLabel) => (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>
                <TableSortLabel
                  active={groupedOrderBy === 'name'}
                  direction={groupedOrderBy === 'name' ? groupedOrder : 'asc'}
                  onClick={() => handleRequestGroupedSort('name')}
                >
                  {entityLabel}
                </TableSortLabel>
            </TableCell>
            <TableCell align="center">
                <TableSortLabel
                  active={groupedOrderBy === 'count'}
                  direction={groupedOrderBy === 'count' ? groupedOrder : 'asc'}
                  onClick={() => handleRequestGroupedSort('count')}
                >
                  Conv.
                </TableSortLabel>
            </TableCell>
            <TableCell align="center">
                <TableSortLabel
                  active={groupedOrderBy === 'avgScore'}
                  direction={groupedOrderBy === 'avgScore' ? groupedOrder : 'asc'}
                  onClick={() => handleRequestGroupedSort('avgScore')}
                >
                  Exp.
                </TableSortLabel>
            </TableCell>
            <TableCell align="center">
                <TableSortLabel
                  active={groupedOrderBy === 'movimientos'}
                  direction={groupedOrderBy === 'movimientos' ? groupedOrder : 'asc'}
                  onClick={() => handleRequestGroupedSort('movimientos')}
                >
                  Mov.
                </TableSortLabel>
            </TableCell>
            <TableCell align="center">
                <TableSortLabel
                  active={groupedOrderBy === 'remitos'}
                  direction={groupedOrderBy === 'remitos' ? groupedOrder : 'asc'}
                  onClick={() => handleRequestGroupedSort('remitos')}
                >
                  Rem.
                </TableSortLabel>
            </TableCell>
            <TableCell align="center">
                <TableSortLabel
                  active={groupedOrderBy === 'acopios'}
                  direction={groupedOrderBy === 'acopios' ? groupedOrder : 'asc'}
                  onClick={() => handleRequestGroupedSort('acopios')}
                >
                  Acop.
                </TableSortLabel>
            </TableCell>
            <TableCell align="center">
                <TableSortLabel
                  active={groupedOrderBy === 'correcciones'}
                  direction={groupedOrderBy === 'correcciones' ? groupedOrder : 'asc'}
                  onClick={() => handleRequestGroupedSort('correcciones')}
                >
                  Corr.
                </TableSortLabel>
            </TableCell>
            <TableCell align="center">
                <TableSortLabel
                  active={groupedOrderBy === 'flujoRoto'}
                  direction={groupedOrderBy === 'flujoRoto' ? groupedOrder : 'asc'}
                  onClick={() => handleRequestGroupedSort('flujoRoto')}
                >
                  F. Roto
                </TableSortLabel>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {groupedData.map((row) => (
            <TableRow key={row.key} hover>
              <TableCell>
                <Typography variant="subtitle2">
                  {row.name}
                </Typography>
                {row.sub && (
                  <Typography variant="caption" color="textSecondary">
                    {row.sub}
                  </Typography>
                )}
              </TableCell>
              <TableCell align="center">{row.count}</TableCell>
              <TableCell align="center">
                <Chip 
                  label={row.avgScore.toFixed(1)} 
                  color={getScoreColor(row.avgScore)}
                  size="small"
                />
              </TableCell>
              <TableCell align="center">{row.movimientos}</TableCell>
              <TableCell align="center">{row.remitos}</TableCell>
              <TableCell align="center">{row.acopios}</TableCell>
              <TableCell align="center">{row.correcciones}</TableCell>
              <TableCell align="center">
                {row.flujoRoto > 0 ? (
                  <Chip label={row.flujoRoto} color="error" size="small" />
                ) : 0}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <>
      <Head>
        <title>Análisis de Conversaciones | Factudata</title>
      </Head>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 8
        }}
      >
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Stack
              direction="row"
              justifyContent="space-between"
              spacing={4}
            >
              <Stack spacing={1}>
                <Typography variant="h4">
                  Análisis de Conversaciones
                </Typography>
              </Stack>
            </Stack>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="overline">
                      Conversaciones
                    </Typography>
                    <Typography color="textPrimary" variant="h4">
                      {metrics.totalConversations}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="overline">
                      Promedio Experiencia
                    </Typography>
                    <Typography color={getScoreColor(avgScore) + ".main"} variant="h4">
                      {avgScore}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="overline">
                      Movimientos Caja
                    </Typography>
                    <Typography color="textPrimary" variant="h4">
                      {metrics.totalMovimientos}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="overline">
                      Flujos Rotos
                    </Typography>
                    <Typography color="error.main" variant="h4">
                      {metrics.totalFlujoRoto}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Card sx={{ p: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <TextField
                  label="Fecha Inicio"
                  name="fechaInicio"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={filters.fechaInicio}
                  onChange={handleFilterChange}
                />
                <TextField
                  label="Fecha Fin"
                  name="fechaFin"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={filters.fechaFin}
                  onChange={handleFilterChange}
                />
                <TextField
                  label="ID Empresa"
                  name="empresaId"
                  value={filters.empresaId}
                  onChange={handleFilterChange}
                />
                <TextField
                  label="Nombre Empresa"
                  name="empresaNombre"
                  value={filters.empresaNombre}
                  onChange={handleFilterChange}
                />
                <TextField
                  label="Usuario / Teléfono"
                  name="usuario"
                  value={filters.usuario}
                  onChange={handleFilterChange}
                />
                <Button variant="contained" onClick={handleSearch}>
                  Filtrar
                </Button>
              </Stack>
            </Card>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab label="Listado General" />
                <Tab label="Por Empresa" />
                <Tab label="Por Usuario" />
              </Tabs>
            </Box>

            {tabValue === 0 && (
            <Card>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <TableSortLabel
                          active={orderBy === 'rango_analisis.inicio'}
                          direction={orderBy === 'rango_analisis.inicio' ? order : 'asc'}
                          onClick={() => handleRequestSort('rango_analisis.inicio')}
                        >
                          Fecha
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={orderBy === 'empresa.nombre'}
                          direction={orderBy === 'empresa.nombre' ? order : 'asc'}
                          onClick={() => handleRequestSort('empresa.nombre')}
                        >
                          Empresa
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={orderBy === 'usuario.nombre'}
                          direction={orderBy === 'usuario.nombre' ? order : 'asc'}
                          onClick={() => handleRequestSort('usuario.nombre')}
                        >
                          Usuario
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center">
                        <TableSortLabel
                          active={orderBy === 'metricas.movimientos_caja_creados'}
                          direction={orderBy === 'metricas.movimientos_caja_creados' ? order : 'asc'}
                          onClick={() => handleRequestSort('metricas.movimientos_caja_creados')}
                        >
                          Mov.
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center">
                        <TableSortLabel
                          active={orderBy === 'metricas.remitos_cargados'}
                          direction={orderBy === 'metricas.remitos_cargados' ? order : 'asc'}
                          onClick={() => handleRequestSort('metricas.remitos_cargados')}
                        >
                          Rem.
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center">
                        <TableSortLabel
                          active={orderBy === 'metricas.acopios_cargados'}
                          direction={orderBy === 'metricas.acopios_cargados' ? order : 'asc'}
                          onClick={() => handleRequestSort('metricas.acopios_cargados')}
                        >
                          Acop.
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center">
                        <TableSortLabel
                          active={orderBy === 'correcciones'}
                          direction={orderBy === 'correcciones' ? order : 'asc'}
                          onClick={() => handleRequestSort('correcciones')}
                        >
                          Corr.
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center">
                        <TableSortLabel
                          active={orderBy === 'metricas.flujo_roto'}
                          direction={orderBy === 'metricas.flujo_roto' ? order : 'asc'}
                          onClick={() => handleRequestSort('metricas.flujo_roto')}
                        >
                          F. Roto
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center">
                        <TableSortLabel
                          active={orderBy === 'metricas.experiencia_cliente'}
                          direction={orderBy === 'metricas.experiencia_cliente' ? order : 'asc'}
                          onClick={() => handleRequestSort('metricas.experiencia_cliente')}
                        >
                          Exp.
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>Resumen</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={11} align="center" sx={{ py: 3 }}>
                          <CircularProgress />
                        </TableCell>
                      </TableRow>
                    ) : data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} align="center" sx={{ py: 3 }}>
                          No se encontraron análisis
                        </TableCell>
                      </TableRow>
                    ) : (
                      applySort(data, getComparator(order, orderBy)).map((row) => (
                        <AnalisisRow key={row._id} row={row} handleDownload={handleDownload} />
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
            )}

            {tabValue === 1 && (
              <Card>
                {renderGroupedTable(companyData, "Empresa")}
              </Card>
            )}

            {tabValue === 2 && (
              <Card>
                {renderGroupedTable(userData, "Usuario")}
              </Card>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
};

Page.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default Page;
