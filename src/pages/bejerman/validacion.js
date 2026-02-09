import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { Box, Container, Stack, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, Button, TextField, MenuItem, Snackbar, Alert, Grid } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import bejermanService from 'src/services/bejermanService';

const emptyForm = {
  tipoDocumento: 'transferencia',
  monto: 0,
  fecha: '',
  codigoBanco: '',
  cuentaBancaria: '',
  codigoCaja: '',
  moneda: '1',
  tipoCambio: 'UNI',
  codigoTipoMovimientoFondos: '',
  identificacionUnicaSistema: ''
};

const ValidationBejermanPage = () => {
  const { user } = useAuthContext();
  const [documents, setDocuments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const empresaId = useMemo(() => user?.empresa?.id, [user]);

  const loadDocuments = async () => {
    if (!empresaId) return;
    const data = await bejermanService.getDocuments(empresaId, 'pending_validation');
    setDocuments(data);
  };

  useEffect(() => {
    loadDocuments();
  }, [empresaId]);

  const selectDocument = (doc) => {
    setSelected(doc);
    setForm({
      tipoDocumento: doc.tipoDocumento || 'transferencia',
      monto: doc.monto || 0,
      fecha: doc.fecha ? new Date(doc.fecha).toISOString().slice(0, 10) : '',
      codigoBanco: doc.codigoBanco || '',
      cuentaBancaria: doc.cuentaBancaria || '',
      codigoCaja: doc.codigoCaja || '',
      moneda: doc.moneda || '1',
      tipoCambio: doc.tipoCambio || 'UNI',
      codigoTipoMovimientoFondos: doc.codigoTipoMovimientoFondos || '',
      identificacionUnicaSistema: doc.identificacionUnicaSistema || ''
    });
  };

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleValidate = async () => {
    if (!selected) return;
    const payload = {
      ...form,
      monto: Number(form.monto),
      fecha: form.fecha ? new Date(form.fecha) : null
    };
    await bejermanService.validateDocument(selected._id, payload);
    setAlert({ open: true, message: 'Documento enviado a Bejerman', severity: 'success' });
    setSelected(null);
    setForm(emptyForm);
    await loadDocuments();
  };

  const handleSend = async () => {
    if (!selected) return;
    await bejermanService.sendDocument(selected._id);
    setAlert({ open: true, message: 'Enviado a Bejerman', severity: 'success' });
    setSelected(null);
    setForm(emptyForm);
    await loadDocuments();
  };

  return (
    <>
      <Head>
        <title>Bejerman - Validación</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="lg">
          <Stack spacing={3}>
            <Typography variant="h4">Bejerman | Validación</Typography>

            <Paper variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Monto</TableCell>
                    <TableCell>Documento</TableCell>
                    <TableCell>Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc._id} selected={selected?._id === doc._id}>
                      <TableCell>{doc.fecha ? new Date(doc.fecha).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>{doc.tipoDocumento}</TableCell>
                      <TableCell>{doc.monto}</TableCell>
                      <TableCell>
                        {doc.fileUrl ? (
                          <a href={doc.fileUrl} target="_blank" rel="noreferrer">Ver</a>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" onClick={() => selectDocument(doc)}>Editar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {documents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>No hay documentos pendientes.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>

            {selected && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <Typography variant="h6">Validar documento</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField select fullWidth label="Tipo" value={form.tipoDocumento} onChange={handleChange('tipoDocumento')}>
                        <MenuItem value="transferencia">Transferencia</MenuItem>
                        <MenuItem value="cheque_terceros">Cheque terceros</MenuItem>
                        <MenuItem value="caja">Caja</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth type="number" label="Monto" value={form.monto} onChange={handleChange('monto')} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth type="date" label="Fecha" value={form.fecha} onChange={handleChange('fecha')} InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Código Movimiento" value={form.codigoTipoMovimientoFondos} onChange={handleChange('codigoTipoMovimientoFondos')} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Código Banco" value={form.codigoBanco} onChange={handleChange('codigoBanco')} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Cuenta Bancaria" value={form.cuentaBancaria} onChange={handleChange('cuentaBancaria')} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Código Caja" value={form.codigoCaja} onChange={handleChange('codigoCaja')} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Moneda" value={form.moneda} onChange={handleChange('moneda')} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Tipo Cambio" value={form.tipoCambio} onChange={handleChange('tipoCambio')} />
                    </Grid>
                    <Grid item xs={12} md={12}>
                      <TextField fullWidth label="Idempotency" value={form.identificacionUnicaSistema} onChange={handleChange('identificacionUnicaSistema')} />
                    </Grid>
                  </Grid>

                  <Stack direction="row" spacing={2}>
                    <Button variant="contained" onClick={handleValidate}>Validar</Button>
                    <Button variant="outlined" onClick={handleSend}>Enviar a Bejerman</Button>
                  </Stack>
                </Stack>
              </Paper>
            )}
          </Stack>
        </Container>
      </Box>

      <Snackbar open={alert.open} autoHideDuration={4000} onClose={() => setAlert({ ...alert, open: false })}>
        <Alert severity={alert.severity}>{alert.message}</Alert>
      </Snackbar>
    </>
  );
};

ValidationBejermanPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ValidationBejermanPage;
