import React from "react";
import { Box, Chip, SvgIcon, Tooltip, Typography } from "@mui/material";
import { formatDateDDMMYYYY } from "src/utils/handleDates";

export const PedidoArriboChip = ({ total = 0, infoArribo }) => {
  if (!infoArribo) {
    return total;
  }

  const fechaLabel = formatDateDDMMYYYY(infoArribo.fecha);
  const diaMesLabel = fechaLabel && fechaLabel !== "-" ? fechaLabel.slice(0, 5) : fechaLabel;

  return (
    <Box display="flex" alignItems="center" justifyContent="flex-start" gap={1}>
      <Typography variant="body2">
        {total}
      </Typography>
      <Tooltip title={`Pedido llegando el ${fechaLabel}`}>
        <Chip
          icon={
            <SvgIcon>
              <path d="m16 6 2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
            </SvgIcon>
          }
          label={`+${infoArribo.cantidad} ${diaMesLabel}`}
          color="info"
          variant="outlined"
          size="small"
        />
      </Tooltip>
    </Box>
  );
};

export default PedidoArriboChip;
