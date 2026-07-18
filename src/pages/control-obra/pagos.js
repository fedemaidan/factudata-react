import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Card, CardContent, Chip, Container, LinearProgress, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TableSortLabel, TextField, MenuItem, Typography,
} from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import ControlObraService from 'src/services/controlObra/controlObraService';
import CarteraNav from 'src/components/controlObra/CarteraNav';
import SinPermisoControlObra, { puedeVerControlObra } from 'src/components/controlObra/AccesoControlObra';
import { KpiCard, fmt } from 'src/components/controlObra/ui';
import { aplicarFiltroOrden, obrasDeItems } from 'src/components/controlObra/carteraFiltros';

const COLOR = { borrador: 'default', aprobada: 'info' };

const COLS = [
  { key: 'obra_titulo', label: 'Obra' },
  { key: 'numero', label: '#' },
  { key: 'contratista_nombre', label: 'Contratista' },
  { key: 'monto_neto', label: 'Neto', align: 'right' },
  { key: 'estado', label: 'Estado' },
];

// "Jueves de pagos": cola de órdenes de pago a contratistas de TODAS las obras.
function PagosObraPage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const qc = useQueryClient();
  const [empresaId, setEmpresaId] = useState(null);
  const [filtroObra, setFiltroObra] = useState('');
  const [orderBy, setOrderBy] = useState('obra_titulo');
  const [order, setOrder] = useState('asc');

  useEffect(() => {
    if (!user) return;
    getEmpresaDetailsFromUser(user).then((e) => setEmpresaId(e?.id || null)).catch(() => {});
  }, [user]);

  const q = useQuery({
    queryKey: ['control-obra', 'pagos-cartera', empresaId],
    queryFn: () => ControlObraService.pagosCartera(empresaId),
    enabled: !!empresaId,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['control-obra'] });
  const accion = useMutation({ mutationFn: ({ fn }) => fn(), onSuccess: refresh });

  const rows = q.data || [];
  const obras = useMemo(() => obrasDeItems(rows), [rows]);
  const items = useMemo(
    () => aplicarFiltroOrden(rows, { filtroObra, orderBy, order }),
    [rows, filtroObra, orderBy, order],
  );

  const aDesembolsar = items.filter((i) => i.estado === 'aprobada').reduce((a, i) => a + (i.monto_neto || 0), 0);
  const enBorrador = items.filter((i) => i.estado === 'borrador').reduce((a, i) => a + (i.monto_neto || 0), 0);

  const sortHandler = (key) => {
    if (orderBy === key) setOrder(order === 'asc' ? 'desc' : 'asc');
    else { setOrderBy(key); setOrder('asc'); }
  };

  if (user && !puedeVerControlObra(user)) return <SinPermisoControlObra />;

  return (
    <DashboardLayout title="Control de Obra — Pagos a obra">
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Typography variant="h4" mb={1}>Control de Obra</Typography>
        <CarteraNav />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} useFlexGap flexWrap="wrap">
          <KpiCard label="A desembolsar" value={fmt(aDesembolsar)} color="warning.main" sub="órdenes aprobadas" />
          <KpiCard label="En borrador" value={fmt(enBorrador)} sub="por aprobar" />
          <KpiCard label="Órdenes" value={items.length} sub="pendientes (filtrado)" />
        </Stack>

        <Card>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} flexWrap="wrap" useFlexGap>
              <TextField select size="small" label="Obra" value={filtroObra} onChange={(e) => setFiltroObra(e.target.value)} sx={{ minWidth: 200 }}>
                <MenuItem value="">Todas</MenuItem>
                {obras.map((o) => <MenuItem key={o.id} value={o.id}>{o.titulo}</MenuItem>)}
              </TextField>
              {filtroObra && <Button size="small" onClick={() => setFiltroObra('')}>Limpiar</Button>}
            </Stack>

            {q.isLoading && <LinearProgress sx={{ mb: 1 }} />}
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {COLS.map((c) => (
                      <TableCell key={c.key} align={c.align || 'left'} sortDirection={orderBy === c.key ? order : false}>
                        <TableSortLabel active={orderBy === c.key} direction={orderBy === c.key ? order : 'asc'} onClick={() => sortHandler(c.key)}>
                          {c.label}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((i) => (
                    <TableRow key={i.orden_id} hover>
                      <TableCell>{i.obra_titulo || '(sin título)'}</TableCell>
                      <TableCell>{i.numero}</TableCell>
                      <TableCell>{i.contratista_nombre}</TableCell>
                      <TableCell align="right">{fmt(i.monto_neto)}</TableCell>
                      <TableCell><Chip size="small" label={i.estado} color={COLOR[i.estado] || 'default'} /></TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          {i.estado === 'borrador' && (
                            <Button size="small" onClick={() => accion.mutate({ fn: () => ControlObraService.aprobarOrden(i.orden_id, empresaId) })}>Aprobar</Button>
                          )}
                          {i.estado === 'aprobada' && (
                            <Button size="small" variant="contained" onClick={() => accion.mutate({ fn: () => ControlObraService.pagarOrden(i.orden_id, empresaId) })}>Pagar</Button>
                          )}
                          <Button size="small" onClick={() => router.push(`/control-obra/${i.obra_id}`)}>Ver obra</Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!q.isLoading && items.length === 0 && (
                    <TableRow><TableCell colSpan={6}><Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>No hay órdenes de pago pendientes.</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </DashboardLayout>
  );
}

export default PagosObraPage;
