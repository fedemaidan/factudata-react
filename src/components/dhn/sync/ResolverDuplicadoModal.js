import React, { useEffect, useState, useMemo, useCallback } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  Typography,
  Divider,
  IconButton,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import TrabajosDetectadosList from "../TrabajosDetectadosList";
import ResolverLicenciaManualForm from "../ResolverLicenciaManualForm";
import TrabajadorSelector from "src/components/dhn/TrabajadorSelector";
import TrabajoForm, {
  createEmptyTrabajo,
  parseTrabajadorId,
  normalizeHourValue,
  HORA_FIELDS,
} from "src/components/dhn/TrabajoForm";
import tiposLicenciaService from "src/services/dhn/tiposLicenciaService";
import DhnDriveService from "src/services/dhn/cargarUrlDriveService";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { ImageViewer, useImageViewerState } from "src/components/ImageViewer";

const ComprobanteCardToolbar = ({ viewerState, compact }) => {
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
  const {
    zoom,
    zoomCfg,
    canShowActions,
    handleZoom,
    handleZoomIn,
    handleZoomOut,
    handleRotateLeft,
    handleRotateRight,
    handleReset,
  } = viewerState;

  if (!canShowActions) return null;

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.5}
      sx={{
        flexShrink: 0,
        py: 0.5,
        px: 0.5,
        bgcolor: "action.hover",
        borderRadius: 1,
        flexWrap: "wrap",
      }}
    >
      <Tooltip title="Rotar a la izquierda" placement="top">
        <span>
          <IconButton size="small" onClick={handleRotateLeft} aria-label="Rotar a la izquierda">
            <RotateLeftIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Rotar a la derecha" placement="top">
        <span>
          <IconButton size="small" onClick={handleRotateRight} aria-label="Rotar a la derecha">
            <RotateRightIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Restablecer zoom y rotación" placement="top">
        <span>
          <IconButton size="small" onClick={handleReset} aria-label="Restablecer">
            <RestartAltIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          minWidth: compact ? 120 : 160,
        }}
      >
        <IconButton
          size="small"
          onClick={handleZoomOut}
          disabled={zoom <= zoomCfg.min}
          aria-label="Alejar"
        >
          <ZoomOutIcon fontSize="small" />
        </IconButton>
        <Slider
          size="small"
          value={zoom}
          min={zoomCfg.min}
          max={zoomCfg.max}
          step={zoomCfg.step}
          onChange={(_, v) => handleZoom(Number(v))}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => `${Math.round(v * 100)}%`}
          aria-label="Zoom"
          sx={{ minWidth: 60 }}
          slotProps={{
            valueLabel: {
              sx: { zIndex: (theme) => theme.zIndex.modal + 2 },
            },
          }}
        />
        <IconButton
          size="small"
          onClick={handleZoomIn}
          disabled={zoom >= zoomCfg.max}
          aria-label="Acercar"
        >
          <ZoomInIcon fontSize="small" />
        </IconButton>
      </Box>
    </Stack>
  );
};

const ComprobanteCard = ({
  label,
  url,
  type,
  selected,
  onClick,
  fullHeight,
  viewerState,
  /** Sin clic, sin zoom embebido ni cambio de tamaño (p. ej. asistente «dos trabajos»). */
  readOnly = false,
}) => {
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
  const showAsSelected = readOnly ? false : selected;
  const previewFlex = fullHeight ? (readOnly ? 1 : showAsSelected ? 1 : 0.45) : 1;
  const previewHeight = fullHeight ? "100%" : 160;
  const useViewer = !readOnly && showAsSelected && url && viewerState;

  const handleContentClick = useCallback(
    (e) => {
      if (useViewer) {
        e.stopPropagation();
      }
    },
    [useViewer]
  );

  return (
    <Box
      onClick={readOnly ? undefined : onClick}
      sx={{
        border: 1,
        borderColor: showAsSelected ? "primary.main" : "divider",
        borderRadius: 2,
        p: 2,
        cursor: readOnly ? "default" : "pointer",
        bgcolor: showAsSelected ? "action.selected" : "background.paper",
        transition: readOnly ? "none" : "border-color 0.2s, flex 0.3s ease",
        display: "flex",
        flexDirection: "column",
        flex: readOnly ? 1 : showAsSelected ? 3 : 1,
        minWidth: 0,
        pointerEvents: readOnly ? "none" : "auto",
        userSelect: readOnly ? "none" : "auto",
        ...(fullHeight ? { height: "100%" } : {}),
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Box
        onClick={handleContentClick}
        sx={{
          height: previewHeight,
          borderRadius: 1,
          border: "1px dashed",
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "center",
          bgcolor: "grey.100",
          overflow: useViewer ? "visible" : "hidden",
          flex: previewFlex,
          minHeight: 0,
        }}
      >
        {useViewer ? (
          <>
            <Box sx={{ overflow: "visible", flexShrink: 0, position: "relative", zIndex: 1 }}>
              <ComprobanteCardToolbar viewerState={viewerState} compact={isMdDown} />
            </Box>
            <Box sx={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
              <ImageViewer
                imagenUrl={url}
                viewerState={viewerState}
                leftContent={null}
              />
            </Box>
          </>
        ) : url ? (
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

const SummaryList = ({ title, items = [], responsive = false, narrow = false }) => {
  if (!items.length) return null;
  if (narrow) {
    return (
      <Stack spacing={1.25} sx={{ width: "100%", minWidth: 0 }}>
        {title ? (
          <Typography variant="subtitle2" component="p" sx={{ m: 0 }}>
            {title}
          </Typography>
        ) : null}
        {items.map((item, idx) => (
          <Box
            key={`${item.label}-${idx}-${String(item.value)}`}
            sx={{
              width: "100%",
              minWidth: 0,
              display: "grid",
              gridTemplateColumns: "1fr",
              rowGap: 0.25,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3, fontWeight: 600 }}>
              {item.label}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                minWidth: 0,
                wordBreak: "break-word",
                overflowWrap: "break-word",
                lineHeight: 1.45,
              }}
            >
              {item.value ?? "—"}
            </Typography>
          </Box>
        ))}
      </Stack>
    );
  }
  return (
    <Stack spacing={1}>
      {title ? <Typography variant="subtitle2">{title}</Typography> : null}
      {items.map((item, idx) => (
        <Stack
          key={`${item.label}-${idx}-${String(item.value)}`}
          direction={responsive ? { xs: "column", sm: "row" } : "row"}
          spacing={responsive ? { xs: 0, sm: 1 } : 0}
          justifyContent="space-between"
          alignItems={responsive ? { xs: "stretch", sm: "flex-start" } : "center"}
          sx={{ gap: responsive ? { xs: 0.25, sm: 1 } : 0 }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ flexShrink: 0, ...(responsive ? { maxWidth: { sm: "42%" } } : {}) }}
          >
            {item.label}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              minWidth: 0,
              wordBreak: "break-word",
              overflowWrap: "break-word",
              textAlign: responsive ? { xs: "left", sm: "right" } : "inherit",
              ...(responsive ? { flex: { sm: 1 } } : {}),
            }}
          >
            {item.value ?? "—"}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
};

const buildManualPatch = (data) => {
  if (!data) return null;
  const fields = [
    "trabajadorId",
    "fecha",
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

const hasTrabajadorInfo = (trabajador) => {
  if (!trabajador) {
    return false;
  }
  const getValue = (value) => (value ?? "").toString().trim();
  return Boolean(
    getValue(trabajador.nombre) ||
      getValue(trabajador.apellido) ||
      getValue(trabajador.dni)
  );
};

const MAX_LICENSE_RANGE_DAYS = 14;

const mapTrabajadorIdToFormValue = (id) => {
  if (!id) return null;
  if (typeof id === "object") {
    const raw = id._id != null ? id._id : id;
    const sid = raw?.toString?.() ?? String(raw);
    return { _id: sid, trabajadorId: sid };
  }
  const sid = String(id).trim();
  return { _id: sid, trabajadorId: sid };
};

const buildFechasLicenciasRange = (desde, hasta) => {
  if (!desde?.isValid?.() || !hasta?.isValid?.()) return [];
  const out = [];
  let cur = desde.startOf("day");
  const end = hasta.startOf("day");
  let guard = 0;
  while ((cur.isBefore(end, "day") || cur.isSame(end, "day")) && guard < MAX_LICENSE_RANGE_DAYS + 1) {
    out.push(cur.format("DD/MM/YYYY"));
    cur = cur.add(1, "day");
    guard += 1;
  }
  return out;
};

const LICENCIA_SPLIT_INITIAL = {
  trabajadorSeleccionado: null,
  tipoLicencia: "FC",
  useRange: false,
  fechaIndividual: dayjs(),
  fechaDesde: dayjs(),
  fechaHasta: dayjs(),
};

const SPLIT_WIZARD_STEPS = [
  "Trabajo ya registrado",
  "Comprobante nuevo",
  "Revisar y confirmar",
];

/**
 * Construye el payload newRecord para splitIntoTwo; lanza Error con mensaje claro si falta algo.
 */
function buildSplitNewRecordOrThrow({
  tipoComprobante,
  splitParteTrabajo,
  splitParteFecha,
  splitLicencia,
  incoming,
}) {
  let newRecord;
  if (tipoComprobante === "parte") {
    const tid = parseTrabajadorId(splitParteTrabajo.trabajador);
    if (!tid) {
      throw new Error("Seleccioná un trabajador para el nuevo registro.");
    }
    if (!splitParteFecha?.isValid()) {
      throw new Error("La fecha del nuevo registro no es válida.");
    }
    newRecord = {
      trabajadorId: tid,
      fecha: splitParteFecha.toISOString(),
    };
    HORA_FIELDS.forEach(({ key }) => {
      const v = normalizeHourValue(splitParteTrabajo[key]);
      if (v != null) {
        newRecord[key] = v;
      }
    });
    ["horaInicio", "horaFin", "sector", "horasTrabajadasExcel"].forEach((k) => {
      if (incoming[k] !== undefined && incoming[k] !== null && newRecord[k] === undefined) {
        newRecord[k] = incoming[k];
      }
    });
  } else if (tipoComprobante === "licencia") {
    const tid =
      splitLicencia.trabajadorSeleccionado?._id ||
      splitLicencia.trabajadorSeleccionado?.data?._id;
    if (!tid) {
      throw new Error("Seleccioná un trabajador para el nuevo registro.");
    }
    newRecord = {
      trabajadorId: tid,
      tipoLicencia: splitLicencia.tipoLicencia || "FC",
    };
    if (splitLicencia.useRange) {
      const desde = splitLicencia.fechaDesde;
      const hasta = splitLicencia.fechaHasta;
      if (!desde?.isValid() || !hasta?.isValid()) {
        throw new Error("Las fechas no son válidas.");
      }
      if (hasta.isBefore(desde, "day")) {
        throw new Error("La fecha final no puede ser anterior a la inicial.");
      }
      const fechasLicencias = buildFechasLicenciasRange(desde, hasta);
      if (fechasLicencias.length > MAX_LICENSE_RANGE_DAYS) {
        throw new Error(`El rango no puede superar ${MAX_LICENSE_RANGE_DAYS} días.`);
      }
      if (fechasLicencias.length < 1) {
        throw new Error("Definí un rango de fechas válido.");
      }
      newRecord.fechasLicencias = fechasLicencias;
      newRecord.fecha = desde.toISOString();
    } else {
      if (!splitLicencia.fechaIndividual?.isValid()) {
        throw new Error("La fecha del nuevo registro no es válida.");
      }
      newRecord.fecha = splitLicencia.fechaIndividual.toISOString();
    }
  } else {
    throw new Error("Este tipo de comprobante no admite separar en dos trabajos.");
  }
  return newRecord;
}

function formatTrabajadorLabel(t) {
  if (!t) return "—";
  if (typeof t === "object") {
    const ap = (t.apellido ?? "").toString().trim();
    const nom = (t.nombre ?? "").toString().trim();
    const dni = (t.dni ?? "").toString().trim();
    const parts = [ap && nom ? `${ap}, ${nom}` : ap || nom || ""].filter(Boolean);
    if (dni) parts.push(`DNI ${dni}`);
    return parts.length ? parts.join(" · ") : "—";
  }
  return String(t);
}

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

  const [splitParteFecha, setSplitParteFecha] = useState(() => dayjs());
  const [splitParteTrabajo, setSplitParteTrabajo] = useState(() => createEmptyTrabajo());
  const [splitLicencia, setSplitLicencia] = useState(() => ({ ...LICENCIA_SPLIT_INITIAL }));
  const [tiposLicencia, setTiposLicencia] = useState([]);
  const [splitError, setSplitError] = useState(null);
  const [splitWizardActive, setSplitWizardActive] = useState(false);
  const [splitWizardStep, setSplitWizardStep] = useState(1);
  const [licenciaDraft, setLicenciaDraft] = useState(null);

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

  const isSplitSupported = tipoComprobante === "parte" || tipoComprobante === "licencia";

  const selectedUrl =
    selectedSide === "existing"
      ? existingUrlStorage || safeRow.url_drive || safeRow.url_storage
      : nuevoUrlStorage || row?.url_drive || row?.url_storage || existingUrlStorage;

  const duplicateMessage = duplicateInfo.mensaje;

  const existingViewerState = useImageViewerState(existingUrlStorage || "", open);
  const newViewerState = useImageViewerState(nuevoUrlStorage || "", open);

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
      setSplitWizardActive(false);
      setSplitWizardStep(1);
      setLicenciaDraft(null);
    }
  }, [open]);

  useEffect(() => {
    if (!splitWizardActive) return;
    if (splitWizardStep === 1) {
      setSelectedSide("existing");
    } else if (splitWizardStep === 2) {
      setSelectedSide("new");
    }
  }, [splitWizardActive, splitWizardStep]);

  useEffect(() => {
    if (!open) {
      setSplitError(null);
      return;
    }
    if (!safeRow.duplicateInfo) return;
    const incoming = safeRow.duplicateInfo.incomingUpdate || {};
    if (tipoComprobante === "parte") {
      setSplitParteFecha(incoming.fecha ? dayjs(incoming.fecha) : dayjs());
      const t = createEmptyTrabajo();
      if (incoming.trabajadorId) {
        t.trabajador = mapTrabajadorIdToFormValue(incoming.trabajadorId);
      }
      HORA_FIELDS.forEach(({ key }) => {
        if (incoming[key] != null && incoming[key] !== "") {
          t[key] = incoming[key];
        }
      });
      setSplitParteTrabajo(t);
    } else if (tipoComprobante === "licencia") {
      const init = buildLicenciaInitialData({
        trabajadorSeleccionado: incoming.trabajadorId
          ? mapTrabajadorIdToFormValue(incoming.trabajadorId)
          : null,
        tipoLicencia: incoming.tipoLicencia,
        fechasLicencias: incoming.fechasLicencias,
        fecha: incoming.fecha,
      });
      setSplitLicencia({
        trabajadorSeleccionado: init.trabajadorSeleccionado,
        tipoLicencia: init.tipoLicencia,
        useRange: init.useRange,
        fechaIndividual: init.fechaIndividual,
        fechaDesde: init.fechaDesde,
        fechaHasta: init.fechaHasta,
      });
    }
  }, [open, row?._id, tipoComprobante, safeRow.duplicateInfo]);

  useEffect(() => {
    if (!open || tipoComprobante !== "licencia") return;
    let active = true;
    (async () => {
      try {
        const data = await tiposLicenciaService.getAll();
        if (!active) return;
        setTiposLicencia(Array.isArray(data) ? data : []);
      } catch {
        if (active) setTiposLicencia([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [open, tipoComprobante]);

  const setSplitTrabajoFormAlert = useCallback((payload) => {
    const next = typeof payload === "function" ? null : payload;
    if (next?.message) {
      setSplitError(String(next.message));
    }
  }, []);

  const handleLicenciaDraftChange = useCallback((draft) => {
    setLicenciaDraft(draft);
  }, []);

  const manualPatch = useMemo(() => {
    const merged =
      licenciaDraft && splitWizardActive && tipoComprobante === "licencia"
        ? { ...existingTrabajo, ...licenciaDraft }
        : existingTrabajo;
    return buildManualPatch(merged);
  }, [existingTrabajo, licenciaDraft, splitWizardActive, tipoComprobante]);

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
      const licenciaWizardStep1 = splitWizardActive && splitWizardStep === 1;
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
          suppressActions: licenciaWizardStep1,
          onDraftChange: licenciaWizardStep1 ? handleLicenciaDraftChange : undefined,
        });
      }
      const incomingTrabajador = {
        nombre: incoming.nombre,
        apellido: incoming.apellido,
        dni: incoming.dni,
      };
      const trabajadorDetectado = hasTrabajadorInfo(incomingTrabajador)
        ? incomingTrabajador
        : null;
      const incomingPayload = {
        trabajadorSeleccionado: trabajadorDetectado,
        tipoLicencia: incoming.tipoLicencia,
        fechasLicencias: incoming.fechasLicencias,
        fecha: incoming.fecha,
      };
      const incomingInitial = buildLicenciaInitialData(incomingPayload);
      return wrapper({
        urlStorage: licenciaUrl || safeRow.url_storage,
        rowId: safeRow._id,
        initialData: incomingInitial,
        trabajadorDetectado,
        onCancel: () => {},
        onResolved: () => handleTrabajadorResuelto(),
        onAutoClose: () => {},
        progreso,
        suppressActions: licenciaWizardStep1,
        onDraftChange: licenciaWizardStep1 ? handleLicenciaDraftChange : undefined,
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
    splitWizardActive,
    splitWizardStep,
    handleLicenciaDraftChange,
  ]);

  const isLicenciaConflict = tipoComprobante === "licencia";

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

  const handleAgregarAmbos = useCallback(async () => {
    if (loading) return;
    const result = await onResolve?.({ action: "keepBoth" });
    if (result !== false) {
      onConfirmarYContinuar?.();
    }
  }, [loading, onResolve, onConfirmarYContinuar]);

  const splitLicenciaInitialFormData = useMemo(() => {
    const inc = duplicateInfo.incomingUpdate || {};
    return {
      nombre: String(inc.nombre ?? "").trim(),
      apellido: String(inc.apellido ?? "").trim(),
      dni: String(inc.dni ?? "").trim(),
    };
  }, [duplicateInfo.incomingUpdate]);

  const exitSplitWizard = useCallback(() => {
    setSplitWizardActive(false);
    setSplitWizardStep(1);
    setSplitError(null);
    setLicenciaDraft(null);
    setSelectedSide("existing");
  }, []);

  const startSplitWizard = useCallback(() => {
    setSplitWizardActive(true);
    setSplitWizardStep(1);
    setSplitError(null);
    setLicenciaDraft(null);
  }, []);

  const handleWizardBack = useCallback(() => {
    if (splitWizardStep <= 1) {
      exitSplitWizard();
      return;
    }
    setSplitWizardStep((s) => Math.max(1, s - 1));
    setSplitError(null);
  }, [splitWizardStep, exitSplitWizard]);

  const handleWizardNext = useCallback(() => {
    if (splitWizardStep === 1) {
      if (tipoComprobante === "licencia" && (isLoadingTrabajo || !existingTrabajo)) {
        setSplitError("Esperá a que carguen los datos del trabajo ya registrado.");
        return;
      }
      setSplitError(null);
      setSplitWizardStep(2);
      return;
    }
    if (splitWizardStep === 2) {
      setSplitError(null);
      try {
        buildSplitNewRecordOrThrow({
          tipoComprobante,
          splitParteTrabajo,
          splitParteFecha,
          splitLicencia,
          incoming: duplicateInfo.incomingUpdate || {},
        });
        setSplitWizardStep(3);
      } catch (e) {
        setSplitError(e?.message || String(e));
      }
    }
  }, [
    splitWizardStep,
    tipoComprobante,
    isLoadingTrabajo,
    existingTrabajo,
    splitParteTrabajo,
    splitParteFecha,
    splitLicencia,
    duplicateInfo.incomingUpdate,
  ]);

  const handleSplitIntoTwo = useCallback(async () => {
    if (loading) return;
    setSplitError(null);
    const incoming = duplicateInfo.incomingUpdate || {};
    try {
      const newRecord = buildSplitNewRecordOrThrow({
        tipoComprobante,
        splitParteTrabajo,
        splitParteFecha,
        splitLicencia,
        incoming,
      });
      const result = await onResolve?.({
        action: "splitIntoTwo",
        manualPatch,
        newRecord,
      });
      if (result !== false) {
        exitSplitWizard();
        onConfirmarYContinuar?.();
      }
    } catch (e) {
      const msg = e?.message || String(e);
      setSplitError(msg);
    }
  }, [
    loading,
    duplicateInfo.incomingUpdate,
    duplicateInfo.trabajoExistenteId,
    tipoComprobante,
    splitParteTrabajo,
    splitParteFecha,
    splitLicencia,
    manualPatch,
    onResolve,
    onConfirmarYContinuar,
    exitSplitWizard,
    safeRow._id,
  ]);

  const splitWizardSummary = useMemo(() => {
    const ex = existingTrabajo;
    const exTrab =
      tipoComprobante === "licencia" && licenciaDraft != null
        ? licenciaDraft.trabajadorLabel ||
          (ex?.trabajadorId && typeof ex.trabajadorId === "object"
            ? formatTrabajadorLabel(ex.trabajadorId)
            : "—")
        : ex?.trabajadorId && typeof ex.trabajadorId === "object"
        ? formatTrabajadorLabel(ex.trabajadorId)
        : "—";
    const exTipoLic =
      (licenciaDraft?.tipoLicencia != null ? licenciaDraft.tipoLicencia : ex?.tipoLicencia) ?? "—";
    let exFecha = "—";
    if (tipoComprobante === "licencia") {
      if (licenciaDraft?.fechaLabel) {
        exFecha = licenciaDraft.fechaLabel;
      } else if (licenciaDraft?.fecha) {
        exFecha = dayjs(licenciaDraft.fecha).format("DD/MM/YYYY");
      } else if (ex?.fecha) {
        exFecha = dayjs(ex.fecha).format("DD/MM/YYYY");
      }
    } else if (ex?.fecha) {
      exFecha = dayjs(ex.fecha).format("DD/MM/YYYY");
    }
    const horaLines =
      tipoComprobante === "parte" && ex
        ? HORA_FIELDS.filter(({ key }) => normalizeHourValue(ex[key]) != null).map(
            ({ key, label }) => ({
              label,
              value: String(ex[key]),
            })
          )
        : [];

    const newTid = parseTrabajadorId(splitParteTrabajo.trabajador);
    const newTrabLabel =
      tipoComprobante === "parte"
        ? newTid
          ? splitParteTrabajo.trabajador?.data
            ? formatTrabajadorLabel(splitParteTrabajo.trabajador.data)
            : `ID ${String(newTid).slice(0, 8)}…`
          : "—"
        : formatTrabajadorLabel(
            splitLicencia.trabajadorSeleccionado?.data || splitLicencia.trabajadorSeleccionado
          );

    let newFechaStr = "—";
    let newExtra = [];
    if (tipoComprobante === "parte") {
      newFechaStr = splitParteFecha?.isValid()
        ? splitParteFecha.format("DD/MM/YYYY")
        : "—";
      newExtra = HORA_FIELDS.filter(({ key }) => normalizeHourValue(splitParteTrabajo[key]) != null).map(
        ({ key, label }) => ({ label, value: String(splitParteTrabajo[key]) })
      );
    } else {
      newExtra.push({
        label: "Tipo",
        value: `${splitLicencia.tipoLicencia || "FC"}`,
      });
      if (splitLicencia.useRange && splitLicencia.fechaDesde?.isValid() && splitLicencia.fechaHasta?.isValid()) {
        newFechaStr = `${splitLicencia.fechaDesde.format("DD/MM/YYYY")} → ${splitLicencia.fechaHasta.format(
          "DD/MM/YYYY"
        )}`;
      } else if (splitLicencia.fechaIndividual?.isValid()) {
        newFechaStr = splitLicencia.fechaIndividual.format("DD/MM/YYYY");
      }
    }

    return {
      existing: {
        title: "Registro existente",
        items: [
          { label: "Fecha", value: exFecha },
          { label: "Trabajador", value: exTrab },
          ...(tipoComprobante === "licencia"
            ? [{ label: "Tipo de licencia", value: String(exTipoLic) }]
            : []),
          ...horaLines.map((h) => ({ label: h.label, value: h.value })),
        ],
      },
      nuevo: {
        title: "Nuevo registro",
        items: [
          { label: "Fecha", value: newFechaStr },
          { label: "Trabajador", value: newTrabLabel },
          ...newExtra.map((x) => ({ label: x.label, value: x.value })),
        ],
      },
    };
  }, [
    existingTrabajo,
    licenciaDraft,
    tipoComprobante,
    splitParteTrabajo,
    splitParteFecha,
    splitLicencia,
  ]);

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
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Typography variant="h6">Resolver duplicado</Typography>
        <Tooltip title="Abrir comprobante seleccionado">
          <span>
            <IconButton
              component="a"
              href={selectedUrl}
              target="_blank"
              rel="noreferrer"
              disabled={!selectedUrl}
              size="small"
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
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
          {splitWizardActive && (
            <Stepper activeStep={splitWizardStep - 1} sx={{ mb: 2 }} alternativeLabel>
              {SPLIT_WIZARD_STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          )}

          {splitError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSplitError(null)}>
              {splitError}
            </Alert>
          )}

          {!splitWizardActive && formContent}

          {splitWizardActive && splitWizardStep === 1 && (
            <Stack spacing={2}>
              {tipoComprobante === "licencia" && (isLoadingTrabajo || !existingTrabajo) ? (
                <Typography variant="body2" color="text.secondary">
                  Cargando datos del trabajo…
                </Typography>
              ) : (
                formContent
              )}
            </Stack>
          )}

          {splitWizardActive && splitWizardStep === 2 && (
            <Stack spacing={2}>
              {tipoComprobante === "parte" && (
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <Stack spacing={2} sx={{ maxWidth: 560 }}>
                    <DatePicker
                      label="Fecha del nuevo registro"
                      format="DD/MM/YYYY"
                      value={splitParteFecha}
                      onChange={(v) => setSplitParteFecha(v || dayjs())}
                      slotProps={{ textField: { size: "small" } }}
                    />
                    <TrabajoForm
                      trabajo={splitParteTrabajo}
                      onChange={setSplitParteTrabajo}
                      canDelete={false}
                      setAlert={setSplitTrabajoFormAlert}
                      showTitle={false}
                    />
                  </Stack>
                </LocalizationProvider>
              )}
              {tipoComprobante === "licencia" && (
                <Stack spacing={2} sx={{ maxWidth: 400 }}>
                  <TrabajadorSelector
                    value={splitLicencia.trabajadorSeleccionado}
                    onChange={(selected) =>
                      setSplitLicencia((prev) => ({ ...prev, trabajadorSeleccionado: selected }))
                    }
                    setAlert={setSplitTrabajoFormAlert}
                    initialFormData={splitLicenciaInitialFormData}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={splitLicencia.useRange}
                        onChange={(event) =>
                          setSplitLicencia((prev) => ({
                            ...prev,
                            useRange: event.target.checked,
                          }))
                        }
                      />
                    }
                    label="Usar rango de fechas"
                  />
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    {!splitLicencia.useRange ? (
                      <DatePicker
                        label="Fecha"
                        format="DD/MM/YYYY"
                        value={splitLicencia.fechaIndividual}
                        onChange={(value) =>
                          setSplitLicencia((prev) => ({
                            ...prev,
                            fechaIndividual: value || dayjs(),
                          }))
                        }
                        slotProps={{ textField: { size: "small" } }}
                      />
                    ) : (
                      <Stack direction="row" flexWrap="wrap" sx={{ gap: 2 }}>
                        <DatePicker
                          label="Desde"
                          format="DD/MM/YYYY"
                          value={splitLicencia.fechaDesde}
                          onChange={(value) =>
                            setSplitLicencia((prev) => ({
                              ...prev,
                              fechaDesde: value || dayjs(),
                            }))
                          }
                          slotProps={{
                            textField: { size: "small", sx: { flex: 1, minWidth: 140 } },
                          }}
                        />
                        <DatePicker
                          label="Hasta"
                          format="DD/MM/YYYY"
                          value={splitLicencia.fechaHasta}
                          onChange={(value) =>
                            setSplitLicencia((prev) => ({
                              ...prev,
                              fechaHasta: value || dayjs(),
                            }))
                          }
                          slotProps={{
                            textField: { size: "small", sx: { flex: 1, minWidth: 140 } },
                          }}
                        />
                      </Stack>
                    )}
                  </LocalizationProvider>
                  <FormControl fullWidth size="small">
                    <InputLabel id="split-tipo-licencia-label">Tipo de licencia</InputLabel>
                    <Select
                      labelId="split-tipo-licencia-label"
                      value={splitLicencia.tipoLicencia}
                      label="Tipo de licencia"
                      onChange={(event) =>
                        setSplitLicencia((prev) => ({
                          ...prev,
                          tipoLicencia: event.target.value,
                        }))
                      }
                    >
                      {(tiposLicencia.length
                        ? tiposLicencia
                        : [{ _id: "fallback-fc", codigo: "FC", nombre: "FC" }]
                      ).map((t) => (
                        <MenuItem value={t.codigo} key={t._id}>
                          {t.nombre} ({t.codigo})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              )}
            </Stack>
          )}

          {splitWizardActive && splitWizardStep === 3 && (
            <Stack spacing={1.75} sx={{ width: "100%", minWidth: 0, maxWidth: "100%" }}>
              <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>
                <strong>Paso 3 de 3.</strong> Revisá los datos. Si algo no coincide, usá «Atrás» para volver y
                corregir.
              </Typography>
              <Stack direction="column" spacing={1.5} sx={{ width: "100%", minWidth: 0 }}>
                <Box
                  sx={{
                    width: "100%",
                    minWidth: 0,
                    maxWidth: "100%",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    px: 1.25,
                    py: 1.5,
                    boxSizing: "border-box",
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1, lineHeight: 1.35, fontSize: "0.8125rem" }}>
                    {splitWizardSummary.existing.title}
                  </Typography>
                  <SummaryList title="" items={splitWizardSummary.existing.items} narrow />
                </Box>
                <Box
                  sx={{
                    width: "100%",
                    minWidth: 0,
                    maxWidth: "100%",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    px: 1.25,
                    py: 1.5,
                    boxSizing: "border-box",
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1, lineHeight: 1.35, fontSize: "0.8125rem" }}>
                    {splitWizardSummary.nuevo.title}
                  </Typography>
                  <SummaryList title="" items={splitWizardSummary.nuevo.items} narrow />
                </Box>
              </Stack>
            </Stack>
          )}
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
                viewerState={existingViewerState}
                readOnly={splitWizardActive}
              />
              <ComprobanteCard
                label={'Comprobante nuevo'}
                type={duplicateInfo.comprobanteNuevo?.type}
                url={nuevoUrlStorage}
                selected={selectedSide === "new"}
                onClick={() => setSelectedSide("new")}
                fullHeight
                viewerState={newViewerState}
                readOnly={splitWizardActive}
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
      <DialogActions
        sx={{
          px: 3,
          pb: 2,
          flexWrap: "wrap",
          gap: 1,
          justifyContent: splitWizardActive ? "space-between" : "flex-end",
        }}
      >
        {splitWizardActive ? (
          <>
            <Button onClick={onClose} disabled={loading} sx={{ textTransform: "none" }}>
              Cancelar
            </Button>
            <Box sx={{ flex: 1, minWidth: 8 }} />
            <Button onClick={handleWizardBack} disabled={loading} sx={{ textTransform: "none" }}>
              {splitWizardStep <= 1 ? "Salir del asistente" : "Atrás"}
            </Button>
            {splitWizardStep < 3 && (
              <Button
                variant="contained"
                onClick={handleWizardNext}
                disabled={
                  loading ||
                  (splitWizardStep === 1 &&
                    tipoComprobante === "licencia" &&
                    (isLoadingTrabajo || !existingTrabajo))
                }
                sx={{ textTransform: "none" }}
              >
                Siguiente
              </Button>
            )}
            {splitWizardStep === 3 && (
              <Button
                variant="contained"
                color="secondary"
                onClick={handleSplitIntoTwo}
                disabled={loading || isLoadingTrabajo || actionInProgress === "splitIntoTwo"}
                sx={{ textTransform: "none" }}
              >
                {loading && actionInProgress === "splitIntoTwo"
                  ? "Procesando..."
                  : "Confirmar los dos trabajos"}
              </Button>
            )}
          </>
        ) : (
          <>
            <Button onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            {isLicenciaConflict && (
              <Button
                variant="outlined"
                onClick={handleAgregarAmbos}
                disabled={loading || isLoadingTrabajo}
                sx={{ textTransform: "none" }}
              >
                {loading || isLoadingTrabajo ? "Procesando..." : "Agregar ambos"}
              </Button>
            )}
            {isSplitSupported && (
              <Button
                variant="outlined"
                color="secondary"
                onClick={startSplitWizard}
                disabled={loading || isLoadingTrabajo}
                sx={{ textTransform: "none" }}
              >
                Son dos trabajos distintos…
              </Button>
            )}
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
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ResolverDuplicadoModal;
