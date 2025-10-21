// pages/boxSummary/index.jsx
// Resumen de Cajas por Proyecto + Por Categoría (con mock)
// Estructura alineada a las pages previas que usás en Sorby

import Head from 'next/head'
import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Container,
  Stack,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Divider,
  Chip,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  Tooltip,
} from '@mui/material'
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'

// Layout Sorby
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout'
import { useAuthContext } from 'src/contexts/auth-context'

// -----------------------------------------------------------------------------
// MOCK DATA
// -----------------------------------------------------------------------------
const MOCK_PROJECTS = [
  {
    id: 'p1',
    nombre: 'Obra Av. Libertador 1234',
    responsable: 'Jorge',
    estado: 'activo',
    cajas: {
      ARS: 1200000,
      USD: 2500,
      CHEQUES: 0,
    },
    ultimoMovimiento: {
      fecha: '2025-10-19',
      tipo: 'egreso',
      proveedor: 'Provee S.A.',
      monto: 250000,
      moneda: 'ARS',
    },
    categorias: {
      Materiales: 420000,
      'Mano de obra': 300000,
      Honorarios: 150000,
      Administración: 50000,
    },
    movimientosRecientes: [
      { id: 'm1', fecha: '2025-10-19', tipo: 'egreso', concepto: 'Cemento', monto: 120000, moneda: 'ARS' },
      { id: 'm2', fecha: '2025-10-18', tipo: 'ingreso', concepto: 'Aporte', monto: 300000, moneda: 'ARS' },
      { id: 'm3', fecha: '2025-10-15', tipo: 'egreso', concepto: 'Honorarios', monto: 80000, moneda: 'ARS' },
    ],
  },
  {
    id: 'p2',
    nombre: 'Obra Sarmiento 456',
    responsable: 'María',
    estado: 'cierre',
    cajas: {
      ARS: 450000,
      USD: 0,
      CHEQUES: 0,
    },
    ultimoMovimiento: {
      fecha: '2025-10-20',
      tipo: 'ingreso',
      proveedor: 'Cliente X',
      monto: 180000,
      moneda: 'ARS',
    },
    categorias: {
      Materiales: 300000,
      'Mano de obra': 100000,
      Honorarios: 50000,
    },
    movimientosRecientes: [
      { id: 'm4', fecha: '2025-10-20', tipo: 'ingreso', concepto: 'Cobro avance', monto: 180000, moneda: 'ARS' },
      { id: 'm5', fecha: '2025-10-12', tipo: 'egreso', concepto: 'Arena', monto: 70000, moneda: 'ARS' },
    ],
  },
  {
    id: 'p3',
    nombre: 'Obra Mitre 789',
    responsable: 'Pablo',
    estado: 'inactiva',
    cajas: {
      ARS: 0,
      USD: 1000,
      CHEQUES: 0,
    },
    ultimoMovimiento: {
      fecha: '2025-10-12',
      tipo: 'egreso',
      proveedor: 'Servicios SRL',
      monto: 50000,
      moneda: 'ARS',
    },
    categorias: {
      Materiales: 0,
      'Mano de obra': 0,
      Honorarios: 0,
    },
    movimientosRecientes: [
      { id: 'm6', fecha: '2025-10-12', tipo: 'egreso', concepto: 'Limpieza final', monto: 50000, moneda: 'ARS' },
    ],
  },
]

const CATEGORIA_COLORS = {
  Materiales: 'primary',
  'Mano de obra': 'success',
  Honorarios: 'warning',
  Administración: 'info',
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------
const formatMoney = (value, currency = 'ARS') => {
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'ARS',
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${currency} ${value?.toLocaleString?.('es-AR') ?? value}`
  }
}

const sum = (arr) => arr.reduce((a, b) => a + b, 0)

// -----------------------------------------------------------------------------
// PAGE
// -----------------------------------------------------------------------------
function BoxDashboardHeader({ projects }) {
  const totals = useMemo(() => {
    const ars = sum(projects.map((p) => p.cajas.ARS || 0))
    const usd = sum(projects.map((p) => p.cajas.USD || 0))
    const lastDates = projects.map((p) => new Date(p.ultimoMovimiento?.fecha || 0).getTime())
    const last = new Date(Math.max(...lastDates))
    const activos = projects.filter((p) => p.estado === 'activo').length
    const conAlertas = projects.filter((p) => (p.cajas.ARS || 0) < 1).length
    return { ars, usd, last, activos, conAlertas }
  }, [projects])

  return (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={12} md={3}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="Total ARS" />
          <CardContent>
            <Typography variant="h5">{formatMoney(totals.ars, 'ARS')}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="Total USD" />
          <CardContent>
            <Typography variant="h5">{formatMoney(totals.usd, 'USD')}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="Último movimiento" />
          <CardContent>
            <Typography variant="subtitle1">{totals.last.toLocaleDateString('es-AR')}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="Proyectos / Alertas" />
          <CardContent>
            <Stack direction="row" spacing={2}>
              <Chip label={`Activos: ${totals.activos}`} color="success" />
              <Chip label={`Alertas: ${totals.conAlertas}`} color="error" />
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

function FiltersBar({ filtro, setFiltro }) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
      <TextField
        size="small"
        label="Buscar proyecto"
        value={filtro.q}
        onChange={(e) => setFiltro((f) => ({ ...f, q: e.target.value }))}
      />
      <TextField
        size="small"
        select
        label="Moneda"
        value={filtro.moneda}
        onChange={(e) => setFiltro((f) => ({ ...f, moneda: e.target.value }))}
        sx={{ minWidth: 150 }}
      >
        <MenuItem value="ALL">Todas</MenuItem>
        <MenuItem value="ARS">ARS</MenuItem>
        <MenuItem value="USD">USD</MenuItem>
      </TextField>
      <TextField
        size="small"
        select
        label="Estado"
        value={filtro.estado}
        onChange={(e) => setFiltro((f) => ({ ...f, estado: e.target.value }))}
        sx={{ minWidth: 180 }}
      >
        <MenuItem value="ALL">Todos</MenuItem>
        <MenuItem value="activo">Activo</MenuItem>
        <MenuItem value="cierre">En cierre</MenuItem>
        <MenuItem value="inactiva">Inactiva</MenuItem>
      </TextField>
      <Button
        variant="outlined"
        startIcon={<FilterAltOffIcon />}
        onClick={() => setFiltro({ q: '', moneda: 'ALL', estado: 'ALL' })}
      >
        Limpiar filtros
      </Button>
    </Stack>
  )
}

function ProjectRow({ p }) {
  const [open, setOpen] = useState(false)
  const saldoColor = (p.cajas.ARS || 0) < 1 ? 'error.main' : 'success.main'

  const totalCategorias = useMemo(() => {
    const total = Object.values(p.categorias || {}).reduce((a, b) => a + (b || 0), 0)
    return total || 0
  }, [p])

  return (
    <>
      <TableRow hover>
        <TableCell>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton size="small" onClick={() => setOpen((o) => !o)}>
              {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <Typography variant="subtitle2">{p.nombre}</Typography>
          </Stack>
        </TableCell>
        <TableCell>
          <Typography sx={{ color: saldoColor }}>{formatMoney(p.cajas.ARS, 'ARS')}</Typography>
        </TableCell>
        <TableCell>{formatMoney(p.cajas.USD, 'USD')}</TableCell>
        <TableCell>
          {p.ultimoMovimiento?.fecha
            ? new Date(p.ultimoMovimiento.fecha).toLocaleDateString('es-AR')
            : '—'}{' '}
          {p.ultimoMovimiento?.tipo ? `· ${p.ultimoMovimiento.tipo}` : ''}
        </TableCell>
        <TableCell>{p.responsable || '—'}</TableCell>
        <TableCell>
          <Chip
            size="small"
            label={p.estado}
            color={p.estado === 'activo' ? 'success' : p.estado === 'cierre' ? 'warning' : 'default'}
          />
        </TableCell>
        <TableCell>
          {(p.cajas.ARS || 0) < 1 && <Chip size="small" color="error" label="Saldo bajo" />}
          {p.estado === 'inactiva' && <Chip size="small" label="Inactivo" />}
        </TableCell>
        <TableCell align="right">
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button size="small" variant="outlined" endIcon={<OpenInNewIcon />}>Ver detalles</Button>
            <Button size="small" variant="contained">Agregar mov.</Button>
          </Stack>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2, bgcolor: 'background.default' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardHeader title="Cajas" />
                    <CardContent>
                      <Stack spacing={1}>
                        <Typography variant="body2">ARS: {formatMoney(p.cajas.ARS, 'ARS')}</Typography>
                        <Typography variant="body2">USD: {formatMoney(p.cajas.USD, 'USD')}</Typography>
                        <Typography variant="body2">Cheques: {formatMoney(p.cajas.CHEQUES || 0, 'ARS')}</Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardHeader title="Por categoría" subheader={`Total categ.: ${formatMoney(totalCategorias, 'ARS')}`} />
                    <CardContent>
                      <Stack spacing={1}>
                        {Object.entries(p.categorias || {}).map(([cat, val]) => (
                          <Stack key={cat} direction="row" justifyContent="space-between">
                            <Chip size="small" color={CATEGORIA_COLORS[cat] || 'default'} label={cat} />
                            <Typography variant="body2">{formatMoney(val, 'ARS')}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardHeader title="Últimos movimientos" />
                    <CardContent>
                      <Stack spacing={1}>
                        {(p.movimientosRecientes || []).slice(0, 5).map((m) => (
                          <Stack key={m.id} direction="row" justifyContent="space-between">
                            <Typography variant="body2">{new Date(m.fecha).toLocaleDateString('es-AR')}</Typography>
                            <Typography variant="body2">{m.tipo} · {m.concepto}</Typography>
                            <Typography variant="body2">{formatMoney(m.monto, m.moneda)}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

function TabPorProyecto({ projects }) {
  const [filtro, setFiltro] = useState({ q: '', moneda: 'ALL', estado: 'ALL' })

  const data = useMemo(() => {
    return projects
      .filter((p) => (filtro.q ? p.nombre.toLowerCase().includes(filtro.q.toLowerCase()) : true))
      .filter((p) => (filtro.estado === 'ALL' ? true : p.estado === filtro.estado))
  }, [projects, filtro])

  return (
    <>
      <FiltersBar filtro={filtro} setFiltro={setFiltro} />

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Proyecto</TableCell>
              <TableCell>Saldo ARS</TableCell>
              <TableCell>Saldo USD</TableCell>
              <TableCell>Último mov.</TableCell>
              <TableCell>Responsable</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Alertas</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((p) => (
              <ProjectRow key={p.id} p={p} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  )
}

function TabPorCategoria({ projects }) {
  // Flatten + aggregate por categoría global
  const categoriasAgg = useMemo(() => {
    const agg = {}
    for (const p of projects) {
      for (const [cat, val] of Object.entries(p.categorias || {})) {
        agg[cat] = (agg[cat] || 0) + (val || 0)
      }
    }
    // ordenar desc
    return Object.entries(agg)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, total]) => ({ cat, total }))
  }, [projects])

  const totalARS = useMemo(() => categoriasAgg.reduce((a, c) => a + c.total, 0), [categoriasAgg])

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Card>
          <CardHeader title="Resumen por categoría" subheader={`Total ARS: ${formatMoney(totalARS, 'ARS')}`} />
          <CardContent>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Categoría</TableCell>
                    <TableCell align="right">Total ARS</TableCell>
                    <TableCell>Top proyectos</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categoriasAgg.map((row) => {
                    // top 3 proyectos por categoría
                    const top = projects
                      .map((p) => ({ nombre: p.nombre, valor: p.categorias?.[row.cat] || 0 }))
                      .filter((x) => x.valor > 0)
                      .sort((a, b) => b.valor - a.valor)
                      .slice(0, 3)
                    return (
                      <TableRow key={row.cat} hover>
                        <TableCell>
                          <Chip label={row.cat} color={CATEGORIA_COLORS[row.cat] || 'default'} />
                        </TableCell>
                        <TableCell align="right">{formatMoney(row.total, 'ARS')}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            {top.map((t) => (
                              <Tooltip key={t.nombre} title={t.nombre}>
                                <Chip size="small" label={`${t.nombre.split(' ')[1] ?? t.nombre}: ${formatMoney(t.valor, 'ARS')}`} />
                              </Tooltip>
                            ))}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

// -----------------------------------------------------------------------------
// MAIN PAGE COMPONENT
// -----------------------------------------------------------------------------
function BoxSummaryPage() {
  const { user } = useAuthContext?.() || {}
  const [projects, setProjects] = useState([])
  const [tab, setTab] = useState(0) // 0: por proyecto, 1: por categoría

  useEffect(() => {
    // En prod: fetch desde API/servicio. Por ahora, mock local.
    setProjects(MOCK_PROJECTS)
  }, [])

  return (
    <>
      <Head>
        <title>Sorby — Resumen de Cajas</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 2 }}>
        <Container maxWidth="xl">
          <Stack spacing={2}>
            <Typography variant="h5">Resumen de cajas</Typography>
            <Typography variant="body2" color="text.secondary">
              Empresa: {user?.empresaNombre || 'CONSTRUCTORA X'}
            </Typography>

            {/* Dashboard superior */}
            <BoxDashboardHeader projects={projects} />

            {/* Tabs */}
            <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
                <Tab label="Por proyecto" />
                <Tab label="Por categoría" />
              </Tabs>
              <Divider />
              <Box sx={{ p: 2 }}>
                {tab === 0 && <TabPorProyecto projects={projects} />}
                {tab === 1 && <TabPorCategoria projects={projects} />}
              </Box>
            </Paper>
          </Stack>
        </Container>
      </Box>
    </>
  )
}

// Usar el layout de dashboard de Sorby
BoxSummaryPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default BoxSummaryPage
