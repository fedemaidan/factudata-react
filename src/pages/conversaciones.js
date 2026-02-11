import { useMemo, useState } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import Head from "next/head";
import { 
  Box, 
  Divider, 
  Drawer, 
  useMediaQuery, 
  useTheme,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Badge,
  Tooltip,
  Snackbar,
  Alert
} from "@mui/material";
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ConversationList from "src/components/conversaciones/ConversationList";
import ChatWindow from "src/components/conversaciones/ChatWindow";
import MessageInput from "src/components/conversaciones/MessageInput";
import EmptyState from "src/components/conversaciones/EmptyState";
import { downloadConversation } from "src/services/conversacionService";
import BotService from "src/services/botService";
import {
  ConversationsProvider,
  useConversationsContext,
} from "src/contexts/conversations-context";
import { getTitulo } from "src/utils/conversacionesUtils";

export default function ConversacionesPage() {
  return (
    <ConversationsProvider>
      <ConversacionesContent />
    </ConversationsProvider>
  );
}

function ConversacionesContent() {
  const [isListOpenMobile, setIsListOpenMobile] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadDates, setDownloadDates] = useState({ start: "", end: "" });
  const [resetOpen, setResetOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: "", severity: "info" });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const myNumber = "sorby";

  const {
    selected,
    filters,
    insightMessageIds,
    currentInsightIndex,
    onRefreshCurrentConversation,
    onNavigateToInsight,
  } = useConversationsContext();

  const hasInsights = insightMessageIds.length > 0;
  const selectedPhone = useMemo(() => {
    if (!selected) return "";
    return selected?.wPid?.split('@')[0] || selected?.lid || selected?.ultimoMensaje?.receptor || "";
  }, [selected]);

  const headerActions = selected ? (
    <Box display="flex" alignItems="center" gap={{ xs: 0.25, sm: 0.5 }}>
      <IconButton 
        onClick={onRefreshCurrentConversation} 
        title="Refrescar conversación" 
        size="small"
        sx={{ p: { xs: 0.5, sm: 1 } }}
      >
        <RefreshIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
      </IconButton>
      <Button
        onClick={() => setResetOpen(true)}
        title="Reiniciar bot del usuario"
        size="small"
        disabled={!selectedPhone}
        startIcon={<RestartAltIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />}
        sx={{
          minWidth: 0,
          px: 1,
          color: 'text.secondary',
          transition: 'all 150ms ease',
          '& .reset-label': {
            maxWidth: 0,
            opacity: 0,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            transition: 'all 150ms ease',
          },
          '&:hover': {
            color: 'error.main',
            bgcolor: 'rgba(211, 47, 47, 0.08)'
          },
          '&:hover .reset-label': {
            maxWidth: 160,
            opacity: 1,
          }
        }}
      >
        <span className="reset-label">REINICAR FLUJO</span>
      </Button>
      <IconButton 
        onClick={() => setDownloadOpen(true)} 
        title="Descargar conversación" 
        size="small"
        sx={{ p: { xs: 0.5, sm: 1 } }}
      >
        <DownloadIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
      </IconButton>
      {filters?.showInsight && (
        <Tooltip title={hasInsights ? `Siguiente insight (${currentInsightIndex + 1}/${insightMessageIds.length})` : "No hay insights"}>
          <span>
            <IconButton 
              onClick={() => onNavigateToInsight('next')} 
              disabled={!hasInsights}
              size="small"
              sx={{ p: { xs: 0.5, sm: 1 } }}
            >
              <Badge 
                badgeContent={insightMessageIds.length} 
                color="warning"
                sx={{
                  "& .MuiBadge-badge": {
                    fontSize: { xs: "0.6rem", sm: "0.65rem" },
                    minWidth: { xs: 14, sm: 16 },
                    height: { xs: 14, sm: 16 },
                  }
                }}
              >
                <ErrorOutlineIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
              </Badge>
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Box>
  ) : null;

  const handleResetBot = async () => {
    if (!selectedPhone) return;
    setResetLoading(true);
    try {
      await BotService.resetearEstado(selectedPhone);
      setAlert({ open: true, message: `Estado reiniciado para ${selectedPhone}`, severity: "success" });
      setResetOpen(false);
    } catch (error) {
      console.error(error);
      setAlert({ open: true, message: "Error al reiniciar el estado", severity: "error" });
    } finally {
      setResetLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!selected || !downloadDates.start || !downloadDates.end) {
      return;
    }

    try {
      const response = await downloadConversation(
        selected.ultimoMensaje.id_conversacion,
        downloadDates.start,
        downloadDates.end
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `conversacion_${downloadDates.start}_${downloadDates.end}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setDownloadOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <DashboardLayout title={getTitulo(selected)} headerActions={headerActions}>
      <Head>
        <title>Conversaciones</title>
      </Head>
      <Box
        display="flex"
        height="calc(100vh - 120px)"
        border="1px solid"
        borderColor="divider"
        borderRadius={1}
        overflow="hidden"
      >
        <Box
          width={360}
          minWidth={320}
          maxWidth={420}
          display={{ xs: "none", sm: "none", md: "flex" }}
          flexDirection="column"
        >
          <ConversationList />
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box flex={1} display="flex" flexDirection="column" minHeight={0}>
          {selected ? (
            <>
              <ChatWindow myNumber={myNumber} onOpenList={isMobile ? () => setIsListOpenMobile(true) : undefined} />
              <MessageInput />
            </>
          ) : (
            <EmptyState onOpenList={isMobile ? () => setIsListOpenMobile(true) : undefined} />
          )}
        </Box>
      </Box>
      {isMobile ? (
        <Drawer
          open={isListOpenMobile}
          onClose={() => setIsListOpenMobile(false)}
          anchor="left"
          PaperProps={{ sx: { width: "100%", maxWidth: "100%" } }}
        >
          <Box height="100vh" display="flex" flexDirection="column">
            <ConversationList
              onSelect={() => setIsListOpenMobile(false)}
              onMessageSelect={() => setIsListOpenMobile(false)}
            />
          </Box>
        </Drawer>
      ) : null}

      <Dialog open={downloadOpen} onClose={() => setDownloadOpen(false)}>
        <DialogTitle>Descargar Conversación</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Fecha Inicio"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              value={downloadDates.start}
              onChange={(e) => setDownloadDates({ ...downloadDates, start: e.target.value })}
              fullWidth
            />
            <TextField
              label="Fecha Fin"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              value={downloadDates.end}
              onChange={(e) => setDownloadDates({ ...downloadDates, end: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDownloadOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleDownload}
            variant="contained"
            disabled={!downloadDates.start || !downloadDates.end}
          >
            Descargar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={resetOpen} onClose={() => setResetOpen(false)}>
        <DialogTitle>Reiniciar Bot del Usuario</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Esto borrará el progreso del usuario y lo devolverá al inicio del flujo.
          </Typography>
          <Typography variant="subtitle2" mt={2}>
            Teléfono: {selectedPhone || "—"}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)} disabled={resetLoading}>Cancelar</Button>
          <Button
            onClick={handleResetBot}
            variant="contained"
            color="error"
            disabled={!selectedPhone || resetLoading}
          >
            Reiniciar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={() => setAlert({ ...alert, open: false })}
      >
        <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity}>
          {alert.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
