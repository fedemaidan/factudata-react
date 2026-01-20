import React from "react";
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
} from "@mui/material";
import { Add as AddIcon, DeleteOutline as DeleteOutlineIcon } from "@mui/icons-material";

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
}) => {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Productos y contenedores
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Modificá qué contenedor recibe cada producto y ajustá la cantidad por destino.
      </Typography>

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
