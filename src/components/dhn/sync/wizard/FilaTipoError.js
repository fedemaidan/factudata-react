import { Stack } from "@mui/material";
import TileButton from "./TileButton";
import { ERRORES_POR_DOCUMENTO } from "./erroresCatalogo";

const FilaTipoError = ({ documentoKey, selectedKey, onSelect }) => {
  const errores = ERRORES_POR_DOCUMENTO[documentoKey] || [];
  if (!errores.length) return null;

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ width: "100%" }} useFlexGap flexWrap="wrap">
      {errores.map((err) => (
        <TileButton
          key={err.key}
          label={err.label}
          subtitle={err.todo ? "Próximamente" : null}
          selected={selectedKey === err.key}
          accentColor={err.accentColor}
          onClick={() => onSelect(err.key)}
          size="md"
        />
      ))}
    </Stack>
  );
};

export default FilaTipoError;
