import { Stack, Typography } from "@mui/material";
import TileButton from "./TileButton";

const FilaTiposDocumento = ({ opciones, selectedTipo, onSelect, accentColor, label }) => (
  <Stack spacing={1.5} sx={{ width: "100%" }}>
    {label ? (
      <Typography
        variant="caption"
        sx={{
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          fontWeight: 600,
          color: "text.secondary",
        }}
      >
        {label}
      </Typography>
    ) : null}
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
      {opciones.map((opt) => (
        <TileButton
          key={opt.tipoBackend}
          label={opt.label}
          selected={selectedTipo === opt.tipoBackend}
          accentColor={accentColor}
          onClick={() => onSelect(opt.tipoBackend)}
          size="md"
        />
      ))}
    </Stack>
  </Stack>
);

export default FilaTiposDocumento;
