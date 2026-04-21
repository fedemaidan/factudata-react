/**
 * Modelo de vista "Parecido a Drive": rutas desde folder_path, agrupación PDF por páginas.
 */

const PDF_PAGE_RE = /^(.+)_p(\d+)\.(jpeg|jpg|png)$/i;

/**
 * @param {string} name
 * @returns {{ base: string, pageNum: number, ext: string } | null}
 */
export const parsePdfPageFileName = (name) => {
  if (!name || typeof name !== "string") return null;
  const trimmed = name.trim();
  const m = trimmed.match(PDF_PAGE_RE);
  if (!m) return null;
  return { base: m[1], pageNum: parseInt(m[2], 10), ext: m[3] };
};

export const normalizeFolderPath = (fp) => {
  if (!fp || typeof fp !== "string") return "";
  return fp.trim().replace(/^\/+|\/+$/g, "");
};

const STATUS_PRIORITY = [
  "error",
  "incompleto",
  "duplicado",
  "processing",
  "pending",
  "ok",
];

/**
 * Estado resumen para fila padre PDF (peor caso primero).
 * @param {Array<{ status?: string }>} rows
 */
export const aggregateStatusForRows = (rows) => {
  if (!rows || !rows.length) return "pending";
  const normalized = rows.map((r) => String(r?.status || "").toLowerCase());
  for (const s of STATUS_PRIORITY) {
    if (normalized.some((x) => x === s)) return s;
  }
  return rows[0]?.status || "pending";
};

const firstNonEmpty = (rows, key) => {
  for (const r of rows) {
    const v = r?.[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
};

/**
 * @param {string[]} pathSegments
 * @returns {string}
 */
export const pathSegmentsToKey = (pathSegments) => {
  if (!Array.isArray(pathSegments) || pathSegments.length === 0) return "";
  return pathSegments.map((s) => String(s || "").trim()).filter(Boolean).join("/");
};

/**
 * Subcarpetas directas bajo pathSegments.
 * @param {Array<object>} flatRows
 * @param {string[]} pathSegments
 * @returns {string[]}
 */
export const getSubfolderNamesAtPath = (flatRows, pathSegments) => {
  const pathKey = pathSegmentsToKey(pathSegments);
  const seen = new Set();

  for (const row of flatRows) {
    const fp = normalizeFolderPath(row?.folder_path);
    if (!fp) continue;

    if (pathKey === "") {
      const first = fp.split("/")[0];
      if (first) seen.add(first);
      continue;
    }

    if (fp === pathKey) continue;

    const prefix = `${pathKey}/`;
    if (fp.startsWith(prefix)) {
      const rest = fp.slice(prefix.length);
      const next = rest.split("/")[0];
      if (next) seen.add(next);
    }
  }

  return Array.from(seen).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
};

/**
 * Filas cuyo archivo está exactamente en esta carpeta (sin agrupar).
 * @param {Array<object>} flatRows
 * @param {string[]} pathSegments
 */
export const getFileRowsAtPath = (flatRows, pathSegments) => {
  const pathKey = pathSegmentsToKey(pathSegments);
  const out = [];

  for (const row of flatRows) {
    const fp = normalizeFolderPath(row?.folder_path);
    if (fp === pathKey) out.push(row);
  }

  return out;
};

/**
 * Agrupa páginas PDF; devuelve padres (>=2 páginas) y sueltas.
 * @param {Array<object>} fileRows
 */
export const groupPdfPagesInFolder = (fileRows) => {
  const groups = new Map();
  const nonPdf = [];

  for (const row of fileRows) {
    const parsed = parsePdfPageFileName(row?.file_name || "");
    if (!parsed) {
      nonPdf.push(row);
      continue;
    }

    const gk = parsed.base;
    if (!groups.has(gk)) {
      groups.set(gk, { base: parsed.base, pages: [] });
    }
    groups.get(gk).pages.push({ ...row, _pdfPageNum: parsed.pageNum });
  }

  const pdfParents = [];
  const singles = [...nonPdf];

  for (const [, g] of groups) {
    g.pages.sort((a, b) => (a._pdfPageNum || 0) - (b._pdfPageNum || 0));
    if (g.pages.length >= 2) {
      const pages = g.pages;
      pdfParents.push({
        rowType: "pdfParent",
        _id: `pdf-group-${g.base}-${pages[0]?._id || "x"}`,
        file_name: `${g.base}.pdf`,
        folder_path: pages[0]?.folder_path ?? "",
        status: aggregateStatusForRows(pages),
        observacion: firstNonEmpty(pages, "observacion"),
        fechasDetectadas: firstNonEmpty(pages, "fechasDetectadas"),
        url_storage: pages[0]?.url_storage,
        url_drive: pages[0]?.url_drive,
        tipo: pages[0]?.tipo,
        _pdfPages: pages,
        _pdfBase: g.base,
      });
    } else {
      singles.push(...g.pages);
    }
  }

  pdfParents.sort((a, b) =>
    String(a.file_name || "").localeCompare(String(b.file_name || ""), undefined, {
      sensitivity: "base",
    })
  );
  singles.sort((a, b) =>
    String(a.file_name || "").localeCompare(String(b.file_name || ""), undefined, {
      sensitivity: "base",
    })
  );

  return { pdfParents, singles };
};

/**
 * Prefijo común más largo de todos los `folder_path` no vacíos (segmentos).
 * Representa la carpeta de inicio de la sincronización cuando todo está bajo un mismo árbol.
 * @param {Array<object>} flatRows
 * @returns {string[]}
 */
export const computeSyncRootPrefixSegments = (flatRows) => {
  if (!Array.isArray(flatRows) || flatRows.length === 0) return [];

  const splits = [];
  for (const row of flatRows) {
    const fp = normalizeFolderPath(row?.folder_path);
    if (!fp) continue;
    splits.push(fp.split("/").filter(Boolean));
  }

  if (!splits.length) return [];

  let prefix = splits[0];
  for (let i = 1; i < splits.length; i++) {
    const s = splits[i];
    let j = 0;
    while (j < prefix.length && j < s.length && prefix[j] === s[j]) {
      j += 1;
    }
    prefix = prefix.slice(0, j);
    if (prefix.length === 0) return [];
  }

  return prefix;
};

/**
 * Cuenta archivos y agrupa por status para todos los items bajo una carpeta (recursivo).
 * @param {Array<object>} flatRows
 * @param {string[]} absoluteFolderPathSegments
 * @returns {{ total: number, byStatus: Record<string, number> }}
 */
export const getFolderStats = (flatRows, absoluteFolderPathSegments) => {
  const pathKey = pathSegmentsToKey(absoluteFolderPathSegments);
  const prefix = pathKey ? `${pathKey}/` : "";
  const byStatus = {};
  let total = 0;
  for (const row of flatRows) {
    const fp = normalizeFolderPath(row?.folder_path);
    const isUnder = fp === pathKey || (prefix && fp.startsWith(prefix));
    if (!isUnder) continue;
    total++;
    const status = String(row?.status || "pending").toLowerCase();
    byStatus[status] = (byStatus[status] || 0) + 1;
  }
  return { total, byStatus };
};

/**
 * Ordena: carpetas, luego padres PDF, luego archivos sueltos.
 */
export const sortDriveTableRows = (folderRows, pdfParents, singleFiles) => {
  const folders = [...folderRows].sort((a, b) =>
    String(a.folderName || "").localeCompare(String(b.folderName || ""), undefined, {
      sensitivity: "base",
    })
  );
  const pdfs = [...pdfParents];
  const files = [...singleFiles].sort((a, b) =>
    String(a.file_name || "").localeCompare(String(b.file_name || ""), undefined, {
      sensitivity: "base",
    })
  );
  return [...folders, ...pdfs, ...files];
};
