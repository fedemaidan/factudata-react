import React from "react";
import { Box, Typography, Tabs, Tab } from "@mui/material";
import ContenedorExistenteSelector from "./ContenedorExistenteSelector";
import NuevoContenedorForm from "./NuevoContenedorForm";

const ContenedorSection = ({
  tipoContenedor,
  onTipoChange,
  contenedorSeleccionado,
  onContenedorChange,
  nuevoContenedorData,
  onNuevoContenedorChange,
  contenedores,
  disabled = false,
}) => {
  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
        🚢 Contenedor (Opcional)
      </Typography>

      <Tabs value={tipoContenedor} onChange={(e, newValue) => onTipoChange(newValue)} sx={{ mb: 2 }}>
        <Tab label="Contenedor Existente" value="existente" />
        <Tab label="Crear Nuevo Contenedor" value="nuevo" />
      </Tabs>

      {tipoContenedor === "existente" ? (
        <ContenedorExistenteSelector
          contenedores={contenedores}
          value={contenedorSeleccionado}
          onChange={onContenedorChange}
        />
      ) : (
        <NuevoContenedorForm formData={nuevoContenedorData} onChange={onNuevoContenedorChange} />
      )}
    </Box>
  );
};

export default ContenedorSection;
