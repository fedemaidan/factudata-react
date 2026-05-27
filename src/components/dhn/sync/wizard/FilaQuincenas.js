import { IconButton, Stack, Tooltip } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TileButton from "./TileButton";

const QUINCENA_ACCENT = "#2e7d32";

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
  onSelectQuincena,
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
        selected={selectedKey === q.key}
        accentColor={QUINCENA_ACCENT}
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
  </Stack>
);

export default FilaQuincenas;
