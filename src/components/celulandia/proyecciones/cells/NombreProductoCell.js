import React from "react";
import { Tooltip } from "@mui/material";

const NombreProductoCell = ({ nombre }) => {
  const displayName = nombre || "-";
  return (
    <Tooltip title={displayName} placement="top" arrow>
      <span>{displayName}</span>
    </Tooltip>
  );
};

export default NombreProductoCell;
