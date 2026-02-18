import { alpha } from "@mui/material/styles";

const colorMap = {
  "Norm.": "#5f6368",
  "50%": "#1976d2",
  "100%": "#c62828",
  "Aº": "#00897b",
  "Hº": "#ef6c00",
  "Zº/M°": "#5e35b1",
  "Noc.": "#283593",
  "Noc. 50%": "#1e88e5",
  "Noc. 100%": "#0d47a1",
};

export const getHourChipSx = (key) => (theme) => {
  const c = colorMap[key] || theme.palette.grey[600];
  return {
    bgcolor: alpha(c, 0.12),
    color: c,
    borderColor: alpha(c, 0.28),
    whiteSpace: "nowrap",
    textTransform: "none",
    minWidth: 110,
    textAlign: "center",
    fontSize: "0.7rem",
  };
};
