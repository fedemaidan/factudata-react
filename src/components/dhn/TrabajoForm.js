import React from "react";
import { Grid, IconButton, Stack, TextField, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import TrabajadorSelector from "src/components/dhn/TrabajadorSelector";

let trabajoIdCounter = 0;
const generateTrabajoId = () => {
  trabajoIdCounter += 1;
  return `trabajo-${Date.now().toString(16)}-${trabajoIdCounter}`;
};

export const HORA_FIELDS = [
  { key: "horasNormales", label: "Normales" },
  { key: "horas50", label: "50%" },
  { key: "horas100", label: "100%" },
  { key: "horasAltura", label: "Altura" },
  { key: "horasHormigon", label: "Hormigón" },
  { key: "horasZanjeo", label: "Zanjeo" },
  { key: "horasNocturnas", label: "Nocturnas" },
  { key: "horasNocturnas50", label: "Noct. 50%" },
  { key: "horasNocturnas100", label: "Noct. 100%" },
];

export const normalizeHourValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

export const parseTrabajadorId = (trabajador) => {
  if (!trabajador) return null;
  if (trabajador.trabajadorId) return trabajador.trabajadorId;
  if (trabajador._id) return trabajador._id;
  if (trabajador?.data?._id) return trabajador.data._id;
  return null;
};

export const createEmptyTrabajo = () => ({
  id: generateTrabajoId(),
  trabajador: null,
  horasNormales: "",
  horas50: "",
  horas100: "",
  horasAltura: "",
  horasHormigon: "",
  horasZanjeo: "",
  horasNocturnas: "",
  horasNocturnas50: "",
  horasNocturnas100: "",
});

const TrabajoForm = ({
  trabajo,
  onChange,
  onDelete,
  canDelete = true,
  setAlert,
  title,
  showTitle = true,
}) => {
  const handleFieldChange = (field, value) => {
    onChange?.({ ...trabajo, [field]: value });
  };

  return (
    <Stack spacing={1.5}>
      {showTitle && (
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2">{title || "Trabajador"}</Typography>
          {onDelete && (
            <IconButton size="small" onClick={onDelete} disabled={!canDelete} sx={{ p: 0.5 }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
      )}

      <TrabajadorSelector
        value={trabajo?.trabajador}
        onChange={(selected) => handleFieldChange("trabajador", selected)}
        setAlert={setAlert}
        allowCreate={true}
      />

      <Grid container spacing={1}>
        {HORA_FIELDS.map(({ key, label }) => (
          <Grid key={key} item xs={6} sm={4}>
            <TextField
              label={label}
              size="small"
              type="number"
              fullWidth
              value={trabajo?.[key] ?? ""}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              inputProps={{ min: 0, step: 0.5 }}
            />
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
};

export default TrabajoForm;
