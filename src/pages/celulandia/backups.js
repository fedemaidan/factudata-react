import React, { useState } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import Head from "next/head";
import {
  Box,
  Container,
  Stack,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Snackbar,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import backupService from "src/services/celulandia/backupService";

const BackupsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [confirmWord, setConfirmWord] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState({
    open: false,
    message: "",
    severity: "error",
  });
  const isConfirmValid = confirmWord === "CONFIRMAR";
  const isUrlFilled = googleSheetUrl.trim().length > 0;

  const handleOpen = () => setIsModalOpen(true);
  const handleClose = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setGoogleSheetUrl("");
    setConfirmWord("");
  };

  const handleSubmit = async () => {
    if (!isConfirmValid || !isUrlFilled) return;
    try {
      setIsSubmitting(true);
      const response = await backupService.restoreDb(googleSheetUrl);
      if (response.success) {
        handleClose();
      } else {
        setAlert({
          open: true,
          message: response.error || "Error al restaurar el backup",
          severity: "error",
        });
      }
    } catch (e) {
      setAlert({
        open: true,
        message: e.message || "Error inesperado al restaurar el backup",
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseAlert = (event, reason) => {
    if (reason === "clickaway") return;
    setAlert((prev) => ({ ...prev, open: false }));
  };

  return (
    <DashboardLayout title="Backups">
      <Head>Backups</Head>
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
      >
        <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: "100%" }}>
          {alert.message}
        </Alert>
      </Snackbar>
      <Container maxWidth="xl">
        <Stack spacing={2}>
          <Box>
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<HistoryIcon />}  
              onClick={handleOpen}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1,
                boxShadow: 2,
                "&:hover": { boxShadow: 4 },
                width: "fit-content",
              }}
            >
              Restaurar Backup Anterior
            </Button>
          </Box>
        </Stack>

        <Dialog open={isModalOpen} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Restaurar Base de Datos
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ py: 1 }}>
              <Alert severity="warning" variant="outlined">
                Esta acción <b>eliminará</b> la base de datos actual y la reemplazará por la del
                enlace de Google Sheet. Procede solo si estás seguro.
              </Alert>
              <TextField
                label="Link de Google Sheet"
                fullWidth
                value={googleSheetUrl}
                onChange={(e) => setGoogleSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/..."
                margin="normal"
              />
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Escribí <b>CONFIRMAR</b> para continuar. Ingresalo aquí abajo:
                </Typography>
                <TextField
                  label="CONFIRMAR"
                  fullWidth
                  value={confirmWord}
                  onChange={(e) => setConfirmWord(e.target.value)}
                  margin="normal"
                  error={confirmWord.length > 0 && !isConfirmValid}
                  helperText={
                    confirmWord.length > 0 && !isConfirmValid
                      ? 'Debés escribir exactamente "CONFIRMAR"'
                      : " "
                  }
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="inherit" disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              color="primary"
              variant="contained"
              disabled={!isConfirmValid || !isUrlFilled || isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
            >
              {isSubmitting ? "Procesando..." : "Realizar Backup"}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </DashboardLayout>
  );
};

export default BackupsPage;