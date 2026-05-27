import { Stack } from "@mui/material";
import TileButton from "./TileButton";
import { DOCUMENTOS } from "./erroresCatalogo";

const FilaDocumento = ({ selectedKey, onSelect }) => (
  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ width: "100%" }}>
    {DOCUMENTOS.map((doc) => (
      <TileButton
        key={doc.key}
        label={doc.label}
        selected={selectedKey === doc.key}
        accentColor={doc.accentColor}
        onClick={() => onSelect(doc.key)}
      />
    ))}
  </Stack>
);

export default FilaDocumento;
