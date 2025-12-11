import { Chip } from "@mui/material";

export const SeAgotaChip = (item) => (
  <Chip label={item.seAgota ? "Sí" : "No"} color={item.seAgota ? "error" : "success"} size="small" />
);