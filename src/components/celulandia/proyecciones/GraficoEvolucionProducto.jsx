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
 * Un gráfico (una sola variable). Lo usamos dos veces — ventas/día y stock — en vez de
 * un único gráfico de doble eje, porque mezclar dos escalas distintas en el mismo eje Y
 * confunde. Comparten el eje X (los meses) para que se lean alineados.
 */
function ChartPanel({ title, caption, data, xLabels, color, area, decimals, suffix, theme }) {
  const seriesId = area ? "stock" : "ventas";
  return (
    <Box
      sx={{
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: 1,
        overflow: "hidden",
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, pt: 1.5 }} useFlexGap flexWrap="wrap">
        <Box sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: color, flexShrink: 0 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {caption ? (
          <Typography variant="caption" color="text.secondary">
            {caption}
          </Typography>
        ) : null}
      </Stack>
      <LineChart
        height={210}
        margin={{ left: 56, right: 24, top: 14, bottom: 28 }}
        xAxis={[{ scaleType: "point", data: xLabels }]}
        yAxis={[{ min: 0 }]}
        series={[
          {
            id: seriesId,
            data,
            area: Boolean(area),
            showMark: !area,
            curve: "monotoneX",
            color,
            valueFormatter: (v) => (v == null ? "—" : `${formatNum(v, decimals)}${suffix}`),
          },
        ]}
        slotProps={{ legend: { hidden: true } }}
        sx={{
          px: 1.5,
          [`& .MuiLineElement-series-${seriesId}`]: { strokeWidth: area ? 1.5 : 3, opacity: area ? 0.6 : 1 },
          ...(area
            ? { [`& .MuiAreaElement-series-${seriesId}`]: { fill: alpha(color, 0.16) } }
            : { [`& .MuiMarkElement-series-${seriesId}`]: { fill: color, stroke: theme.palette.background.paper } }),
        }}
      />
    </Box>
  );
}

/**
 * Gráfico de evolución mensual de un producto. PRESENTACIONAL: recibe la serie y la
 * tendencia ya calculadas por el backend (no fetchea). Muestra DOS gráficos separados —
 * ventas/día y stock disponible, cada uno con su propia escala — + una tarjeta de
 * "tendencia" en lenguaje no técnico. Mock de referencia: docs/grafico-evolucion-producto.svg.
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

      {/* Dos gráficos separados: cada variable con su propia escala (no doble eje Y). */}
      <Stack spacing={1.5}>
        <ChartPanel
          title="Ventas por día"
          caption="unidades vendidas por día"
          data={ventasData}
          xLabels={xLabels}
          color={ventasColor}
          decimals={1}
          suffix=" por día"
          theme={theme}
        />
        <ChartPanel
          title="Stock disponible"
          caption="unidades en depósito"
          data={stockData}
          xLabels={xLabels}
          color={stockColor}
          area
          decimals={0}
          suffix=" u"
          theme={theme}
        />
      </Stack>

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
