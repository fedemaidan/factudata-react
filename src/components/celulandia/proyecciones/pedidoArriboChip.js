import React from "react";
import { Box, Chip, Stack, SvgIcon, Tooltip, Typography } from "@mui/material";
import { formatDateDDMMYYYY } from "src/utils/handleDates";

const ArriboIcon = (props) => (
  <SvgIcon {...props}>
    <path d="m16 6 2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
  </SvgIcon>
);

const formatRefs = (lote) => {
  const parts = [
    lote?.contenedorCodigo ? `Cont. ${lote.contenedorCodigo}` : null,
    lote?.numeroPedido ? `Pedido ${lote.numeroPedido}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Sin contenedor ni pedido asignado";
};

const LoteTooltipBody = ({ lote }) => (
  <Stack spacing={0.25}>
    <Typography variant="caption" sx={{ fontWeight: 600 }}>
      Llega el {formatDateDDMMYYYY(lote.fecha)}
    </Typography>
    <Typography variant="caption" sx={{ opacity: 0.85 }}>
      {formatRefs(lote)}
    </Typography>
  </Stack>
);

const LotesListTooltipBody = ({ lotes }) => (
  <Stack spacing={0.75}>
    {lotes.map((lote, idx) => (
      <Box key={`lote-tooltip-${idx}`}>
        <Typography variant="caption" sx={{ fontWeight: 600, display: "block" }}>
          +{lote.cantidad} · {formatDateDDMMYYYY(lote.fecha)}
        </Typography>
        <Typography variant="caption" sx={{ display: "block", opacity: 0.85 }}>
          {formatRefs(lote)}
        </Typography>
      </Box>
    ))}
  </Stack>
);

const LoteChip = ({ lote }) => {
  const fechaLabel = formatDateDDMMYYYY(lote.fecha);
  const diaMes = fechaLabel && fechaLabel !== "-" ? fechaLabel.slice(0, 5) : fechaLabel;
  return (
    <Tooltip title={<LoteTooltipBody lote={lote} />} arrow>
      <Chip
        icon={<ArriboIcon />}
        label={`+${lote.cantidad} ${diaMes}`}
        color="info"
        variant="outlined"
        size="small"
      />
    </Tooltip>
  );
};

export const PedidoArriboChip = ({ total = 0, lotes }) => {
  const arr = Array.isArray(lotes) ? lotes : [];

  if (arr.length === 0) {
    return total;
  }

  const visibles = arr.length <= 2 ? arr : [arr[0]];
  const restantes = arr.length - visibles.length;

  return (
    <Box display="flex" alignItems="center" justifyContent="flex-start" gap={1}>
      <Typography variant="body2">{total}</Typography>
      <Stack direction="column" spacing={0.5} alignItems="flex-start">
        {visibles.map((lote, idx) => (
          <LoteChip key={`lote-chip-${idx}`} lote={lote} />
        ))}
        {restantes > 0 && (
          <Tooltip title={<LotesListTooltipBody lotes={arr} />} arrow>
            <Chip
              label={`+${restantes} más`}
              size="small"
              variant="filled"
              sx={{
                height: 22,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.2,
                bgcolor: (theme) => theme.palette.action.selected,
                color: "text.secondary",
                "& .MuiChip-label": { px: 1 },
              }}
            />
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
};

export default PedidoArriboChip;
