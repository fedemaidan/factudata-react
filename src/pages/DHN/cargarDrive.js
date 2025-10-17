import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import {
  Box, Button, Card, CardContent, CardHeader, Divider, IconButton, InputAdornment,
  List, ListItem, ListItemButton, ListItemText, Modal, Stack, TextField, Tooltip,
  Typography, useMediaQuery, useTheme, Snackbar, Alert,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import UploadIcon from "@mui/icons-material/Upload";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import InfoIcon from "@mui/icons-material/Info";

import DhnDriveService, { validarUrlDrive as esUrlDriveValida } from "src/services/dhn/cargarUrlDriveService";

const LS_KEY = "dhn_drive_history_v1";

export default function CargarDrivePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [url, setUrl] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [historial, setHistorial] = useState([]); // [{id,url,type,name,mimeType,createdAt,raw}]
  const [busqueda, setBusqueda] = useState("");
  const [resultado, setResultado] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
      if (raw) setHistorial(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (arr) => {
    setHistorial(arr);
    try { if (typeof window !== "undefined") localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch {}
  };

  const puedeEnviar = useMemo(() => !!url.trim() && esUrlDriveValida(url), [url]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!puedeEnviar) {
      setToast({ open: true, message: "Ingresá una URL/ID válida de Google Drive.", severity: "warning" });
      return;
    }

    setEnviando(true);
    const data = await DhnDriveService.inspeccionarRecurso(url);
    console.log('data', data);
    setResultado(data);
    setModalOpen(true);

    if (data?.ok) {
      const item = {
        id: data.meta?.id || `${Date.now()}`,
        url,
        type: data.type,
        name: data.meta?.name || "(sin nombre)",
        mimeType: data.meta?.mimeType || "",
        createdAt: Date.now(),
        raw: data,
      };
      const next = [item, ...historial.filter(h => !(h.id === item.id && h.url === item.url))].slice(0, 200);
      persist(next);
      setToast({ open: true, message: "Inspección realizada con éxito.", severity: "success" });
    } else {
      setToast({ open: true, message: data?.error?.message || "No se pudo inspeccionar el recurso.", severity: "error" });
    }

    setEnviando(false);
  };

  const filtrarHistorial = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return historial;
    return historial.filter(h =>
      (h.name || "").toLowerCase().includes(q) ||
      (h.mimeType || "").toLowerCase().includes(q) ||
      (h.url || "").toLowerCase().includes(q) ||
      (h.type || "").toLowerCase().includes(q)
    );
  }, [historial, busqueda]);

  const openFromHistory = (h) => { setResultado(h.raw || null); setModalOpen(true); };
  const clearHistory = () => { persist([]); setToast({ open: true, message: "Historial limpiado.", severity: "info" }); };

  return (
    <DashboardLayout title="Cargar URL de Drive">
      <Head><title>DHN • Cargar Drive</title></Head>

      <Box display="flex" gap={2} sx={{ height: "calc(100vh - 120px)" }}>
        {/* Historial */}
        <Card sx={{ width: { xs: "100%", md: 360 }, display: { xs: "none", md: "flex" }, flexDirection: "column", borderRadius: 2, overflow: "hidden" }}>
          <CardHeader
            title="Historial"
            subheader="Últimas URLs inspeccionadas"
            action={
              <Tooltip title="Limpiar historial">
                <span><IconButton onClick={clearHistory} disabled={!historial.length} color="error"><DeleteIcon /></IconButton></span>
              </Tooltip>
            }
          />
          <CardContent sx={{ pt: 0 }}>
            <TextField
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              fullWidth
              placeholder="Buscar por nombre, MIME o URL"
              size="small"
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
              sx={{ mb: 1 }}
            />
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden", height: "calc(100vh - 260px)" }}>
              {filtrarHistorial.length ? (
                <List dense disablePadding sx={{ height: "100%", overflow: "auto" }}>
                  {filtrarHistorial.map((h) => (
                    <ListItem key={`${h.id}-${h.createdAt}`} disablePadding divider>
                      <ListItemButton onClick={() => openFromHistory(h)}>
                        <ListItemText
                          primary={<Stack direction="row" alignItems="center" spacing={1}>
                            <Typography noWrap fontWeight={600}>{h.name}</Typography>
                            {h.mimeType ? <Typography noWrap variant="caption" sx={{ opacity: 0.7 }}>• {h.mimeType}</Typography> : null}
                          </Stack>}
                          secondary={<Stack direction="row" spacing={1} alignItems="center" sx={{ opacity: 0.8 }}>
                            <LinkIcon fontSize="inherit" />
                            <Typography variant="caption" noWrap>{h.url}</Typography>
                          </Stack>}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box display="grid" placeItems="center" height="100%" px={2}>
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>No hay elementos</Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Form */}
        <Box flex={1} minWidth={0} display="flex" flexDirection="column" gap={2}>
          <Card sx={{ borderRadius: 2 }}>
            <CardHeader title="Inspeccionar recurso de Google Drive" subheader="Pegá una URL o un ID de archivo/carpeta" />
            <CardContent>
              <form onSubmit={onSubmit}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    fullWidth
                    label="URL o ID de Google Drive"
                    placeholder="https://drive.google.com/file/d/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={enviando}
                    error={!!url && !esUrlDriveValida(url)}
                    helperText={url && !esUrlDriveValida(url) ? "La URL/ID no parece válida" : " "}
                  />
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button type="submit" variant="contained" disableElevation startIcon={<UploadIcon />} disabled={!puedeEnviar || enviando}>
                      {enviando ? "Enviando…" : "Enviar"}
                    </Button>
                    <Tooltip title="Abrir en nueva pestaña si ya es un link">
                      <span>
                        <IconButton
                          href={esUrlDriveValida(url) && url.startsWith("http") ? url : undefined}
                          target="_blank"
                          rel="noreferrer"
                          disabled={!url || !url.startsWith("http")}
                        >
                          <OpenInNewIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </Stack>
              </form>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 2, display: { xs: "none", md: "block" } }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={1}><InfoIcon fontSize="small" /><Typography variant="subtitle2">Consejos</Typography></Stack>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                • Podés pegar una URL de Drive (<code>/file/d/ID</code>, <code>/folders/ID</code>, <code>?id=ID</code>) o un ID “crudo”.<br />
                • Si es acceso directo, se resuelve al destino real.<br />
                • Si es carpeta, por ahora sólo metadata básica.
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <MetadataModal open={modalOpen} onClose={() => setModalOpen(false)} data={resultado} />

      <Snackbar open={toast.open} autoHideDuration={3500} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })} sx={{ width: "100%" }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}

/* ============== Modal + Renderer ============== */

function MetadataModal({ open, onClose, data }) {
  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", p: 2, bgcolor: "rgba(0,0,0,0.55)" }}>
        <Card sx={{ width: "min(860px, 96vw)", maxHeight: "90vh", overflow: "hidden", borderRadius: 2 }}>
          <CardHeader title="Resultado inspección Drive" action={<Button onClick={onClose} variant="text">Cerrar</Button>} />
          <Divider />
          <CardContent sx={{ overflow: "auto", maxHeight: "70vh" }}>
            <ResultadoDrive data={data} />
          </CardContent>
        </Card>
      </Box>
    </Modal>
  );
}

function ResultadoDrive({ data }) {
  if (!data) return <Typography variant="body2">No hay datos.</Typography>;
  if (data.ok !== true) {
    return (
      <Stack spacing={1}>
        <Alert severity="error" variant="outlined">No se pudo obtener la metadata</Alert>
        <pre style={preStyle}>{JSON.stringify(data?.error || data, null, 2)}</pre>
      </Stack>
    );
  }
  const { type, meta, childrenCount } = data;
  return (
    <Stack spacing={2}>
      <GridRow label="Tipo" value={type} />
      <GridRow label="ID" value={meta?.id} />
      <GridRow label="Nombre" value={meta?.name} />
      <GridRow label="MIME" value={meta?.mimeType} />
      {meta?.size && <GridRow label="Tamaño" value={formatBytes(Number(meta.size))} />}
      <GridRow label="Creado" value={formatDate(meta?.createdTime)} />
      <GridRow label="Modificado" value={formatDate(meta?.modifiedTime)} />
      {meta?.webViewLink && <GridRow label="Abrir" value={<Button href={meta.webViewLink} target="_blank" rel="noreferrer" size="small">Abrir en Drive</Button>} />}
      {meta?.webContentLink && <GridRow label="Descarga" value={<Button href={meta.webContentLink} target="_blank" rel="noreferrer" size="small">Link directo</Button>} />}
      {Array.isArray(meta?.owners) && meta.owners.length > 0 && (
        <Box sx={boxStyle}>
          <Typography variant="subtitle2">Propietarios</Typography>
          <List dense>{meta.owners.map((o, i) => (<ListItem key={i} sx={{ py: 0 }}><ListItemText primary={`${o.name}${o.email ? ` (${o.email})` : ""}`} /></ListItem>))}</List>
        </Box>
      )}
      {Array.isArray(meta?.permissions) && meta.permissions.length > 0 && (
        <Box sx={boxStyle}>
          <Typography variant="subtitle2">Permisos</Typography>
          <List dense>{meta.permissions.map((p, i) => (
            <ListItem key={i} sx={{ py: 0 }}>
              <ListItemText
                primary={`${p.type}/${p.role}`}
                secondary={[p.emailAddress && `Email: ${p.emailAddress}`, p.domain && `Dominio: ${p.domain}`, p.allowFileDiscovery !== null && `Discovery: ${String(p.allowFileDiscovery)}`].filter(Boolean).join(" · ")}
              />
            </ListItem>
          ))}</List>
        </Box>
      )}
      {typeof childrenCount === "number" && <GridRow label="Hijos (carpeta)" value={childrenCount} />}
      {meta?.resolvedFromShortcut && <GridRow label="Shortcut" value={`Resuelto desde: ${meta.resolvedFromShortcut.name} (${meta.resolvedFromShortcut.id})`} />}
      <details><summary>Ver JSON completo</summary><pre style={preStyle}>{JSON.stringify(data, null, 2)}</pre></details>
    </Stack>
  );
}

/* ============== Utils ============== */

function GridRow({ label, value }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 2 }}>
      <Typography sx={{ opacity: 0.7 }}>{label}</Typography>
      <Typography>{value ?? "-"}</Typography>
    </Box>
  );
}

function formatBytes(n) {
  if (!Number.isFinite(n)) return n;
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${units[i]}`;
}
function formatDate(s) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}
const preStyle = { background: "rgba(0,0,0,0.06)", padding: 12, borderRadius: 8, overflowX: "auto", fontSize: 12, lineHeight: 1.4 };
const boxStyle = { border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.2 };
