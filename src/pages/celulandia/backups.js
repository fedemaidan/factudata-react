import React, { useState } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import Head from "next/head";
import {
  Box,
  Container,
  Stack,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Snackbar,
  Tabs,
  Tab,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import backupService from "src/services/celulandia/backupService";
import DataTable from "src/components/celulandia/DataTable";
import { formatearCampo } from "src/utils/celulandia/formatearCampo";
import { getFechaArgentina } from "src/utils/celulandia/fechas";
import { parseMovimiento } from "src/utils/celulandia/movimientos/parseMovimientos";
import { parseCuentaPendiente } from "src/utils/celulandia/cuentasPendientes/parseCuentasPendientes";

const BackupsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [confirmWord, setConfirmWord] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showSyncPreview, setShowSyncPreview] = useState(false);
  const [syncTab, setSyncTab] = useState(0);
  const [syncData, setSyncData] = useState({
    comprobantes: [],
    entregas: [],
    pagos: [],
  });
  const [alert, setAlert] = useState({
    open: false,
    message: "",
    severity: "error",
  });
  const isConfirmValid = confirmWord === "CONFIRMAR, VOY A BORRAR LA BASE DE DATOS ACTUAL PARA REEMPLAZARLA POR EL BACKUP";
  const isUrlFilled = googleSheetUrl.trim().length > 0;

  const handleOpen = () => setIsModalOpen(true);
  const handleClose = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setGoogleSheetUrl("");
    setConfirmWord("");
  };

  const handleSubmit = async () => {
    if (!isConfirmValid || !isUrlFilled) return;
    try {
      setIsSubmitting(true);
      const response = await backupService.restoreDb(googleSheetUrl);
      handleClose();
      setAlert({
        open: true,
        message: response?.success
          ? response?.message || "Backup restaurado correctamente"
          : response?.error || "Error al restaurar el backup",
        severity: response?.success ? "success" : "error",
      });
    } catch (e) {
      handleClose();
      setAlert({
        open: true,
        message: e.message || "Error inesperado al restaurar el backup",
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseAlert = (event, reason) => {
    if (reason === "clickaway") return;
    setAlert((prev) => ({ ...prev, open: false }));
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const resp = await backupService.syncAltSheet();
      if (!resp?.success) {
        setAlert({
          open: true,
          message: resp?.error || "Error al sincronizar Google Sheet alternativo",
          severity: "error",
        });
        return;
      }
      const compDocs = resp?.detalle?.comprobantes?.createdDocs || [];
      const pagosDocs = resp?.detalle?.pagos?.createdDocs || [];
      const entregaDocs = resp?.detalle?.entregas?.createdDocs || [];
      setSyncData({
        comprobantes: compDocs.map(parseMovimiento),
        pagos: pagosDocs.map(parseMovimiento),
        entregas: entregaDocs.map(parseCuentaPendiente),
      });
      setShowSyncPreview(true);
      setSyncTab(0);
    } catch (e) {
      setAlert({
        open: true,
        message: e?.message || "Error inesperado al sincronizar",
        severity: "error",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfirm = async () => {
    try {
      setIsConfirming(true);
      const movimientoIds = [
        ...syncData.comprobantes.map((d) => d?._id || d?.id).filter(Boolean),
        ...syncData.pagos.map((d) => d?._id || d?.id).filter(Boolean),
      ];
      const cuentaPendienteIds = syncData.entregas.map((d) => d?._id || d?.id).filter(Boolean);
      const resp = await backupService.confirmAltSheet({ movimientoIds, cuentaPendienteIds });
      if (resp?.success) {
        setAlert({
          open: true,
          message: "Documentos confirmados correctamente",
          severity: "success",
        });
        setShowSyncPreview(false);
        setSyncData({ comprobantes: [], entregas: [], pagos: [] });
      } else {
        setAlert({
          open: true,
          message: resp?.error || "Error al confirmar documentos",
          severity: "error",
        });
      }
    } catch (e) {
      setAlert({
        open: true,
        message: e?.message || "Error inesperado al confirmar documentos",
        severity: "error",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  // Columnas (mismo diseño que páginas existentes, sin acciones extra)
  const columnasComprobantes = [
    {
      key: "fechaHoraCreacion",
      label: "Fecha y Hora Creación",
      sortable: true,
      render: (item) => (
        <div>
          <div>{getFechaArgentina(item.fechaCreacion)}</div>
          <div style={{ fontSize: "0.75rem", color: "#666" }}>
            {formatearCampo("hora", item.horaCreacion)}
          </div>
        </div>
      ),
    },
    { key: "fechaFactura", label: "Fecha Factura", sortable: true },
    { key: "cliente", label: "Cliente", sortable: true },
    {
      key: "cuentaDestino",
      label: "Cuenta Destino",
      sortable: true,
      sx: {
        maxWidth: "185px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      },
    },
    { key: "montoYMoneda", label: "Monto Enviado", sortable: true },
    { key: "montoCC", label: "Monto CC", sortable: true },
    { key: "cuentaCorriente", label: "CC", sortable: true },
    { key: "tipoDeCambio", label: "Tipo Cambio", sortable: true },
    { key: "estado", label: "Estado", sortable: true },
    { key: "nombreUsuario", label: "Usuario", sortable: true },
  ];
  const formattersComprobantes = {
    fechaFactura: (value) => getFechaArgentina(value),
    horaCreacion: (value, item) => formatearCampo("hora", value, item),
    nombreUsuario: (value, item) => formatearCampo("nombreUsuario", value, item),
    cuentaDestino: (value, item) => formatearCampo("cuentaDestino", value, item),
    montoYMoneda: (value, item) => formatearCampo("montoYMoneda", value, item),
    cuentaCorriente: (value, item) => formatearCampo("CC", value, item),
    montoCC: (value, item) => formatearCampo("montoCC", value, item),
    tipoDeCambio: (value, item) => formatearCampo("tipoDeCambio", value, item),
    estado: (value, item) => formatearCampo("estado", value, item),
    cliente: (value, item) => {
      let clienteValue;
      if (value && typeof value === "object" && value.nombre) {
        clienteValue = value.nombre;
      } else {
        clienteValue = value || "-";
      }
      return clienteValue;
    },
  };

  const columnasEntregas = [
    {
      key: "fechaHoraCreacion",
      label: "Fecha y Hora Creación",
      sortable: true,
      render: (item) => (
        <div>
          <div>{getFechaArgentina(item.fechaCreacion)}</div>
          <div style={{ fontSize: "0.75rem", color: "#666" }}>{item.horaCreacion}</div>
        </div>
      ),
    },
    { key: "fechaEntrega", label: "Fecha Entrega", sortable: true },
    { key: "clienteNombre", label: "Cliente", sortable: false },
    { key: "descripcion", label: "Descripción", sortable: false },
    { key: "montoEnviado", label: "Monto", sortable: true },
    { key: "monedaDePago", label: "Moneda", sortable: false },
    { key: "CC", label: "CC", sortable: true },
    { key: "descuentoAplicado", label: "Descuento", sortable: false },
    { key: "montoCC", label: "Monto CC", sortable: true },
    { key: "usuario", label: "Usuario", sortable: true },
  ];
  const formattersEntregas = {
    fechaEntrega: (value) => getFechaArgentina(value),
    horaCreacion: (value) => value,
    descripcion: (value, item) => formatearCampo("default", value, item),
    montoEnviado: (value, item) => formatearCampo("montoEnviado", value, item),
    monedaDePago: (value, item) => formatearCampo("monedaDePago", value, item),
    CC: (value, item) => formatearCampo("CC", value, item),
    montoCC: (value, item) => formatearCampo("montoCC", value, item),
    usuario: (value, item) => formatearCampo("nombreUsuario", value, item),
    descuentoAplicado: (value, item) => {
      const formattedValue = `${Math.round(((value ?? 1) - 1) * -100)}%`;
      return formatearCampo("default", formattedValue, item);
    },
  };

  const columnasPagos = [
    {
      key: "fechaHora",
      label: "Fecha y Hora",
      sortable: true,
      render: (item) => (
        <div>
          <div>{getFechaArgentina(item.fechaFactura)}</div>
          <div style={{ fontSize: "0.75rem", color: "#666" }}>
            {formatearCampo("hora", item.horaCreacion)}
          </div>
        </div>
      ),
    },
    { key: "concepto", label: "Concepto", sortable: false },
    { key: "cuentaDestino", label: "Cuenta Origen", sortable: false },
    { key: "montoEnviado", label: "Monto", sortable: false },
    { key: "moneda", label: "Moneda", sortable: false },
    { key: "nombreUsuario", label: "Usuario", sortable: true },
  ];
  const formattersPagos = {
    fechaFactura: (value) => getFechaArgentina(value),
    horaCreacion: (value, item) => formatearCampo("hora", value, item),
    cuentaDestino: (value, item) => formatearCampo("cuentaDestino", value, item),
    moneda: (value, item) => formatearCampo("monedaDePago", value, item),
    montoEnviado: (value, item) => formatearCampo("montoEnviado", value, item),
    nombreUsuario: (value, item) => formatearCampo("default", value, item),
  };

  return (
    <DashboardLayout title="Backups">
      <Head>Backups</Head>
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
      >
        <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: "100%" }}>
          {alert.message}
        </Alert>
      </Snackbar>
      <Container maxWidth="xl">
        <Stack spacing={2}>
          <Box>
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<HistoryIcon />}  
              onClick={handleOpen}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1,
                boxShadow: 2,
                "&:hover": { boxShadow: 4 },
                width: "fit-content",
              }}
            >
              Restaurar Backup Anterior
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              onClick={handleSync}
              sx={{ ml: 2, borderRadius: 2, px: 3, py: 1 }}
              startIcon={isSyncing ? <CircularProgress size={16} /> : null}
              disabled={isSyncing}
            >
              {isSyncing ? "Sincronizando..." : "Sincronizar Google Sheet Alternativo"}
            </Button>
          </Box>
        </Stack>

        <Dialog open={isModalOpen} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Restaurar Base de Datos
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ py: 1 }}>
              <Alert severity="warning" variant="outlined">
                Esta acción <b>eliminará</b> la base de datos actual y la reemplazará por la del
                enlace de Google Sheet. Procede solo si estás seguro.
              </Alert>
              <TextField
                label="Link de Google Sheet"
                fullWidth
                value={googleSheetUrl}
                onChange={(e) => setGoogleSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/..."
                margin="normal"
              />
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Escribí <b>CONFIRMAR, VOY A BORRAR LA BASE DE DATOS ACTUAL PARA REEMPLAZARLA POR EL BACKUP</b> para continuar. Ingresalo aquí abajo:
                </Typography>
                <TextField
                  label="CONFIRMAR ..."
                  fullWidth
                  value={confirmWord}
                  onChange={(e) => setConfirmWord(e.target.value)}
                  margin="normal"
                  error={confirmWord.length > 0 && !isConfirmValid}
                  helperText={
                    confirmWord.length > 0 && !isConfirmValid
                      ? 'Debés escribir exactamente "CONFIRMAR, VOY A BORRAR LA BASE DE DATOS ACTUAL PARA REEMPLAZARLA POR EL BACKUP"'
                      : " "
                  }
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="inherit" disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              color="primary"
              variant="contained"
              disabled={!isConfirmValid || !isUrlFilled || isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
            >
              {isSubmitting ? "Procesando..." : "Realizar Backup"}
            </Button>
          </DialogActions>
        </Dialog>

        {showSyncPreview && (
          <Box sx={{ mt: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Documentos a confirmar (Google Sheet Alternativo)
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button color="inherit" onClick={() => setShowSyncPreview(false)}>
                  Cerrar
                </Button>
                <Button color="primary" variant="contained" onClick={handleConfirm} startIcon={isConfirming ? <CircularProgress size={16} /> : null} disabled={isConfirming}>
                  {isConfirming ? "Confirmando..." : "Confirmar"}
                </Button>
              </Stack>
            </Stack>

            <Tabs
              value={syncTab}
              onChange={(_, v) => setSyncTab(v)}
              sx={{ mb: 2 }}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label={`Comprobantes (${syncData.comprobantes.length})`} />
              <Tab label={`Entregas (${syncData.entregas.length})`} />
              <Tab label={`Pagos (${syncData.pagos.length})`} />
            </Tabs>

            {syncTab === 0 && (
              <DataTable
                data={syncData.comprobantes}
                isLoading={false}
                columns={columnasComprobantes}
                searchFields={[]}
                formatters={formattersComprobantes}
                showSearch={false}
                showDateFilterOptions={false}
                serverSide={false}
                total={syncData.comprobantes.length}
                currentPage={1}
                rowsPerPage={syncData.comprobantes.length || 10}
                onPageChange={() => {}}
                sortField={"fechaCreacion"}
                sortDirection={"desc"}
                onSortChange={() => {}}
                strikeInactive={false}
              />
            )}
            {syncTab === 1 && (
              <DataTable
                data={syncData.entregas}
                isLoading={false}
                columns={columnasEntregas}
                searchFields={[]}
                formatters={formattersEntregas}
                showSearch={false}
                showDateFilterOptions={false}
                serverSide={false}
                total={syncData.entregas.length}
                currentPage={1}
                rowsPerPage={syncData.entregas.length || 10}
                onPageChange={() => {}}
                sortField={"fechaEntrega"}
                sortDirection={"desc"}
                onSortChange={() => {}}
                strikeInactive={false}
              />
            )}
            {syncTab === 2 && (
              <DataTable
                data={syncData.pagos}
                isLoading={false}
                columns={columnasPagos}
                searchFields={[]}
                formatters={formattersPagos}
                showSearch={false}
                showDateFilterOptions={false}
                serverSide={false}
                total={syncData.pagos.length}
                currentPage={1}
                rowsPerPage={syncData.pagos.length || 10}
                onPageChange={() => {}}
                sortField={"fechaFactura"}
                sortDirection={"desc"}
                onSortChange={() => {}}
                strikeInactive={false}
              />
            )}
          </Box>
        )}
      </Container>
    </DashboardLayout>
  );
};

export default BackupsPage;