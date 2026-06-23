import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppBar,
  Backdrop,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  Divider,
  IconButton,
  MenuItem,
  Slider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import TableViewIcon from "@mui/icons-material/TableView";
import AssignmentIcon from "@mui/icons-material/Assignment";
import SickIcon from "@mui/icons-material/Sick";
import CloseIcon from "@mui/icons-material/Close";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import ReplayIcon from "@mui/icons-material/Replay";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

import { HorasRawTable } from "src/components/dhn/HorasRawModal";
import { ImageViewer, useImageViewerState } from "src/components/ImageViewer";
import { getHourChipSx } from "src/components/dhn/hourChipStyles";
import tiposLicenciaService from "src/services/dhn/tiposLicenciaService";

const SIN_TIPO_LICENCIA = "__sin_tipo__";

const HORA_FIELDS = [
  { key: "horasNormales", label: "Normales" },
  { key: "horas50", label: "50%" },
  { key: "horas100", label: "100%" },
  { key: "horasAltura", label: "Altura" },
  { key: "horasHormigon", label: "Hormigón" },
  { key: "horasZanjeo", label: "Zanjeo" },
  { key: "horasNocturnas", label: "Nocturnas" },
];

const TAB_DEFINITIONS = {
  parte: {
    label: "Parte",
    icon: <AssignmentIcon fontSize="small" />,
  },
  licencia: {
    label: "Licencia",
    icon: <SickIcon fontSize="small" />,
  },
  horas: {
    label: "Fichadas",
    icon: <TableViewIcon fontSize="small" />,
  },
};

const TIPO_TURNO_LABEL = {
  diurno: "Diurno",
  nocturno1: "Nocturno 1",
  nocturno2: "Nocturno 2",
};

const TIPO_TURNO_COLOR = {
  diurno: "primary.main",
  nocturno1: "secondary.main",
  nocturno2: "warning.main",
};

const HORA_MONO_SX = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontVariantNumeric: "tabular-nums",
  fontWeight: 600,
};

const formatFechaLabel = (value) => {
  if (!value) return "-";
  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return "-";
  return fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
};

const formatDni = (value) => {
  if (!value || value === "-") return "-";
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const getTrabajadorDisplayData = (row) => {
  const source = row?.trabajadorId || row?.trabajador || {};
  let nombre = "";
  let dniValue = "";

  if (typeof source === "string") {
    nombre = source;
    dniValue = row?.dni || "";
  } else if (source && typeof source === "object") {
    const apellido = source.apellido ? source.apellido : "";
    const nombreProp = source.nombre ? source.nombre : "";
    nombre = `${apellido} ${nombreProp}`.trim();
    dniValue = source.dni || row?.dni || "";
  }

  if (!nombre) {
    nombre = row?.trabajador || "-";
    dniValue = row?.dni || dniValue;
  }

  return { nombre: nombre || "-", dni: dniValue };
};

const CorreccionConciliacionModal = ({
  open,
  onClose,
  row,
  formHoras,
  onFormHorasChange,
  onSelectExcel,
  onSelectSistema,
  selectionLoading,
  onSave,
}) => {
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
  // Los botones "Horas Sistema / Horas NASA" y el panel "Sheet NASA" solo aplican
  // en conciliación (cuando el padre pasa los handlers de selección). Reutilizado
  // sin esos handlers (ej: edición de un trabajo diario) el modal los oculta.
  const isConciliacion = typeof onSelectExcel === "function" || typeof onSelectSistema === "function";
  const comprobantes = useMemo(() => (Array.isArray(row?.comprobantes) ? row.comprobantes : []), [row]);

  const [tiposLicencia, setTiposLicencia] = useState([]);
  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    tiposLicenciaService
      .getAll()
      .then((items) => {
        if (active) setTiposLicencia(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (active) setTiposLicencia([]);
      });
    return () => {
      active = false;
    };
  }, [open]);

  const tipoLicenciaOptions = useMemo(() => {
    const opts = tiposLicencia.map((t) => ({ value: t.codigo, label: `${t.codigo} — ${t.nombre}` }));
    const current = formHoras?.tipoLicencia;
    if (current && !opts.some((o) => o.value === current)) {
      opts.unshift({ value: current, label: current });
    }
    return opts;
  }, [tiposLicencia, formHoras?.tipoLicencia]);
  const turnosDetectados = useMemo(
    () => (Array.isArray(row?.turnosDetectados) ? row.turnosDetectados : []),
    [row]
  );
  const sheetHoras = row?.sheetHoras || {};
  const sheetItems = useMemo(
    () =>
      [
        { k: "Norm.", v: Number(sheetHoras.horasNormales || 0) },
        { k: "50%", v: Number(sheetHoras.horas50 || 0) },
        { k: "100%", v: Number(sheetHoras.horas100 || 0) },
        { k: "Aº", v: Number(sheetHoras.horasAltura || 0) },
        { k: "Hº", v: Number(sheetHoras.horasHormigon || 0) },
        { k: "Zº/M°", v: Number(sheetHoras.horasZanjeo || 0) },
        { k: "Noc.", v: Number(sheetHoras.horasNocturnas || 0) },
      ].filter((item) => item.v > 0),
    [sheetHoras]
  );

  const tabItems = useMemo(() => {
    return comprobantes.map((comp, index) => {
      const typeKey = comp.type || "otro";
      const tabDef = TAB_DEFINITIONS[typeKey] || { label: comp.type || "Comprobante", icon: null };
      return {
        id: comp._id || `${typeKey}-${index}`,
        type: typeKey,
        label: tabDef.label,
        icon: tabDef.icon,
        fileName: comp?.file_name || comp?.fileName || "",
        url: comp.url || comp.url_storage || "",
        urlStorage: comp.url_storage || comp.url || "",
      };
    });
  }, [comprobantes]);

  const [activeTab, setActiveTab] = useState(0);
  useEffect(() => {
    setActiveTab(0);
  }, [open, tabItems.length]);

  const handleTabChange = useCallback((_event, newValue) => {
    setActiveTab(newValue);
  }, []);

  const activeTabMeta = tabItems[activeTab];
  const activeImageMeta = activeTabMeta?.type !== "horas" ? activeTabMeta : null;
  const imageViewerState = useImageViewerState(activeImageMeta?.url || "", Boolean(open && activeImageMeta));

  const handleHorasFieldChange = useCallback(
    (field, value) => {
      if (typeof onFormHorasChange !== "function") return;
      onFormHorasChange((prev) => ({
        ...prev,
        [field]: value === "" ? null : Number(value),
      }));
    },
    [onFormHorasChange]
  );

  const handleLicenciaChange = useCallback(
    (event) => {
      if (typeof onFormHorasChange !== "function") return;
      const value = event.target.value;
      const isLicencia = value !== "";
      onFormHorasChange((prev) => ({
        ...prev,
        fechaLicencia: isLicencia,
        tipoLicencia: isLicencia && value !== SIN_TIPO_LICENCIA ? value : null,
      }));
    },
    [onFormHorasChange]
  );

  // Valor del select: vacío = sin licencia; un código = licencia de ese tipo.
  // SIN_TIPO_LICENCIA cubre registros viejos con licencia marcada pero sin tipo.
  const licenciaValue = formHoras?.fechaLicencia
    ? (formHoras?.tipoLicencia || SIN_TIPO_LICENCIA)
    : "";

  const handleSelectExcelClick = useCallback(async () => {
    if (typeof onSelectExcel === "function") {
      await onSelectExcel();
    }
  }, [onSelectExcel]);

  const handleSelectSistemaClick = useCallback(async () => {
    if (typeof onSelectSistema === "function") {
      await onSelectSistema();
    }
  }, [onSelectSistema]);

  const handleGuardar = useCallback(
    async () => {
      if (typeof onSave === "function") {
        await onSave();
      }
    },
    [onSave]
  );

  const { nombre, dni } = getTrabajadorDisplayData(row);
  const fechaLabel = formatFechaLabel(row?.fecha);
  const dniLabel = formatDni(dni);
  const renderHeaderControls = () => {
    if (!activeImageMeta) return null;
    const {
      canShowActions,
      handleZoom,
      handleZoomIn,
      handleZoomOut,
      handleRotateLeft,
      handleRotateRight,
      handleReset,
      zoom,
      zoomCfg,
    } = imageViewerState;

    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          flexWrap: "wrap",
        }}
      >
        <Tooltip title="Rotar a la izquierda" placement="bottom">
          <span>
            <IconButton onClick={handleRotateLeft} disabled={!canShowActions} size="small">
              <RotateLeftIcon />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Rotar a la derecha" placement="bottom">
          <span>
            <IconButton onClick={handleRotateRight} disabled={!canShowActions} size="small">
              <RotateRightIcon />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Restablecer" placement="bottom">
          <span>
            <IconButton onClick={handleReset} disabled={!canShowActions} size="small">
              <ReplayIcon />
            </IconButton>
          </span>
        </Tooltip>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1,
            minWidth: 240,
            flex: 1,
          }}
        >
          <Tooltip title="Alejar" placement="bottom">
            <span>
              <IconButton
                onClick={handleZoomOut}
                disabled={!canShowActions || zoom <= zoomCfg.min}
                size={isMdDown ? "small" : "medium"}
              >
                <ZoomOutIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Slider
            value={zoom}
            min={zoomCfg.min}
            max={zoomCfg.max}
            step={zoomCfg.step}
            onChange={(_, value) => handleZoom(Number(value))}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
            aria-label="Zoom"
            sx={{ flex: 1 }}
          />

          <Tooltip title="Acercar" placement="bottom">
            <span>
              <IconButton
                onClick={handleZoomIn}
                disabled={!canShowActions || zoom >= zoomCfg.max}
                size={isMdDown ? "small" : "medium"}
              >
                <ZoomInIcon />
              </IconButton>
            </span>
          </Tooltip>
          <CloseIcon onClick={onClose} size="small" sx={{ cursor: "pointer", color: "text.secondary", hover: { color: "text.primary" } }} />
        </Box>
      </Box>
    );
  };

  const tabsArea = (
    <>
      {tabItems.length > 1 && (
        <Tabs
          value={Math.min(activeTab, tabItems.length - 1)}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ borderBottom: 1, borderColor: "divider", mb: 0 }}
        >
          {tabItems.map((tab) => (
            <Tab key={tab.id} icon={tab.icon} iconPosition="start" label={tab.label} />
          ))}
        </Tabs>
      )}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          pt: 0,
        }}
      >
        {tabItems.length === 0 && (
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography color="text.secondary">No hay comprobantes disponibles.</Typography>
          </Box>
        )}

        {tabItems.length > 0 && (
          <Stack direction="column" spacing={0} sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ minHeight: 32 }}>
              {activeTabMeta?.fileName && (
                <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 0 }} noWrap>
                  {activeTabMeta.fileName}
                </Typography>
              )}
              {activeTabMeta?.type === "horas" && activeTabMeta?.url && (
                <Button
                  component="a"
                  href={activeTabMeta.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  variant="outlined"
                  startIcon={<FileDownloadIcon />}
                  sx={{ textTransform: "none" }}
                >
                  Descargar Excel
                </Button>
              )}
            </Stack>
            {activeTabMeta?.type === "horas" ? (
              <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                {turnosDetectados.length > 0 && (
                  <Box
                    sx={{
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                      backgroundColor: "background.paper",
                      px: 1.5,
                      py: 1,
                    }}
                  >
                    <Stack spacing={0.75} divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}>
                      {turnosDetectados.map((turno, idx) => {
                        const label = TIPO_TURNO_LABEL[turno.tipo] || turno.tipo;
                        const dotColor = TIPO_TURNO_COLOR[turno.tipo] || "text.disabled";
                        const nominalText =
                          turno.varianteEntrada && turno.varianteSalida
                            ? `${turno.varianteEntrada} → ${turno.varianteSalida}`
                            : turno.varianteSalida
                            ? `— → ${turno.varianteSalida}`
                            : turno.varianteEntrada
                            ? `${turno.varianteEntrada} → —`
                            : "—";
                        const realText =
                          turno.entradaReal || turno.salidaReal
                            ? `${turno.entradaReal || "—"} → ${turno.salidaReal || "—"}`
                            : "—";
                        const calcText =
                          turno.entradaFinal && turno.salidaFinal
                            ? `${turno.entradaFinal} → ${turno.salidaFinal}`
                            : "—";

                        const Segment = ({ caption, value }) => (
                          <Stack direction="row" spacing={0.75} alignItems="baseline">
                            <Typography
                              variant="caption"
                              sx={{
                                color: "text.secondary",
                                textTransform: "uppercase",
                                letterSpacing: 0.4,
                                fontSize: "0.65rem",
                              }}
                            >
                              {caption}
                            </Typography>
                            <Typography variant="body2" sx={HORA_MONO_SX}>
                              {value}
                            </Typography>
                          </Stack>
                        );

                        return (
                          <Stack
                            key={`${turno.tipo}-${idx}`}
                            direction="row"
                            spacing={2}
                            alignItems="center"
                            flexWrap="wrap"
                            useFlexGap
                          >
                            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 110 }}>
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  bgcolor: dotColor,
                                  flexShrink: 0,
                                }}
                              />
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {label}
                              </Typography>
                            </Stack>
                            <Segment caption="Nominal" value={nominalText} />
                            <Box sx={{ color: "text.disabled", fontSize: "0.8rem" }}>·</Box>
                            <Segment caption="Real" value={realText} />
                            <Box sx={{ color: "text.disabled", fontSize: "0.8rem" }}>·</Box>
                            <Segment caption="Calculado" value={calcText} />
                          </Stack>
                        );
                      })}
                    </Stack>
                  </Box>
                )}
                <Box sx={{ flex: 1, minHeight: 0 }}>
                  <HorasRawTable rows={row?.dataRawExcel || []} />
                </Box>
              </Box>
            ) : (
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <ImageViewer imagenUrl={activeImageMeta?.url} viewerState={imageViewerState} />
              </Box>
            )}
          </Stack>
        )}
      </Box>
    </>
  );

  return (
    <Dialog fullScreen open={open} onClose={onClose}>
      <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography variant="h6" noWrap>
              {nombre}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {fechaLabel}{dniLabel && dniLabel !== "-" ? ` · DNI ${dniLabel}` : ""}
            </Typography>
          </Stack>
          <Box sx={{ flex: 1 }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {renderHeaderControls()}
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: "flex" ,flex: 1, minHeight: 0, flexDirection: { xs: "column", md: "row" } }}>
        <Box
          sx={{
            width: { xs: "100%", md: 360 },
            borderRight: { md: "1px solid" },
            borderColor: "divider",
            backgroundColor: "background.paper",
            p: 3,
            overflowY: "auto",
            flexShrink: 0,
          }}
        >
          <Stack spacing={2}>
            {isConciliacion && (
              <>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleSelectSistemaClick}
                    disabled={selectionLoading}
                    sx={{ textTransform: "none" }}
                  >
                    Horas Sistema
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleSelectExcelClick}
                    disabled={selectionLoading}
                    sx={{ textTransform: "none" }}
                  >
                    Horas NASA
                  </Button>
                </Stack>
                <Divider />
              </>
            )}
            <Stack
              direction="row"
              spacing={2}
              sx={{
                flexWrap: { xs: "wrap", sm: "nowrap" },
              }}
            >
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {isConciliacion ? "Sistema" : "Horas"}
                </Typography>
                <Stack spacing={1} sx={{ flexWrap: "wrap" }}>
                  {HORA_FIELDS.map((field) => (
                    <TextField
                      key={field.key}
                      label={field.label}
                      type="number"
                      inputProps={{ step: "0.5", min: 0 }}
                      value={formHoras?.[field.key] ?? ""}
                      onChange={(event) => handleHorasFieldChange(field.key, event.target.value)}
                      size="small"
                      sx={{
                        maxWidth: 140,
                      }}
                    />
                  ))}
                </Stack>
                <Box sx={{ mt: 1.5 }}>
                  <TextField
                    select
                    fullWidth
                    label="Licencia"
                    value={licenciaValue}
                    onChange={handleLicenciaChange}
                    size="small"
                    sx={{ maxWidth: 240 }}
                  >
                    <MenuItem value="">Sin licencia</MenuItem>
                    {licenciaValue === SIN_TIPO_LICENCIA && (
                      <MenuItem value={SIN_TIPO_LICENCIA}>Licencia (sin tipo)</MenuItem>
                    )}
                    {tipoLicenciaOptions.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              </Box>
              {isConciliacion && (
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Sheet NASA
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {sheetItems.length === 0 ? (
                      <Typography variant="caption" color="text.secondary">
                        Sin horas en sheet
                      </Typography>
                    ) : (
                      sheetItems.map((item) => (
                        <Chip
                          key={item.k}
                          label={`${item.k} ${item.v} hs`}
                          size="small"
                          variant="outlined"
                          sx={getHourChipSx(item.k)}
                        />
                      ))
                    )}
                  </Stack>
                </Box>
              )}
            </Stack>
            {turnosDetectados.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Horario detectado
                </Typography>
                <Stack spacing={0.5}>
                  {turnosDetectados.map((turno, idx) => {
                    const label = TIPO_TURNO_LABEL[turno.tipo] || turno.tipo;
                    const variante =
                      turno.varianteEntrada && turno.varianteSalida
                        ? `${turno.varianteEntrada} → ${turno.varianteSalida}`
                        : turno.varianteSalida
                        ? `→ ${turno.varianteSalida}`
                        : turno.varianteEntrada
                        ? `${turno.varianteEntrada} →`
                        : "-";
                    const real =
                      turno.entradaReal || turno.salidaReal
                        ? `${turno.entradaReal || "-"} → ${turno.salidaReal || "-"}`
                        : null;
                    const calculado =
                      turno.entradaFinal && turno.salidaFinal
                        ? `${turno.entradaFinal} → ${turno.salidaFinal}`
                        : null;
                    return (
                      <Box
                        key={`${turno.tipo}-${idx}`}
                        sx={{
                          borderLeft: 3,
                          borderColor: "primary.light",
                          pl: 1,
                          py: 0.25,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {label}: {variante}
                        </Typography>
                        {real && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            Real: {real}
                          </Typography>
                        )}
                        {calculado && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            Calculado: {calculado}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button variant="text" onClick={onClose}>
                Cancelar
              </Button>
              <Button variant="contained" onClick={handleGuardar} disabled={selectionLoading}>
                Guardar
              </Button>
            </Box>
          </Stack>
        </Box>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            px: 2,
            py: 0,
            backgroundColor: "background.default",
          }}
        >
          {tabsArea}
        </Box>
      </Box>
      <Backdrop
        open={selectionLoading}
        sx={(theme) => ({
          zIndex: theme.zIndex.modal + 1,
          color: theme.palette.common.white,
        })}
      >
        <Stack spacing={1} alignItems="center">
          <CircularProgress color="inherit" />
          <Typography>Guardando...</Typography>
        </Stack>
      </Backdrop>
    </Dialog>
  );
};

export default CorreccionConciliacionModal;
