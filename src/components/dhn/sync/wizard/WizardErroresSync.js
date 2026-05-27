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
import { getQuincenas } from "src/utils/dhn/quincenas";
import FilaQuincenas from "./FilaQuincenas";
import FilaCategorias, { CATEGORIAS } from "./FilaCategorias";
import FilaTiposDocumento from "./FilaTiposDocumento";

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
  const [advancedSelected, setAdvancedSelected] = useState(false);
  const [selectedCategoriaKey, setSelectedCategoriaKey] = useState(null);
  const [selectedTipoDocumento, setSelectedTipoDocumento] = useState(null);

  const handleVerAnteriores = () => setQuincenaOffset((prev) => prev + QUINCENA_COUNT);
  const handleVerMasRecientes = () =>
    setQuincenaOffset((prev) => Math.max(0, prev - QUINCENA_COUNT));

  useEffect(() => {
    if (selectedQuincenaKey && !quincenas.some((q) => q.key === selectedQuincenaKey)) {
      setSelectedQuincenaKey(null);
    }
  }, [quincenas, selectedQuincenaKey]);

  const categoriaActual = useMemo(
    () => CATEGORIAS.find((c) => c.key === selectedCategoriaKey) || null,
    [selectedCategoriaKey]
  );

  const quincenaActual = useMemo(
    () => quincenas.find((q) => q.key === selectedQuincenaKey) || null,
    [quincenas, selectedQuincenaKey]
  );

  const handleSelectQuincena = (key) => {
    setAdvancedSelected(false);
    setSelectedQuincenaKey(key);
  };

  const handleSelectAdvanced = () => {
    setSelectedQuincenaKey(null);
    setSelectedCategoriaKey(null);
    setSelectedTipoDocumento(null);
    setAdvancedSelected(true);
  };

  const handleSelectCategoria = (key) => {
    setSelectedCategoriaKey(key);
    setSelectedTipoDocumento(null);
  };

  const requiresDocumento = Boolean(categoriaActual?.requiresDocumento);
  const documentoOk = !requiresDocumento || Boolean(selectedTipoDocumento);
  const seleccionCompleta =
    advancedSelected || (Boolean(selectedQuincenaKey) && Boolean(selectedCategoriaKey) && documentoOk);

  const ctaLabel = advancedSelected ? "Ir a configuración avanzada" : "Ver errores";

  const handleConfirm = () => {
    if (advancedSelected) {
      router.push("/dhn/sync/errores");
      return;
    }
    if (!seleccionCompleta || !quincenaActual || !categoriaActual) return;

    const query = {
      fechaDetectadaDesde: quincenaActual.desde,
      fechaDetectadaHasta: quincenaActual.hasta,
    };
    if (categoriaActual.status) {
      query.estado = categoriaActual.status;
    }
    if (categoriaActual.requiresDocumento && selectedTipoDocumento) {
      query.tipo = selectedTipoDocumento;
    }
    router.push({ pathname: "/dhn/sync/errores", query });
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={4}>
        <Stack spacing={1}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            ¿Qué errores querés revisar?
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Elegí un período y un tipo de error para ver los registros que coinciden.
          </Typography>
        </Stack>

        <Stack spacing={2}>
          <StepHeader
            index={1}
            title="Elegí el período"
            hint="O usá la configuración avanzada para filtrar manualmente."
          />
          <FilaQuincenas
            quincenas={quincenas}
            selectedKey={selectedQuincenaKey}
            advancedSelected={advancedSelected}
            onSelectQuincena={handleSelectQuincena}
            onSelectAdvanced={handleSelectAdvanced}
            onVerAnteriores={handleVerAnteriores}
            onVerMasRecientes={handleVerMasRecientes}
            canVerMasRecientes={quincenaOffset > 0}
            mostrandoActual={quincenaOffset === 0}
          />
        </Stack>

        <Stack spacing={2}>
          <StepHeader
            index={2}
            title="Elegí el tipo de error"
            hint={
              advancedSelected
                ? "Desactivado: estás usando configuración avanzada."
                : "Para duplicados y falta trabajador vas a tener que elegir también el documento."
            }
          />
          <FilaCategorias
            selectedKey={selectedCategoriaKey}
            onSelect={handleSelectCategoria}
            disabled={advancedSelected}
          />

          <Collapse in={!advancedSelected && Boolean(categoriaActual?.requiresDocumento)} timeout={250}>
            <Box sx={{ pt: 1.5 }}>
              {categoriaActual?.requiresDocumento ? (
                <FilaTiposDocumento
                  label={`Tipo de documento para ${categoriaActual.label.toLowerCase()}`}
                  opciones={categoriaActual.opcionesDocumento}
                  selectedTipo={selectedTipoDocumento}
                  onSelect={setSelectedTipoDocumento}
                  accentColor={categoriaActual.accentColor}
                />
              ) : null}
            </Box>
          </Collapse>
        </Stack>

        <Box
          sx={{
            position: "sticky",
            bottom: 16,
            display: "flex",
            justifyContent: "flex-end",
            pt: 2,
          }}
        >
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
            disabled={!seleccionCompleta}
            onClick={handleConfirm}
            sx={{ px: 4, py: 1.5, borderRadius: 2, fontWeight: 600 }}
          >
            {ctaLabel}
          </Button>
        </Box>
      </Stack>
    </Container>
  );
};

export default WizardErroresSync;
