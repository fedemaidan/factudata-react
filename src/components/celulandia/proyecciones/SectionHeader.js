import React from "react";
import { Stack, Typography } from "@mui/material";

const SectionHeader = ({ title, action }) => (
  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
    <Typography variant="h5">{title}</Typography>
    {action}
  </Stack>
);

export default SectionHeader;
