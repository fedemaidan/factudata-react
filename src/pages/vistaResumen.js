// pages/boxSummary/index.js
// Resumen de Cajas por Proyecto + Por Categoría (sin getCajasByEmpresaId)
// - Empresa por router (getEmpresaById)
// - Proyectos por usuario (getProyectosByUser)
// - Categorías tomadas desde empresa

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
  CircularProgress,
} from '@mui/material'
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout'
import { useAuthContext } from 'src/contexts/auth-context'
import { useRouter } from 'next/router'
import { getEmpresaById, getEmpresaDetailsFromUser } from 'src/services/empresaService'
import { getProyectosFromUser } from 'src/services/proyectosService'
import { formatTimestamp } from 'src/utils/formatters'
import ticketService from 'src/services/ticketService'


const CATEGORIA_COLORS = {
  Materiales: 'primary',
  'Mano de obra': 'info',
  Honorarios: 'success',
}

// Colores disponibles para categorías no definidas
const RANDOM_COLORS = ['warning', 'secondary', 'error', 'default']

const getCategoriaColor = (cat) => {
  if (CATEGORIA_COLORS[cat]) return CATEGORIA_COLORS[cat]
  // color aleatorio pero estable por nombre (hash)
  const hash = [...cat].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return RANDOM_COLORS[hash % RANDOM_COLORS.length]
}


const tsToDate = (ts) => {
  if (!ts) return null
  // Admin/Cliente: puede venir como {seconds,nanoseconds} o traer toDate()
  if (typeof ts?.toDate === 'function') return ts.toDate()
  if (typeof ts?.seconds === 'number') return new Date(ts.seconds * 1000)
  // si viene como ISO/millis
  try { return new Date(ts) } catch { return null }
}

const formatMoney = (value, currency = 'ARS') => {
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'ARS',
      maximumFractionDigits: 0,
    }).format(value || 0)
  } catch {
    return `${currency} ${value?.toLocaleString?.('es-AR') ?? value ?? 0}`
  }
}

const sum = (arr) => arr.reduce((a, b) => a + b, 0)

// ----------------------------------------------------
// Componentes
// ----------------------------------------------------
// Devuelve un objeto plano {cat: totalARS} desde distintas fuentes
const getCategoriasARSFromProyecto = (p) => {
  // preferimos la estructura nueva
  if (p?.categorias_totales?.ARS && typeof p.categorias_totales.ARS === 'object') {
    return p.categorias_totales.ARS
  }
  // compatibilidad con campos viejos
  return p?.categorias || p?.ui_prefs?.categorias_totales || {}
}


function BoxDashboardHeader({ projects }) {
  const totals = useMemo(() => {
    const ars = sum(projects.map((p) => p.cajas?.ARS || 0))
    const usd = sum(projects.map((p) => p.cajas?.USD || 0))
    const lastDates = projects
        .map((p) => {
          const f = p?.ultimoMovimiento?.fecha
          if (!f) return 0

          // Si es Firestore Timestamp con .toDate()
          if (typeof f?.toDate === 'function') return f.toDate().getTime()

          // Si es un objeto con seconds (tipo {seconds, nanoseconds})
          if (typeof f?.seconds === 'number') return f.seconds * 1000

          // Si es string o número
          const parsed = new Date(f)
          return isNaN(parsed.getTime()) ? 0 : parsed.getTime()
        })
        .filter((t) => t > 0)

    const last = lastDates.length ? Math.max(...lastDates) : null
    const activos = projects.filter((p) => p.estado === 'activo').length
    const conAlertas = projects.filter((p) => (p.cajas?.ARS || 0) < 1).length
    return { ars, usd, last, activos, conAlertas }
  }, [projects])

  return (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={12} md={3}>
        <Card>
          <CardHeader title="Total ARS" />
          <CardContent>
            <Typography variant="h5">{formatMoney(totals.ars, 'ARS')}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
          <CardHeader title="Total USD" />
          <CardContent>
            <Typography variant="h5">{formatMoney(totals.usd, 'USD')}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
          <CardHeader title="Último movimiento" />
          <CardContent>
            <Typography variant="subtitle1">
              {totals.last
                ? formatTimestamp({ seconds: Math.floor(totals.last / 1000) }, "DIA/MES/ANO")
              : '—'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
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

function ProjectRow({ p, categoriaColors = {} }) {
  const [open, setOpen] = useState(false)
  const [loadingMovs, setLoadingMovs] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [movs, setMovs] = useState([]) // últimos movimientos combinados ARS+USD

  const saldoColor = (p?.cajas?.ARS || 0) < 1 ? 'error.main' : 'success.main'

  const normalize = (m) => ({
    id: m.id,
    fecha: m.fecha_factura || m.fecha || m.createdAt || m.updatedAt || null,
    tipo: String(m.type || m.tipo || '-').toLowerCase(), // 'ingreso' | 'egreso'
    concepto: m.categoria + m.observacion ? `${m.categoria || ''} ${m.observacion || ''}`.trim() : '-',
    monto: Number(m.total ?? m.monto ?? 0),
    moneda: m.moneda || 'ARS',
  })

  const sortByFechaDesc = (a, b) => {
    const toMs = (x) => {
      if (!x) return 0
      if (typeof x?.toDate === 'function') return x.toDate().getTime()
      if (typeof x?.seconds === 'number') return x.seconds * 1000
      try { return new Date(x).getTime() || 0 } catch { return 0 }
    }
    return toMs(b.fecha) - toMs(a.fecha)
  }

  const fetchMovs = async () => {
    try {
      setLoadingMovs(true)
      const [ars, usd] = await Promise.all([
        ticketService.getMovimientosForProyecto(p.id, 'ARS'),
        ticketService.getMovimientosForProyecto(p.id, 'USD'),
      ])
      const merged = [...(ars || []), ...(usd || [])].map(normalize).sort(sortByFechaDesc).slice(0, 7)
      setMovs(merged)
    } catch (e) {
      console.error('Error trayendo movimientos:', e)
      setMovs([])
    } finally {
      setLoadingMovs(false)
      setFetched(true)
    }
  }

  const handleToggle = async () => {
    const next = !open
    setOpen(next)
    if (next && !fetched) {
      fetchMovs()
    }
  }

  return (
    <>
      <TableRow hover>
        <TableCell>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton size="small" onClick={handleToggle}>
              {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <Typography variant="subtitle2">{p?.nombre}</Typography>
          </Stack>
        </TableCell>

        <TableCell>
          <Typography sx={{ color: saldoColor }}>
            {formatMoney(p?.cajas?.ARS, 'ARS')}
          </Typography>
        </TableCell>

        <TableCell>{formatMoney(p?.cajas?.USD, 'USD')}</TableCell>

        <TableCell>
          {p?.ultimoMovimiento?.fecha
            ? formatTimestamp(p.ultimoMovimiento.fecha, 'DIA/MES/ANO')
            : '—'}
          {p?.ultimoMovimiento?.tipo ? ` · ${p.ultimoMovimiento.tipo}` : ''}
        </TableCell>

        <TableCell>
          <Chip
            size="small"
            label={p?.estado || 'activo'}
            color={p?.estado === 'activo' ? 'success' : p?.estado === 'cierre' ? 'warning' : 'default'}
          />
        </TableCell>

        <TableCell>
          {(p?.cajas?.ARS || 0) < 1 && <Chip size="small" color="error" label="Saldo bajo" />}
          {p?.estado === 'inactiva' && <Chip size="small" label="Inactivo" />}
        </TableCell>

        <TableCell align="right">
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button size="small" variant="outlined" endIcon={<OpenInNewIcon />} href={`/cajaProyecto/?proyectoId=${p.id}`} target="_blank" rel="noopener">
              Ver detalles
            </Button>
            <Button size="small" variant="contained" href={`/movementForm/?lastPageName="Resumen general"&lastPageUrl="/vistaResumen"`}  target="_blank" rel="noopener">Agregar mov.</Button>
          </Stack>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={7} style={{ paddingBottom: 0, paddingTop: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2, bgcolor: 'background.default' }}>
              <Grid container spacing={2}>
                {/* Cajas */}
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardHeader title="Cajas" />
                    <CardContent>
                      <Stack spacing={1}>
                        <Typography variant="body2">
                          ARS: {formatMoney(p?.cajas?.ARS, 'ARS')}
                        </Typography>
                        <Typography variant="body2">
                          USD: {formatMoney(p?.cajas?.USD, 'USD')}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Por categoría */}
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack spacing={1}>
                        {Object.entries(p?.categorias || {}).map(([cat, val]) => (
                          <Stack key={cat} direction="row" justifyContent="space-between">
                            <Chip size="small" color={getCategoriaColor(cat)} label={cat} />
                            <Typography variant="body2">{formatMoney(val, 'ARS')}</Typography>
                          </Stack>
                        ))}
                        {!p?.categorias || Object.keys(p.categorias).length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            Sin datos de categorías
                          </Typography>
                        ) : null}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Últimos movimientos (lazy) */}
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardHeader title="Últimos movimientos" />
                    <CardContent>
                      {loadingMovs ? (
                        <Stack alignItems="center" py={2}>
                          <CircularProgress size={22} />
                        </Stack>
                      ) : movs.length > 0 ? (
                        <Stack spacing={1}>
                          {movs.map((m) => {
                            const esIngreso = m.tipo === 'ingreso'
                            const colorMonto = esIngreso ? 'success.main' : 'error.main'
                            const signo = esIngreso ? '' : '-'
                            const absoluto = Math.abs(m.monto)
                            return (
                              <Stack key={m.id} direction="row" alignItems="center" spacing={1}>
                                {/* Fecha */}
                                <Tooltip title={formatTimestamp(m.fecha, 'DIA/MES/ANO')}>
                                  <Typography variant="body2" sx={{ width: 92 }}>
                                    {formatTimestamp(m.fecha, 'DIA/MES/ANO')}
                                  </Typography>
                                </Tooltip>

                                {/* Concepto (trunca si es largo) */}
                                <Typography
                                  variant="body2"
                                  sx={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                  title={m.concepto}
                                >
                                  {m.concepto}
                                </Typography>

                                {/* Monto (color por tipo, sin texto ingreso/egreso) */}
                                <Typography variant="body2" sx={{ color: colorMonto, fontWeight: 600, minWidth: 120, textAlign: 'right' }}>
                                  {`${signo} ${formatMoney(absoluto, m.moneda)}`}
                                </Typography>
                              </Stack>
                            )
                          })}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Sin movimientos recientes
                        </Typography>
                      )}
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
              <TableCell>Estado</TableCell>
              <TableCell>Alertas</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((p) => <ProjectRow key={p.id} p={p} categoriaColors={CATEGORIA_COLORS} />)}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  )
}

function TabPorCategoria({ projects, empresa }) {
  // Base de categorías desde empresa (si existe)
  const categoriasBase = useMemo(() => {
    const arr = Array.isArray(empresa?.categorias) ? empresa.categorias : []
    // Normalizamos a { nombre: string }
    return arr
      .map((c) => (typeof c === 'string' ? { nombre: c } : c))
      .filter(Boolean)
  }, [empresa])

  // Agregación: suma por categoría usando datos de los proyectos
  const categoriasAgg = useMemo(() => {
    const agg = {}

    // Inicializamos todas las categorías de la empresa en 0
    for (const c of categoriasBase) {
      const key = c.nombre || c?.name || ''
      if (key) agg[key] = 0
    }

    // Sumamos lo que venga de cada proyecto
    for (const p of projects) {
      const cats = getCategoriasARSFromProyecto(p)
      for (const [cat, val] of Object.entries(cats)) {
        agg[cat] = (agg[cat] || 0) + (val || 0)
      }
    }

    return Object.entries(agg)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, total]) => ({ cat, total }))
  }, [projects, categoriasBase])

  const totalARS = useMemo(() => categoriasAgg.reduce((a, c) => a + c.total, 0), [categoriasAgg])

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title="Resumen por categoría"
          />
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
                    const top = projects
                      .map((p) => { const cats = getCategoriasARSFromProyecto(p)
                            return { nombre: p.nombre, valor: cats?.[row.cat] || 0 }
                        })
                      .filter((x) => x.valor > 0)
                      .sort((a, b) => b.valor - a.valor)
                      .slice(0, 3)
                    return (
                      <TableRow key={row.cat} hover>
                        <TableCell>
                          <Chip label={row.cat} color={getCategoriaColor(row.cat)} />
                        </TableCell>
                        <TableCell align="right">{formatMoney(row.total, 'ARS')}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            {top.map((t) => (
                              <Tooltip key={t.nombre} title={t.nombre}>
                                <Chip
                                  size="small"
                                  label={`${t?.nombre}: ${formatMoney(
                                    t.valor,
                                    'ARS'
                                  )}`}
                                />
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

// ----------------------------------------------------
// Página principal
// ----------------------------------------------------
function BoxSummaryPage() {
  const { user } = useAuthContext?.() || {}
  const router = useRouter()
  const { empresaId } = router.query

  const [empresa, setEmpresa] = useState(null)
  const [projects, setProjects] = useState([])
  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Cargar empresa (como en tu page de Configuración Básica)
    let mounted = true
    ;(async () => {
      try {
        let emp = null
        if (!empresaId) {
           emp = await getEmpresaDetailsFromUser(user);
        }
        else {
          emp = await getEmpresaById(empresaId)
        } 
        if (!mounted) return
        setEmpresa(emp)
      } catch (e) {
        console.error('Error cargando empresa:', e)
      }
    })()
    return () => { mounted = false }
  }, [empresaId])

  useEffect(() => {
    // Cargar proyectos por usuario (sin getCajasByEmpresaId)
    if (!user) return
    let mounted = true
    setLoading(true)
    ;(async () => {
      try {
        const proys = await getProyectosFromUser(user)
        if (!mounted) return
        
        const proysActive = proys.filter((p) => {
          p.activo = p.activo === false ? false : true
          return p.activo !== false
        })

        // Normalizamos el shape esperado de la page
        const mapped = (proysActive || []).map((p) => {
          // Si cada proyecto ya trae cajas agregadas, las usamos; si no, caemos a 0
          const cajas = {
            ARS: Number(p?.totalPesos ?? 0),
            USD: Number(p?.totalDolares ?? 0),
          }


          const ultimoMovimientoRaw =
            p?.ultimoMovimiento || p?.lastMovement || {
              fecha: p?.updatedAt || p?.createdAt || null,
              tipo: '-',
              proveedor: '-',
              monto: 0,
              moneda: 'ARS',
            }

          const ultimoMovimiento = ultimoMovimientoRaw


          // Categorías por proyecto (si existen totales precalculados, usarlos)
          const categorias = getCategoriasARSFromProyecto(p)


          return {
            id: p.id,
            nombre: p.nombre || 'Proyecto sin nombre',
            estado: p.activo === false ? 'inactiva' : p.estado || 'activo',
            cajas,
            ultimoMovimiento,
            categorias,
            movimientosRecientes: p?.movimientosRecientes || [],
          }
        })

        setProjects(mapped)
      } catch (e) {
        console.error('Error cargando proyectos del usuario:', e)
        setProjects([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [user])

  if (!user || !empresa) {
    return (
      <>
        <Head><title>Sorby — Resumen de Cajas</title></Head>
        <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
          <Container maxWidth="xl" sx={{ display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Container>
        </Box>
      </>
    )
  }

  return (
    <>
      <Head><title>Sorby — Resumen de Cajas</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 2 }}>
        <Container maxWidth="xl">
          <Stack spacing={2}>
            <Typography variant="h5">Resumen de cajas</Typography>

            <BoxDashboardHeader projects={projects} />

            <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
                <Tab label="Por proyecto" />
                <Tab label="Por categoría" />
              </Tabs>
              <Divider />
              <Box sx={{ p: 2 }}>
                {loading ? (
                  <Stack alignItems="center" py={4}><CircularProgress /></Stack>
                ) : projects.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No hay proyectos para mostrar.</Typography>
                ) : (
                  <>
                    {tab === 0 && <TabPorProyecto projects={projects} />}
                    {tab === 1 && <TabPorCategoria projects={projects} empresa={empresa} />}
                  </>
                )}
              </Box>
            </Paper>
          </Stack>
        </Container>
      </Box>
    </>
  )
}

BoxSummaryPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>
export default BoxSummaryPage
