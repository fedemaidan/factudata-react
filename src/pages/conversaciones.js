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
    errorMessageIds,
    currentErrorIndex,
    onRefreshCurrentConversation,
    onNavigateToError,
  } = useConversationsContext();

  const hasErrors = errorMessageIds.length > 0;

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
    <DashboardLayout title={getTitulo(selected)}>
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
              <Box
                p={0.5}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                borderBottom="1px solid"
                borderColor="divider"
              >
                <Typography variant="h6">{getTitulo(selected)}</Typography>
                <Box>
                  <IconButton onClick={onRefreshCurrentConversation} title="Refrescar conversación">
                    <RefreshIcon />
                  </IconButton>
                  <IconButton onClick={() => setDownloadOpen(true)} title="Descargar conversación">
                    <DownloadIcon />
                  </IconButton>
                  {filters?.showErrors && (
                    <Tooltip title={hasErrors ? `Siguiente error (${currentErrorIndex + 1}/${errorMessageIds.length})` : "No hay errores"}>
                      <span>
                        <IconButton 
                          onClick={() => onNavigateToError('next')} 
                          disabled={!hasErrors}
                        >
                          <Badge 
                            badgeContent={errorMessageIds.length} 
                            color="error"
                            sx={{
                              "& .MuiBadge-badge": {
                                fontSize: "0.65rem",
                                minWidth: 16,
                                height: 16,
                              }
                            }}
                          >
                            <ErrorOutlineIcon />
                          </Badge>
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Box>
              </Box>
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
