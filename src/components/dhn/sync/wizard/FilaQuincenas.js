import { IconButton, Stack, Tooltip } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TuneIcon from "@mui/icons-material/Tune";
import TileButton from "./TileButton";

const QUINCENA_ACCENT = "#2e7d32";
const AVANZADA_ACCENT = "#546e7a";

const NavIconButton = ({ ariaLabel, tooltip, onClick, icon }) => (
  <Tooltip title={tooltip} arrow>
    <IconButton
      aria-label={ariaLabel}
      onClick={onClick}
      size="small"
      sx={{
        alignSelf: "center",
        width: 36,
        height: 36,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        color: "text.secondary",
        transition: "transform 150ms ease, background-color 150ms ease, border-color 150ms ease",
        "&:hover": {
          backgroundColor: "action.hover",
          borderColor: "text.primary",
          color: "text.primary",
          transform: "translateY(-1px)",
        },
      }}
    >
      {icon}
    </IconButton>
  </Tooltip>
);

const FilaQuincenas = ({
  quincenas,
  selectedKey,
  advancedSelected,
  onSelectQuincena,
  onSelectAdvanced,
  onVerAnteriores,
  onVerMasRecientes,
  canVerMasRecientes = false,
  mostrandoActual = true,
}) => (
  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="stretch" sx={{ width: "100%" }}>
    <NavIconButton
      ariaLabel="Ver quincenas anteriores"
      tooltip="Ver quincenas anteriores"
      onClick={onVerAnteriores}
      icon={<ChevronLeftIcon fontSize="small" />}
    />
    {quincenas.map((q, idx) => (
      <TileButton
        key={q.key}
        label={q.label}
        subtitle={mostrandoActual && idx === quincenas.length - 1 ? "Actual" : null}
        selected={selectedKey === q.key && !advancedSelected}
        accentColor={QUINCENA_ACCENT}
        disabled={advancedSelected}
        onClick={() => onSelectQuincena(q.key)}
      />
    ))}
    {canVerMasRecientes ? (
      <NavIconButton
        ariaLabel="Ver quincenas más recientes"
        tooltip="Ver quincenas más recientes"
        onClick={onVerMasRecientes}
        icon={<ChevronRightIcon fontSize="small" />}
      />
    ) : null}
    <TileButton
      label={
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
          <TuneIcon fontSize="small" />
          <span>Configuración avanzada</span>
        </Stack>
      }
      subtitle="Filtros manuales"
      selected={advancedSelected}
      accentColor={AVANZADA_ACCENT}
      onClick={onSelectAdvanced}
    />
  </Stack>
);

export default FilaQuincenas;
