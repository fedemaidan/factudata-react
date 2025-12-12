import React from "react";
import { Chip } from "@mui/material";

export default function StatusCircle({ value, color = "error", size = 22, tooltip = "" }) {
  // Mantener firma (size/tooltip) por compatibilidad, pero el estilo es el mismo del mock:
  // <Chip label={...} color="..." variant="filled" size="small" />
  void size;
  void tooltip;
  return <Chip label={value} color={color} variant="filled" size="small" />;
}
