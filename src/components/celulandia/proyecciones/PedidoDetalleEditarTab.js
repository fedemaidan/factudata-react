import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Box,
  Typography,
  Stack,
  Grid,
  TextField,
  MenuItem,
  IconButton,
  Divider,
  Button,
  Autocomplete,
  Paper,
  Collapse,
  FormControlLabel,
  Checkbox,
  Chip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Add as AddIcon,
  DeleteOutline as DeleteOutlineIcon,
  PlaylistAddCheck as PlaylistAddCheckIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";

const PedidoDetalleEditarTab = ({
  asignacionesEdicion,
  asignacionesPorProducto,
  asignacionesNuevas,
  contenedoresDisponibles,
  productosDisponibles,
  loadingProductos,
  onAgregarAsignacion,
  onEditarAsignacion,
  onEliminarAsignacion,
  onEditarAsignacionNueva,
  onEliminarAsignacionNueva,
  onAsignarTodasAContenedor,
}) => {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkTipo, setBulkTipo] = useState("existente");
  const [bulkContenedorId, setBulkContenedorId] = useState("");
  const [bulkContenedorCodigo, setBulkContenedorCodigo] = useState("");
  const [bulkFechaEstimada, setBulkFechaEstimada] = useState("");
  const [bulkSoloSin, setBulkSoloSin] = useState(true);

  const totalItems = (asignacionesEdicion?.length || 0) + (asignacionesNuevas?.length || 0);
  const totalSinContenedor = useMemo(() => {
    const sinEdit = (asignacionesEdicion || []).filter((a) => a.tipoContenedor === "sin").length;
    const sinNuevas = (asignacionesNuevas || []).filter((a) => a.tipoContenedor === "sin").length;
    return sinEdit + sinNuevas;
  }, [asignacionesEdicion, asignacionesNuevas]);

  const objetivoCount = bulkSoloSin ? totalSinContenedor : totalItems;

  const bulkIsValid = useMemo(() => {
    if (bulkTipo === "existente") return Boolean(bulkContenedorId);
    if (bulkTipo === "nuevo") return Boolean(bulkContenedorCodigo && bulkFechaEstimada);
    if (bulkTipo === "sin") return Boolean(bulkFechaEstimada);
    return false;
  }, [bulkTipo, bulkContenedorId, bulkContenedorCodigo, bulkFechaEstimada]);

  const handleAplicarBulk = () => {
    if (!bulkIsValid || objetivoCount === 0) return;
    let codigo = bulkContenedorCodigo;
    let fecha = bulkFechaEstimada;
    if (bulkTipo === "existente") {
      const selected = contenedoresDisponibles.find((c) => c._id === bulkContenedorId);
      if (selected) {
        codigo = selected.codigo || "";
        fecha = selected.fechaEstimadaLlegada
          ? dayjs(selected.fechaEstimadaLlegada).format("YYYY-MM-DD")
          : "";
      }
    }
    onAsignarTodasAContenedor?.(
      {
        tipoContenedor: bulkTipo,
        contenedorId: bulkContenedorId,
        contenedorCodigo: codigo,
        contenedorFechaEstimada: fecha,
      },
      { soloSinContenedor: bulkSoloSin }
    );
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Productos y contenedores
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Modificá qué contenedor recibe cada producto y ajustá la cantidad por destino.
      </Typography>

      {totalItems > 0 && (
        <Paper
          variant="outlined"
          sx={{
            mb: 2,
            borderColor: "primary.light",
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
            overflow: "hidden",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            onClick={() => setBulkOpen((v) => !v)}
            sx={{
              px: 2,
              py: 1.25,
              cursor: "pointer",
              userSelect: "none",
              transition: "background-color 120ms ease",
              "&:hover": {
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
              },
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <PlaylistAddCheckIcon color="primary" fontSize="small" />
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  Asignar todos al mismo contenedor
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Aplicá un contenedor en común a todos los productos a la vez.
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              {totalSinContenedor > 0 && (
                <Chip
                  size="small"
                  color="warning"
                  variant="outlined"
                  label={`${totalSinContenedor} sin contenedor`}
                />
              )}
              <IconButton size="small" aria-label={bulkOpen ? "Contraer" : "Expandir"}>
                {bulkOpen ? (
                  <ExpandLessIcon fontSize="small" />
                ) : (
                  <ExpandMoreIcon fontSize="small" />
                )}
              </IconButton>
            </Stack>
          </Stack>

          <Collapse in={bulkOpen} unmountOnExit>
            <Divider />
            <Box sx={{ p: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    size="small"
                    label="Tipo"
                    value={bulkTipo}
                    onChange={(e) => {
                      setBulkTipo(e.target.value);
                      setBulkContenedorId("");
                      setBulkContenedorCodigo("");
                    }}
                    fullWidth
                  >
                    <MenuItem value="existente">Existente</MenuItem>
                    <MenuItem value="nuevo">Nuevo</MenuItem>
                    <MenuItem value="sin">Sin contenedor</MenuItem>
                  </TextField>
                </Grid>

                {bulkTipo === "existente" && (
                  <Grid item xs={12} md={9}>
                    <Autocomplete
                      options={contenedoresDisponibles}
                      value={
                        contenedoresDisponibles.find((c) => c._id === bulkContenedorId) || null
                      }
                      onChange={(_, newValue) => setBulkContenedorId(newValue?._id || "")}
                      getOptionLabel={(option) => option?.codigo || ""}
                      isOptionEqualToValue={(option, value) => option?._id === value?._id}
                      renderInput={(params) => (
                        <TextField {...params} label="Contenedor" size="small" />
                      )}
                    />
                  </Grid>
                )}

                {bulkTipo === "nuevo" && (
                  <>
                    <Grid item xs={12} md={5}>
                      <TextField
                        size="small"
                        label="Código contenedor"
                        value={bulkContenedorCodigo}
                        onChange={(e) => setBulkContenedorCodigo(e.target.value)}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        size="small"
                        label="Fecha estimada"
                        type="date"
                        value={bulkFechaEstimada}
                        onChange={(e) => setBulkFechaEstimada(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                      />
                    </Grid>
                  </>
                )}

                {bulkTipo === "sin" && (
                  <Grid item xs={12} md={9}>
                    <TextField
                      size="small"
                      label="Fecha estimada"
                      type="date"
                      value={bulkFechaEstimada}
                      onChange={(e) => setBulkFechaEstimada(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  </Grid>
                )}
              </Grid>

              <Stack
                direction={{ xs: "column", md: "row" }}
                alignItems={{ xs: "stretch", md: "center" }}
                justifyContent="space-between"
                spacing={1}
                sx={{ mt: 1.5 }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={bulkSoloSin}
                      onChange={(e) => setBulkSoloSin(e.target.checked)}
                    />
                  }
                  label={
                    <Typography variant="body2" color="text.secondary">
                      Aplicar solo a productos sin contenedor
                    </Typography>
                  }
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleAplicarBulk}
                  disabled={!bulkIsValid || objetivoCount === 0}
                >
                  {objetivoCount > 0
                    ? `Aplicar a ${objetivoCount} ${objetivoCount === 1 ? "producto" : "productos"}`
                    : "Aplicar a todos"}
                </Button>
              </Stack>
            </Box>
          </Collapse>
        </Paper>
      )}

      {asignacionesEdicion.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No hay productos asignados a contenedores todavía.
        </Typography>
      ) : (
        <Stack spacing={2} sx={{ mb: 2 }}>
          {asignacionesPorProducto.map((producto) => {
            const totalAsignado = producto.asignaciones.reduce(
              (acc, item) => acc + (Number(item.cantidad) || 0),
              0
            );

            return (
              <Box
                key={producto.productoId || producto.asignaciones?.[0]?.asignacionId}
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  bgcolor: "background.paper",
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {producto.productoCodigo}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {producto.productoNombre}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Total asignado: {totalAsignado}
                  </Typography>
                </Stack>

                <Stack spacing={1} sx={{ mt: 1 }}>
                  {producto.asignaciones.map((asignacion) => (
                    <Grid container spacing={2} alignItems="center" key={asignacion.asignacionId}>
                      <Grid item xs={12} md={3}>
                        <TextField
                          select
                          size="small"
                          label="Tipo"
                          value={asignacion.tipoContenedor}
                          onChange={(e) =>
                            onEditarAsignacion(
                              asignacion.asignacionId,
                              "tipoContenedor",
                              e.target.value
                            )
                          }
                          fullWidth
                        >
                          <MenuItem value="existente">Existente</MenuItem>
                          <MenuItem value="nuevo">Nuevo</MenuItem>
                          <MenuItem value="sin">Sin contenedor</MenuItem>
                        </TextField>
                      </Grid>

                      {asignacion.tipoContenedor === "existente" && (
                        <Grid item xs={12} md={3}>
                          <TextField
                            select
                            size="small"
                            label="Contenedor"
                            value={asignacion.contenedorId}
                            onChange={(e) =>
                              onEditarAsignacion(
                                asignacion.asignacionId,
                                "contenedorId",
                                e.target.value
                              )
                            }
                            fullWidth
                          >
                            {contenedoresDisponibles.map((cont) => (
                              <MenuItem key={cont._id} value={cont._id}>
                                {cont.codigo}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                      )}

                      {asignacion.tipoContenedor === "nuevo" && (
                        <>
                          <Grid item xs={12} md={3}>
                            <TextField
                              size="small"
                              label="Código contenedor"
                              value={asignacion.contenedorCodigo}
                              onChange={(e) =>
                                onEditarAsignacion(
                                  asignacion.asignacionId,
                                  "contenedorCodigo",
                                  e.target.value
                                )
                              }
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <TextField
                              size="small"
                              label="Fecha estimada"
                              type="date"
                              value={asignacion.contenedorFechaEstimada}
                              onChange={(e) =>
                                onEditarAsignacion(
                                  asignacion.asignacionId,
                                  "contenedorFechaEstimada",
                                  e.target.value
                                )
                              }
                              InputLabelProps={{ shrink: true }}
                              fullWidth
                            />
                          </Grid>
                        </>
                      )}

                      {asignacion.tipoContenedor === "sin" && (
                        <Grid item xs={12} md={3}>
                          <TextField
                            size="small"
                            label="Fecha estimada"
                            type="date"
                            value={asignacion.contenedorFechaEstimada}
                            onChange={(e) =>
                              onEditarAsignacion(
                                asignacion.asignacionId,
                                "contenedorFechaEstimada",
                                e.target.value
                              )
                            }
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                          />
                        </Grid>
                      )}

                      <Grid item xs={10} md={2}>
                        <TextField
                          size="small"
                          label="Cantidad"
                          value={asignacion.cantidad}
                          onChange={(e) =>
                            onEditarAsignacion(
                              asignacion.asignacionId,
                              "cantidad",
                              e.target.value.replace(/[^\d]/g, "")
                            )
                          }
                          onBlur={(e) =>
                            onEditarAsignacion(
                              asignacion.asignacionId,
                              "cantidad",
                              String(Math.max(1, parseInt(e.target.value || "1", 10)))
                            )
                          }
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={2} md={1}>
                        <IconButton
                          onClick={() => onEliminarAsignacion(asignacion.asignacionId)}
                          size="small"
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Grid>
                    </Grid>
                  ))}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}

      <Divider sx={{ my: 2 }} />

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2">Agregar productos</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={onAgregarAsignacion}>
          Agregar producto
        </Button>
      </Stack>

      {asignacionesNuevas.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No hay nuevos productos para agregar.
        </Typography>
      ) : (
        <Stack spacing={2}>
          {asignacionesNuevas.map((asignacion) => (
            <Box
              key={asignacion.id}
              sx={{
                p: 2,
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                bgcolor: "background.paper",
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    options={productosDisponibles}
                    loading={loadingProductos}
                    value={productosDisponibles.find((p) => p._id === asignacion.productoId) || null}
                    onChange={(_, newValue) => {
                      onEditarAsignacionNueva(asignacion.id, "productoId", newValue?._id || "");
                      onEditarAsignacionNueva(
                        asignacion.id,
                        "productoCodigo",
                        newValue?.codigo || ""
                      );
                      onEditarAsignacionNueva(
                        asignacion.id,
                        "productoNombre",
                        newValue?.nombre || newValue?.descripcion || ""
                      );
                    }}
                    getOptionLabel={(option) => option?.codigo || ""}
                    renderInput={(params) => (
                      <TextField {...params} label="Producto" size="small" />
                    )}
                    isOptionEqualToValue={(option, value) => option?._id === value?._id}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    size="small"
                    label="Tipo"
                    value={asignacion.tipoContenedor}
                    onChange={(e) =>
                      onEditarAsignacionNueva(asignacion.id, "tipoContenedor", e.target.value)
                    }
                    fullWidth
                  >
                    <MenuItem value="existente">Existente</MenuItem>
                    <MenuItem value="nuevo">Nuevo</MenuItem>
                    <MenuItem value="sin">Sin contenedor</MenuItem>
                  </TextField>
                </Grid>

                {asignacion.tipoContenedor === "existente" && (
                  <Grid item xs={12} md={3}>
                    <TextField
                      select
                      size="small"
                      label="Contenedor"
                      value={asignacion.contenedorId}
                      onChange={(e) =>
                        onEditarAsignacionNueva(asignacion.id, "contenedorId", e.target.value)
                      }
                      fullWidth
                    >
                      {contenedoresDisponibles.map((cont) => (
                        <MenuItem key={cont._id} value={cont._id}>
                          {cont.codigo}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                )}

                {asignacion.tipoContenedor === "nuevo" && (
                  <>
                    <Grid item xs={12} md={3}>
                      <TextField
                        size="small"
                        label="Código contenedor"
                        value={asignacion.contenedorCodigo}
                        onChange={(e) =>
                          onEditarAsignacionNueva(
                            asignacion.id,
                            "contenedorCodigo",
                            e.target.value
                          )
                        }
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        size="small"
                        label="Fecha estimada"
                        type="date"
                        value={asignacion.contenedorFechaEstimada}
                        onChange={(e) =>
                          onEditarAsignacionNueva(
                            asignacion.id,
                            "contenedorFechaEstimada",
                            e.target.value
                          )
                        }
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                      />
                    </Grid>
                  </>
                )}

                {asignacion.tipoContenedor === "sin" && (
                  <Grid item xs={12} md={3}>
                    <TextField
                      size="small"
                      label="Fecha estimada"
                      type="date"
                      value={asignacion.contenedorFechaEstimada}
                      onChange={(e) =>
                        onEditarAsignacionNueva(
                          asignacion.id,
                          "contenedorFechaEstimada",
                          e.target.value
                        )
                      }
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  </Grid>
                )}

                <Grid item xs={10} md={2}>
                  <TextField
                    size="small"
                    label="Cantidad"
                    value={asignacion.cantidad}
                    onChange={(e) =>
                      onEditarAsignacionNueva(
                        asignacion.id,
                        "cantidad",
                        e.target.value.replace(/[^\d]/g, "")
                      )
                    }
                    onBlur={(e) =>
                      onEditarAsignacionNueva(
                        asignacion.id,
                        "cantidad",
                        String(Math.max(1, parseInt(e.target.value || "1", 10)))
                      )
                    }
                    fullWidth
                  />
                </Grid>
                <Grid item xs={2} md={1}>
                  <IconButton onClick={() => onEliminarAsignacionNueva(asignacion.id)} size="small">
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Grid>
              </Grid>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default PedidoDetalleEditarTab;
