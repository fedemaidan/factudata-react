import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import productoService from "src/services/celulandia/productoService";
import { formatDateDDMMYYYY } from "src/utils/handleDates";
import * as XLSX from "xlsx";
import dayjs from "dayjs";

export const useProductos = ({
  sortField = "createdAt",
  sortDirection = "desc",
  page = 0,
  pageSize = 50,
  text = "",
} = {}) => {
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const query = useQuery({
    queryKey: ["productos", sortField, sortDirection, page, pageSize, text],
    queryFn: () =>
      productoService.getAll({
        page: page + 1,
        pageSize,
        sortField,
        sortDirection,
        text,
      }),
    retry: false,
  });

  const invalidateProductos = () => {
    queryClient.invalidateQueries({ queryKey: ["productos"] });
  };

  const handleExportExcel = useCallback(async () => {
    setIsExporting(true);
    try {
      const normalizeText = (value) =>
        String(value ?? "")
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n")
          .trim();

      // Hard-wrap para que el texto no quede en una sola línea infinita en Excel.
      // Esto también permite calcular altura de fila y “ver todo” al abrir el archivo.
      const hardWrapText = (value, maxCharsPerLine = 70) => {
        const raw = normalizeText(value);
        if (!raw) return "";
        const lines = raw.split("\n");
        const wrapped = [];
        lines.forEach((line) => {
          const l = String(line ?? "");
          if (!l) {
            wrapped.push("");
            return;
          }
          for (let i = 0; i < l.length; i += maxCharsPerLine) {
            wrapped.push(l.slice(i, i + maxCharsPerLine));
          }
        });
        return wrapped.join("\n");
      };

      const getNotasString = (notasValue) => {
        if (!Array.isArray(notasValue) || notasValue.length === 0) return "";

        const notasOrdenadas = [...notasValue].sort((a, b) => {
          const ta = new Date(a?.updatedAt ?? a?.fecha ?? 0).getTime();
          const tb = new Date(b?.updatedAt ?? b?.fecha ?? 0).getTime();
          return (Number.isNaN(ta) ? 0 : ta) - (Number.isNaN(tb) ? 0 : tb);
        });

        const lines = notasOrdenadas
          .map((n) => {
            const texto = normalizeText(n?.nota);
            if (!texto) return null;
            const fecha = formatDateDDMMYYYY(n?.updatedAt ?? n?.fecha);
            return fecha ? `- ${fecha}: ${texto}` : `- ${texto}`;
          })
          .filter(Boolean);

        return hardWrapText(lines.join("\n"), 70);
      };

      const getDiasHastaAgotar = (item) => {
        const raw = item?.diasSinStock ?? item?.diasHastaAgotarStock;
        const n = Number(raw);
        if (Number.isFinite(n)) return n;

        const fecha = item?.fechaAgotamientoStock;
        if (!fecha) return null;
        const target = new Date(fecha);
        if (Number.isNaN(target.getTime())) return null;

        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
        const diffDays = Math.ceil((startOfTarget - startOfToday) / (24 * 60 * 60 * 1000));
        return diffDays;
      };

      const getTagsString = (tagsValue) => {
        if (!tagsValue) return "";
        if (Array.isArray(tagsValue)) {
          const names = tagsValue
            .map((t) => {
              if (!t) return null;
              if (typeof t === "string") return t;
              return t?.nombre ?? null;
            })
            .filter(Boolean);
          return names.join(", ");
        }
        if (typeof tagsValue === "string" && tagsValue.trim() !== "") return tagsValue.trim();
        return "";
      };

      const response = await productoService.getAll({
        all: true,
        sortField,
        sortDirection,
        text,
      });

      const allProductos = Array.isArray(response?.data) ? response.data : [];

      if (!Array.isArray(allProductos) || allProductos.length === 0) {
        alert("No hay datos para exportar");
        return;
      }

      const data = allProductos.map((item) => {
        const dias = getDiasHastaAgotar(item);
        const diasValue =
          dias == null
            ? item?.agotamientoExcede365Dias
              ? "+ 1 año"
              : ""
            : String(Math.max(0, Math.trunc(dias)));

        return {
          Código: item?.codigo ?? "",
          Nombre: item?.nombre ?? "",
          Tags: getTagsString(item?.tags),
          "Stock actual": Number(item?.stockActual ?? 0),
          "Ventas período": Number(item?.ventasPeriodo ?? 0),
          "Ventas proyectadas": Number(item?.ventasProyectadas ?? 0),
          "Días p/agotar": diasValue,
          "Stock proyectado (90 días)": Number(item?.stockProyectado ?? 0),
          "Fecha agotamiento": formatDateDDMMYYYY(item?.fechaAgotamientoStock),
          "Cant. a comprar (100 días)": Number(item?.cantidadCompraSugerida ?? 0),
          "Fecha compra sugerida": formatDateDDMMYYYY(item?.fechaCompraSugerida),
          Notas: getNotasString(item?.notas),
        };
      });

      const headers = Object.keys(data[0] || {});
      const ws = XLSX.utils.json_to_sheet(data, { header: headers });
      const wb = XLSX.utils.book_new();

      const prettyNum = (v, dec = 2) =>
        typeof v === "number"
          ? v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec })
          : String(v ?? "");

      const colWidths = headers.map((h) => {
        if (h === "Notas") return { wch: 70 };
        const maxLen = Math.max(
          String(h).length,
          ...data.map((row) => {
            const v = row[h];
            if (typeof v === "number") return prettyNum(v, 0).length;
            return String(v ?? "").length;
          })
        );
        return { wch: Math.min(Math.max(maxLen + 2, 10), 45) };
      });
      ws["!cols"] = colWidths;

      const notasColIdx = headers.findIndex((h) => h === "Notas");
      if (notasColIdx >= 0) {
        ws["!rows"] = new Array(data.length + 1);
        ws["!rows"][0] = { hpt: 20 };
        for (let r = 1; r <= data.length; r++) {
          const rowNotas = data[r - 1]?.Notas ?? "";
          const hasNotas = String(rowNotas || "").trim().length > 0;
          if (hasNotas) {
            const lineCount = String(rowNotas || "").split("\n").length || 1;
            ws["!rows"][r] = { hpt: 15 * Math.max(1, lineCount) };
          }

          const addr = XLSX.utils.encode_cell({ c: notasColIdx, r });
          const cell = ws[addr];
          if (cell) cell.t = "s";
        }
      }

      const numberCols = new Set([
        "Stock actual",
        "Ventas período",
        "Ventas proyectadas",
        "Días p/agotar",
        "Stock proyectado (90 días)",
        "Cant. a comprar (100 días)",
      ]);

      headers.forEach((h, colIdx) => {
        const numFmt = numberCols.has(h) ? "#,##0" : null;
        if (!numFmt) return;
        for (let r = 1; r <= data.length; r++) {
          const addr = XLSX.utils.encode_cell({ c: colIdx, r });
          const cell = ws[addr];
          if (cell && typeof cell.v === "number") {
            cell.z = numFmt;
          }
        }
      });

      XLSX.utils.book_append_sheet(wb, ws, "Proyecciones");

      const filename = `proyecciones_${dayjs().format("YYYY-MM-DD_HHmm")}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error al exportar a Excel:", error);
      alert("Error al exportar los datos");
    } finally {
      setIsExporting(false);
    }
  }, [sortField, sortDirection, text]);

  return {
    ...query,
    invalidateProductos,
    isExporting,
    handleExportExcel,
    data:
      query.data ??
      {
        data: [],
        pagination: {
          total: 0,
          limit: pageSize,
          offset: page * pageSize,
          hasMore: false,
          page: page + 1,
          totalPages: 0,
        },
      },
  };
};