import React, { useEffect, useState, useMemo, useCallback } from "react";
import dayjs from "dayjs";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  Divider,
} from "@mui/material";
import TrabajosDetectadosList from "../TrabajosDetectadosList";
import ResolverLicenciaManualForm from "../ResolverLicenciaManualForm";
import DhnDriveService from "src/services/dhn/cargarUrlDriveService";

const ComprobanteCard = ({ label, url, type, selected, onClick, fullHeight }) => {
  const previewFlex = fullHeight ? (selected ? 1 : 0.45) : 1;
  const previewHeight = fullHeight ? "100%" : 160;

  return (
    <Box
      onClick={onClick}
      sx={{
        border: 1,
        borderColor: selected ? "primary.main" : "divider",
        borderRadius: 2,
        p: 2,
        cursor: "pointer",
        bgcolor: selected ? "action.selected" : "background.paper",
        transition: "border-color 0.2s, flex 0.3s ease",
        display: "flex",
        flexDirection: "column",
        flex: selected ? 3 : 1,
        minWidth: 0,
        ...(fullHeight ? { height: "100%" } : {}),
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Box
        sx={{
          height: previewHeight,
          borderRadius: 1,
          border: "1px dashed",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "grey.100",
          overflow: "hidden",
          flex: previewFlex,
          minHeight: 0,
        }}
      >
        {url ? (
          <Box
            component="img"
            src={url}
            alt={label}
            sx={{
              maxHeight: "100%",
              maxWidth: "100%",
              objectFit: "contain",
            }}
          />
        ) : (
          <Typography variant="body2" color="text.secondary" textAlign="center">
            No se puede previsualizar este archivo.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const SummaryList = ({ title, items = [] }) => {
  if (!items.length) return null;
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{title}</Typography>
      {items.map((item) => (
        <Stack
          key={`${item.label}-${item.value}`}
          direction="row"
          justifyContent="space-between"
        >
          <Typography variant="body2" color="text.secondary">
            {item.label}
          </Typography>
          <Typography variant="body2">{item.value ?? "—"}</Typography>
        </Stack>
      ))}
    </Stack>
  );
};

const buildManualPatch = (data) => {
  if (!data) return null;
  const fields = [
    "horaInicio",
    "horaFin",
    "horasNormales",
    "horas50",
    "horas100",
    "horasAltura",
    "horasHormigon",
    "horasZanjeo",
    "horasNocturnas",
    "horasNocturnas50",
    "horasNocturnas100",
    "fechaLicencia",
    "tipoLicencia",
    "sector",
  ];
  const patch = { estado: "okManual" };
  fields.forEach((field) => {
    if (data[field] !== undefined) {
      patch[field] = data[field];
    }
  });
  return patch;
};

const parseLicenseDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return dayjs();
  const [dia, mes, año] = dateStr.split("/");
  if (!dia || !mes || !año) return dayjs();
  return dayjs(`${año}-${mes}-${dia}`);
};

const buildLicenciaInitialData = (payload = {}) => {
  const fechasLicencias = Array.isArray(payload.fechasLicencias)
    ? payload.fechasLicencias.filter(Boolean)
    : [];
  const fechaIndividual =
    fechasLicencias.length === 1
      ? parseLicenseDate(fechasLicencias[0])
      : payload.fecha
      ? dayjs(payload.fecha)
      : dayjs();
  return {
    trabajadorSeleccionado: payload.trabajadorSeleccionado || null,
    tipoLicencia: payload.tipoLicencia || "FC",
    useRange: fechasLicencias.length > 1,
    fechaIndividual,
    fechaDesde: fechasLicencias.length ? parseLicenseDate(fechasLicencias[0]) : dayjs(),
    fechaHasta: fechasLicencias.length > 1 ? parseLicenseDate(fechasLicencias[fechasLicencias.length - 1]) : dayjs(),
  };
};

const ResolverDuplicadoModal = ({
  open,
  onClose,
  row,
  onResolve,
  loading = false,
  actionInProgress = null,
  progreso,
  onTrabajadorResuelto: onTrabajadorResueltoProp,
  onConfirmarYContinuar,
}) => {
  const safeRow = row || {};
  const duplicateInfo = safeRow.duplicateInfo || {};
  const [selectedSide, setSelectedSide] = useState("existing");
  const [existingTrabajo, setExistingTrabajo] = useState(null);
  const [isLoadingTrabajo, setIsLoadingTrabajo] = useState(false);

  const existingUrlStorage =
    duplicateInfo.comprobanteExistente?.url_drive ||
    duplicateInfo.comprobanteExistente?.url ||
    safeRow.url_storage;
  const nuevoUrlStorage =
    duplicateInfo.comprobanteNuevo?.url ||
    row?.url_drive ||
    row?.url_storage;
  const rowTipo = safeRow.tipo;
  const tipoComprobante =
    duplicateInfo.comprobanteExistente?.type ||
    duplicateInfo.comprobanteNuevo?.type ||
    rowTipo ||
    "parte";

  const duplicateMessage = duplicateInfo.mensaje;

  const fetchExistingTrabajo = useCallback(async (trabajoId) => {
    if (!trabajoId) {
      return null;
    }
    const resp = await DhnDriveService.getTrabajoById(trabajoId);
    if (resp?.ok) {
      return resp.data;
    }
    return null;
  }, []);

  useEffect(() => {
    let active = true;
    const trabajoId = duplicateInfo.trabajoExistenteId;
    if (!trabajoId) {
      setExistingTrabajo(null);
      return;
    }
    setIsLoadingTrabajo(true);
    fetchExistingTrabajo(trabajoId)
      .then((data) => {
        if (!active) return;
        setExistingTrabajo(data);
      })
      .catch(() => {
        if (!active) return;
        setExistingTrabajo(null);
      })
      .finally(() => {
        if (active) {
          setIsLoadingTrabajo(false);
        }
      });
    return () => {
      active = false;
    };
  }, [duplicateInfo.trabajoExistenteId, fetchExistingTrabajo]);

  const handleTrabajadorResuelto = useCallback(async () => {
    const trabajoId = duplicateInfo.trabajoExistenteId;
    if (!trabajoId) {
      setExistingTrabajo(null);
      onTrabajadorResueltoProp?.();
      return;
    }
    setIsLoadingTrabajo(true);
    try {
      const data = await fetchExistingTrabajo(trabajoId);
      setExistingTrabajo(data);
      onTrabajadorResueltoProp?.();
    } catch {
      setExistingTrabajo(null);
      onTrabajadorResueltoProp?.();
    } finally {
      setIsLoadingTrabajo(false);
    }
  }, [duplicateInfo.trabajoExistenteId, fetchExistingTrabajo, onTrabajadorResueltoProp]);

  useEffect(() => {
    if (!open) {
      setSelectedSide("existing");
    }
  }, [open]);

  const manualPatch = useMemo(() => buildManualPatch(existingTrabajo), [existingTrabajo]);

  const formContent = useMemo(() => {
    const incoming = duplicateInfo.incomingUpdate || {};
    if (tipoComprobante === "horas") {
      const data = incoming ?? {};
      return (
        <Stack spacing={1}>
          <Typography variant="h6">Datos del duplicado de horas</Typography>
          <SummaryList
            title="Resumen detectado"
            items={[
              { label: "Fecha", value: data.fecha ?? "—" },
              { label: "Horas totales", value: data.horasTrabajadasExcel?.total ?? "—" },
              { label: "Sector", value: data.sector ?? "—" },
            ]}
          />
          <Typography variant="body2" color="text.secondary">
            No hay formulario asociado; confirmá el comprobante que querés conservar.
          </Typography>
        </Stack>
      );
    }

    if (tipoComprobante === "parte") {
      const parteUrl =
        selectedSide === "existing" ? existingUrlStorage : nuevoUrlStorage || safeRow.url_storage;
      return (
        <Box sx={{ width: "100%", maxWidth: 560 }}>
          <TrabajosDetectadosList
            urlStorage={parteUrl}
            onUpdated={handleTrabajadorResuelto}
            progreso={progreso}
          />
        </Box>
      );
    }

    if (tipoComprobante === "licencia") {
      const wrapper = (props) => (
        <Box
          sx={{
            width: "100%",
            maxWidth: 360,
          }}
        >
          <ResolverLicenciaManualForm {...props} />
        </Box>
      );
      const licenciaUrl = selectedSide === "existing" ? existingUrlStorage : nuevoUrlStorage;
      if (selectedSide === "existing" && existingTrabajo) {
        const existingInitial = buildLicenciaInitialData({
          trabajadorSeleccionado: existingTrabajo.trabajadorId || null,
          tipoLicencia: existingTrabajo.tipoLicencia,
          fechasLicencias: [],
          fecha: existingTrabajo.fecha,
        });
        return wrapper({
          urlStorage: licenciaUrl || safeRow.url_storage,
          rowId: existingTrabajo._id,
          initialData: existingInitial,
          trabajadorDetectado: existingTrabajo.trabajadorId || null,
          onCancel: () => {},
          onResolved: () => handleTrabajadorResuelto(),
          onAutoClose: () => {},
          progreso,
        });
      }
      const incomingPayload = {
        trabajadorSeleccionado: {
          nombre: incoming.nombre,
          apellido: incoming.apellido,
          dni: incoming.dni,
        },
        tipoLicencia: incoming.tipoLicencia,
        fechasLicencias: incoming.fechasLicencias,
        fecha: incoming.fecha,
      };
      const incomingInitial = buildLicenciaInitialData(incomingPayload);
      return wrapper({
        urlStorage: licenciaUrl || safeRow.url_storage,
        rowId: safeRow._id,
        initialData: incomingInitial,
        trabajadorDetectado: incomingPayload.trabajadorSeleccionado,
        onCancel: () => {},
        onResolved: () => handleTrabajadorResuelto(),
        onAutoClose: () => {},
        progreso,
      });
    }

    return null;
  }, [
    tipoComprobante,
    selectedSide,
    duplicateInfo,
    existingTrabajo,
    progreso,
    rowTipo,
    nuevoUrlStorage,
    existingUrlStorage,
    safeRow._id,
    safeRow.url_storage,
    handleTrabajadorResuelto,
  ]);

  const handleConfirm = useCallback(async () => {
    if (loading) return;
    const payload =
      selectedSide === "existing"
        ? { action: "keepExisting", manualPatch }
        : { action: "applyNew" };
    const result = await onResolve?.(payload);
    if (result !== false) {
      onConfirmarYContinuar?.();
    }
  }, [loading, manualPatch, onResolve, onConfirmarYContinuar, selectedSide]);

  if (!row) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          minHeight: "80vh",
        },
      }}
    >
      <DialogTitle>
          <Typography variant="h6">Resolver duplicado</Typography>
      </DialogTitle>
      <DialogContent
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "360px 12px 1fr" },
          gap: 2,
          height: "100%",
        }}
      >
        <Box
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            p: 2,
            bgcolor: "background.paper",
            height: "100%",
            overflowY: "auto",
          }}
        >
          {formContent}
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            minHeight: 0,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flex: 1,
              gap: 2,
              minHeight: 0,
            }}
          >
            <Box
              sx={{
                display: "flex",
                gap: 1,
                flex: 1,
                minHeight: 0,
                alignItems: "stretch",
              }}
            >
              <ComprobanteCard
                label={'Comprobante existente'}
                type={duplicateInfo.comprobanteExistente?.type}
                url={existingUrlStorage}
                selected={selectedSide === "existing"}
                onClick={() => setSelectedSide("existing")}
                fullHeight
              />
              <ComprobanteCard
                label={'Comprobante nuevo'}
                type={duplicateInfo.comprobanteNuevo?.type}
                url={nuevoUrlStorage}
                selected={selectedSide === "new"}
                onClick={() => setSelectedSide("new")}
                fullHeight
              />
            </Box>
          </Box>
          {duplicateMessage && (
            <Typography variant="body2" color="text.secondary">
              {duplicateMessage}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={loading || isLoadingTrabajo}
          sx={{ textTransform: "none" }}
        >
          {loading || isLoadingTrabajo
            ? "Procesando..."
            : selectedSide === "existing"
            ? "Conservar existente"
            : "Aplicar nuevo comprobante"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ResolverDuplicadoModal;
