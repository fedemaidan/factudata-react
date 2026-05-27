import { Stack } from "@mui/material";
import TileButton from "./TileButton";

const OPCIONES_DOCUMENTO = [
  { label: "Partes", tipoBackend: "parte" },
  { label: "Licencias", tipoBackend: "licencia" },
  { label: "Fichadas", tipoBackend: "horas" },
];

export const CATEGORIAS = [
  {
    key: "duplicado",
    label: "Duplicados",
    accentColor: "#ed6c02",
    requiresDocumento: true,
    status: "duplicado",
    opcionesDocumento: OPCIONES_DOCUMENTO,
  },
  {
    key: "faltaTrabajador",
    label: "Falta trabajador",
    accentColor: "#d32f2f",
    requiresDocumento: true,
    status: "incompleto",
    opcionesDocumento: OPCIONES_DOCUMENTO,
  },
  {
    key: "horasNoRedondas",
    label: "Horas no redondas",
    accentColor: "#f9a825",
    requiresDocumento: false,
    status: null,
  },
  {
    key: "horasNocturnas",
    label: "Horas nocturnas",
    accentColor: "#3f51b5",
    requiresDocumento: false,
    status: null,
  },
];

const FilaCategorias = ({ selectedKey, onSelect, disabled = false }) => (
  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ width: "100%" }}>
    {CATEGORIAS.map((cat) => (
      <TileButton
        key={cat.key}
        label={cat.label}
        selected={selectedKey === cat.key && !disabled}
        accentColor={cat.accentColor}
        disabled={disabled}
        onClick={() => onSelect(cat.key)}
      />
    ))}
  </Stack>
);

export default FilaCategorias;
