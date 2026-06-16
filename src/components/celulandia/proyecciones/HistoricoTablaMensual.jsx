import { useTheme } from "@mui/material/styles";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { formatMesCorto } from "src/utils/celulandia/proyeccionView";

function formatNum(value, decimals = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Tabla de los datos históricos mes a mes de un producto. PRESENTACIONAL: recibe
 * la misma `serie` que el gráfico. Va debajo del gráfico en el tab "Evolución".
 *
 * @param {Array} serie [{ mes, anio, mesNum, ventasDiarias, ventasPeriodo, diasConStock, stockInicial }]
 */
export default function HistoricoTablaMensual({ serie }) {
  const theme = useTheme();
  const filas = Array.isArray(serie) ? serie : [];
  if (filas.length === 0) return null;

  const headSx = {
    position: "sticky",
    top: 0,
    backgroundColor: theme.palette.background.paper,
    zIndex: 1,
    borderBottom: `1px solid ${theme.palette.divider}`,
    fontWeight: 600,
  };

  // Más nuevo arriba: es lo que el usuario quiere mirar primero.
  const filasOrdenadas = [...filas].reverse();

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        Detalle por mes
      </Typography>
      <TableContainer
        component={Box}
        sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, maxHeight: 320, overflowY: "auto" }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={headSx}>Mes</TableCell>
              <TableCell align="right" sx={headSx}>Venta/día</TableCell>
              <TableCell align="right" sx={headSx}>Vendido en el mes</TableCell>
              <TableCell align="right" sx={headSx}>Días con stock</TableCell>
              <TableCell align="right" sx={headSx}>Stock</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filasOrdenadas.map((m) => (
              <TableRow key={m.mes} hover>
                <TableCell>{formatMesCorto(m)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{formatNum(m.ventasDiarias, 1)}</TableCell>
                <TableCell align="right">{formatNum(m.ventasPeriodo)}</TableCell>
                <TableCell align="right">{formatNum(m.diasConStock)}</TableCell>
                <TableCell align="right">{formatNum(m.stockInicial)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
