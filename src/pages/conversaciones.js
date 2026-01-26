import { useState } from "react";
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
  Tooltip
} from "@mui/material";
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ConversationList from "src/components/conversaciones/ConversationList";
import ChatWindow from "src/components/conversaciones/ChatWindow";
import MessageInput from "src/components/conversaciones/MessageInput";
import EmptyState from "src/components/conversaciones/EmptyState";
import { downloadConversation } from "src/services/conversacionService";
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
    </DashboardLayout>
  );
}
