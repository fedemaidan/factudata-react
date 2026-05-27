import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Button,
  Collapse,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { getQuincenas } from "src/utils/dhn/quincenas";
import FilaQuincenas from "./FilaQuincenas";
import FilaDocumento from "./FilaDocumento";
import FilaTipoError from "./FilaTipoError";
import { DOCUMENTOS, getErrorByKey } from "./erroresCatalogo";

const StepHeader = ({ index, title, hint }) => (
  <Stack spacing={0.5}>
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          backgroundColor: "primary.main",
          color: "primary.contrastText",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: "0.85rem",
        }}
      >
        {index}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
    </Stack>
    {hint ? (
      <Typography variant="body2" color="text.secondary" sx={{ pl: 5 }}>
        {hint}
      </Typography>
    ) : null}
  </Stack>
);

const QUINCENA_COUNT = 3;

const WizardErroresSync = () => {
  const router = useRouter();
  const [quincenaOffset, setQuincenaOffset] = useState(0);
  const quincenas = useMemo(
    () => getQuincenas({ count: QUINCENA_COUNT, offset: quincenaOffset }),
    [quincenaOffset]
  );

  const [selectedQuincenaKey, setSelectedQuincenaKey] = useState(null);
  const [selectedDocumentoKey, setSelectedDocumentoKey] = useState(null);
  const [selectedErrorKey, setSelectedErrorKey] = useState(null);

  const handleVerAnteriores = () => setQuincenaOffset((prev) => prev + QUINCENA_COUNT);
  const handleVerMasRecientes = () =>
    setQuincenaOffset((prev) => Math.max(0, prev - QUINCENA_COUNT));

  useEffect(() => {
    if (selectedQuincenaKey && !quincenas.some((q) => q.key === selectedQuincenaKey)) {
      setSelectedQuincenaKey(null);
    }
  }, [quincenas, selectedQuincenaKey]);

  const documentoActual = useMemo(
    () => DOCUMENTOS.find((d) => d.key === selectedDocumentoKey) || null,
    [selectedDocumentoKey]
  );

  const errorActual = useMemo(
    () => getErrorByKey(selectedDocumentoKey, selectedErrorKey),
    [selectedDocumentoKey, selectedErrorKey]
  );

  const quincenaActual = useMemo(
    () => quincenas.find((q) => q.key === selectedQuincenaKey) || null,
    [quincenas, selectedQuincenaKey]
  );

  const handleSelectQuincena = (key) => {
    setSelectedQuincenaKey((prev) => (prev === key ? null : key));
  };

  const handleSelectDocumento = (key) => {
    setSelectedDocumentoKey((prev) => (prev === key ? null : key));
    setSelectedErrorKey(null);
  };

  const handleSelectError = (key) => {
    setSelectedErrorKey((prev) => (prev === key ? null : key));
  };

  const handleVerTodos = () => {
    router.push("/dhn/sync/errores");
  };

  const seleccionCompleta = Boolean(selectedDocumentoKey);

  const handleConfirm = () => {
    if (!seleccionCompleta || !documentoActual) return;

    if (errorActual && errorActual.customRoute) {
      const query = {};
      if (quincenaActual) {
        query.desde = quincenaActual.desde;
        query.hasta = quincenaActual.hasta;
      }
      router.push({ pathname: errorActual.customRoute, query });
      return;
    }

    const query = { tipo: documentoActual.tipoBackend };
    if (quincenaActual) {
      query.fechaDetectadaDesde = quincenaActual.desde;
      query.fechaDetectadaHasta = quincenaActual.hasta;
    }
    if (errorActual && errorActual.filtros) {
      if (errorActual.filtros.estado) query.estado = errorActual.filtros.estado;
      if (errorActual.filtros.search) query.search = errorActual.filtros.search;
    }
    router.push({ pathname: "/dhn/sync/errores", query });
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 2.5 } }}>
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 0 }}>
            Elegí qué documento querés ver. Filtrar por período y tipo de error es opcional.
          </Typography>
          <Button
            variant="text"
            startIcon={<VisibilityIcon />}
            onClick={handleVerTodos}
            size="small"
            sx={{
              fontWeight: 500,
              color: "text.secondary",
              alignSelf: { xs: "flex-start", sm: "center" },
              whiteSpace: "nowrap",
            }}
          >
            Ver todos los errores
          </Button>
        </Stack>

        <Stack spacing={1.5}>
          <StepHeader
            index={1}
            title="Elegí el período"
            hint="Opcional. Si no elegís ninguna, vamos a mostrar errores de todos los períodos."
          />
          <FilaQuincenas
            quincenas={quincenas}
            selectedKey={selectedQuincenaKey}
            onSelectQuincena={handleSelectQuincena}
            onVerAnteriores={handleVerAnteriores}
            onVerMasRecientes={handleVerMasRecientes}
            canVerMasRecientes={quincenaOffset > 0}
            mostrandoActual={quincenaOffset === 0}
          />
        </Stack>

        <Stack spacing={1.5}>
          <StepHeader
            index={2}
            title="Elegí el tipo de documento"
            hint="Elegí qué tipo de documento querés revisar."
          />
          <FilaDocumento
            selectedKey={selectedDocumentoKey}
            onSelect={handleSelectDocumento}
          />
        </Stack>

        <Collapse in={Boolean(selectedDocumentoKey)} timeout={250}>
          <Stack spacing={1.5}>
            <StepHeader
              index={3}
              title="Elegí el tipo de error"
              hint="Opcional. Si no elegís ninguno, vamos a mostrar todos los errores del documento."
            />
            <FilaTipoError
              documentoKey={selectedDocumentoKey}
              selectedKey={selectedErrorKey}
              onSelect={handleSelectError}
            />
          </Stack>
        </Collapse>

        <Box
          sx={{
            position: "sticky",
            bottom: 8,
            display: "flex",
            justifyContent: "flex-end",
            pt: 1,
          }}
        >
          <Button
            variant="contained"
            size="medium"
            endIcon={<ArrowForwardIcon />}
            disabled={!seleccionCompleta}
            onClick={handleConfirm}
            sx={{ px: 3, py: 1, borderRadius: 2, fontWeight: 600 }}
          >
            Ver errores
          </Button>
        </Box>
      </Stack>
    </Container>
  );
};

export default WizardErroresSync;
