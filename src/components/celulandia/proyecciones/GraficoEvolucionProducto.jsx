import { useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import TrendingFlatRoundedIcon from "@mui/icons-material/TrendingFlatRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import { LineChart } from "@mui/x-charts/LineChart";

const MESES_CORTOS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

// "2025-01" / { anio, mesNum } → "Ene 25"
function formatMesLabel(item) {
  const mesNum = Number(item?.mesNum) || 1;
  const anio = item?.anio != null ? String(item.anio).slice(-2) : "";
  return `${MESES_CORTOS[mesNum - 1] || "?"}${anio ? ` ${anio}` : ""}`;
}

function formatNum(value, decimals = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Mapa de clasificación → presentación (ícono, color del tema, etiqueta humana).
const CLASIF = {
  sube: { Icon: TrendingUpRoundedIcon, color: "success", label: "En alza" },
  baja: { Icon: TrendingDownRoundedIcon, color: "error", label: "En baja" },
  estable: { Icon: TrendingFlatRoundedIcon, color: "info", label: "Estable" },
  sin_dato: { Icon: HelpOutlineRoundedIcon, color: "default", label: "Sin datos suficientes" },
};

// Frase en criollo describiendo la variación (no "delta", no jerga).
function fraseVariacion(clasificacion, variacionPct) {
  if (clasificacion === "sin_dato" || variacionPct == null) {
    return "Todavía no hay suficientes meses para comparar.";
  }
  const pct = formatNum(Math.abs(variacionPct), Math.abs(variacionPct) % 1 ? 1 : 0);
  if (clasificacion === "sube") return `Subió ${pct}% respecto del mes pasado.`;
  if (clasificacion === "baja") return `Cayó ${pct}% respecto del mes pasado.`;
  const signo = variacionPct > 0 ? "+" : "";
  return `Se mantuvo estable (${signo}${formatNum(variacionPct, 1)}% vs. el mes pasado).`;
}

/**
 * Gráfico de evolución mensual de un producto. PRESENTACIONAL: recibe la serie y la
 * tendencia ya calculadas por el backend (no fetchea). Muestra ventas/día (línea, métrica
 * principal) sobre el stock disponible (área de fondo) + una tarjeta de "tendencia" en
 * lenguaje no técnico. Mock de referencia: docs/grafico-evolucion-producto.svg.
 *
 * @param {Array}  serie      [{ mes, anio, mesNum, ventasDiarias, ventasPeriodo, diasConStock, stockInicial }]
 * @param {object} tendencia  { ventasDiariasPonderada, variacionPct, clasificacion, mesesConDato }
 * @param {string} codigo
 * @param {string} nombre
 * @param {boolean} loading
 * @param {boolean} error
 */
export default function GraficoEvolucionProducto({ serie, tendencia, codigo, nombre, loading, error }) {
  const theme = useTheme();
  const safeSerie = Array.isArray(serie) ? serie : [];

  const ventasColor = theme.palette.primary.main;
  const stockColor = theme.palette.mode === "dark" ? theme.palette.grey[500] : theme.palette.grey[400];

  const { xLabels, ventasData, stockData } = useMemo(() => {
    return {
      xLabels: safeSerie.map(formatMesLabel),
      ventasData: safeSerie.map((m) => (Number.isFinite(Number(m?.ventasDiarias)) ? Number(m.ventasDiarias) : 0)),
      stockData: safeSerie.map((m) => (Number.isFinite(Number(m?.stockInicial)) ? Number(m.stockInicial) : 0)),
    };
  }, [safeSerie]);

  if (loading) {
    return (
      <Stack alignItems="center" spacing={1.5} sx={{ py: 8 }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary">
          Buscando el historial de ventas…
        </Typography>
      </Stack>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <Typography variant="body2" color="error">
          No pudimos cargar la evolución de este producto. Probá de nuevo en un momento.
        </Typography>
      </Box>
    );
  }

  if (safeSerie.length === 0) {
    return (
      <Stack alignItems="center" spacing={1.25} sx={{ py: 7, px: 2, textAlign: "center" }}>
        <ShowChartRoundedIcon sx={{ fontSize: 40, color: "text.disabled" }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Todavía no hay historial de este producto
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
          La historia se va llenando sola: cada proyección nueva guarda cómo se vendió y cuánto
          stock había. Con un par de meses vas a poder ver la evolución acá.
        </Typography>
      </Stack>
    );
  }

  const clasif = CLASIF[tendencia?.clasificacion] || CLASIF.sin_dato;
  const ChipIcon = clasif.Icon;
  const tieneStock = Number(safeSerie[safeSerie.length - 1]?.stockInicial) > 0;
  const enBajaConStock = tendencia?.clasificacion === "baja" && tieneStock;

  return (
    <Box>
      {/* Encabezado */}
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
          Evolución del producto{codigo ? ` · ${codigo}` : ""}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Cómo vinieron las ventas por día y el stock en los últimos meses
          {nombre ? ` · ${nombre}` : ""}
        </Typography>
      </Box>

      {/* Gráfico: stock (área de fondo) + ventas/día (línea protagonista) */}
      <Box
        sx={{
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: 1,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <LineChart
          height={340}
          margin={{ left: 56, right: 60, top: 24, bottom: 28 }}
          xAxis={[{ scaleType: "point", data: xLabels }]}
          yAxis={[
            { id: "ventas", min: 0 },
            { id: "stock", min: 0 },
          ]}
          leftAxis="ventas"
          rightAxis="stock"
          series={[
            {
              id: "stock",
              label: "Stock disponible",
              data: stockData,
              yAxisKey: "stock",
              area: true,
              showMark: false,
              curve: "monotoneX",
              color: stockColor,
              valueFormatter: (v) => (v == null ? "—" : `${formatNum(v)} u`),
            },
            {
              id: "ventas",
              label: "Ventas por día",
              data: ventasData,
              yAxisKey: "ventas",
              showMark: true,
              curve: "monotoneX",
              color: ventasColor,
              valueFormatter: (v) => (v == null ? "—" : `${formatNum(v, 1)} por día`),
            },
          ]}
          sx={{
            px: 1.5,
            // Línea de ventas marcada; stock como sombra suave de fondo.
            "& .MuiLineElement-series-ventas": { strokeWidth: 3 },
            "& .MuiLineElement-series-stock": { strokeWidth: 1.5, opacity: 0.5 },
            "& .MuiAreaElement-series-stock": { fill: alpha(stockColor, 0.16) },
            "& .MuiMarkElement-series-ventas": { fill: ventasColor, stroke: theme.palette.background.paper },
          }}
        />
      </Box>

      {/* Tarjeta de tendencia: el "qué significa" en criollo */}
      <Card
        variant="outlined"
        sx={{
          mt: 1.75,
          borderRadius: 2,
          borderColor: clasif.color === "default" ? "divider" : alpha(theme.palette[clasif.color].main, 0.4),
          bgcolor: clasif.color === "default"
            ? theme.palette.background.default
            : alpha(theme.palette[clasif.color].main, 0.06),
        }}
      >
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
            <Chip
              icon={<ChipIcon sx={{ fontSize: 18 }} />}
              label={clasif.label}
              color={clasif.color === "default" ? undefined : clasif.color}
              size="small"
              sx={{ fontWeight: 700 }}
            />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {fraseVariacion(tendencia?.clasificacion, tendencia?.variacionPct)}
            </Typography>
          </Stack>

          {tendencia?.ventasDiariasPonderada != null ? (
            <Typography variant="body2" color="text.secondary">
              Ritmo esperado:{" "}
              <Box component="span" sx={{ fontWeight: 700, color: "primary.main" }}>
                {formatNum(tendencia.ventasDiariasPonderada, 1)} por día
              </Box>{" "}
              — promedio de los últimos {formatNum(tendencia?.mesesConDato)} meses, dándole más
              peso a los recientes.
            </Typography>
          ) : null}

          {enBajaConStock ? (
            <Typography variant="body2" sx={{ mt: 1, fontWeight: 600, color: "error.dark" }}>
              ⚠️ Viene cayendo y todavía tenés stock: puede ser momento de revisar el precio,
              relanzarlo o frenar las compras.
            </Typography>
          ) : null}
        </CardContent>
      </Card>
    </Box>
  );
}
