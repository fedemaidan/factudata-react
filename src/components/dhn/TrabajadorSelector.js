import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import TrabajadorService from "src/services/dhn/TrabajadorService";

const cleanTrabajadores = (items = []) => {
  if (!Array.isArray(items)) return [];
  return items;
};

const TrabajadorSelector = ({
  value,
  onChange,
  setAlert = () => {},
  label = "Nombre, apellido o DNI",
  createButtonLabel = "Crear nuevo trabajador",
  allowCreate = true,
  initialFormData = { nombre: "", apellido: "", dni: "" },
}) => {
  const [trabajadores, setTrabajadores] = useState([]);
  const [isLoadingTrabajadores, setIsLoadingTrabajadores] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [modoCrear, setModoCrear] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [isCreating, setIsCreating] = useState(false);

  const cargarTrabajadores = useCallback(async () => {
    setIsLoadingTrabajadores(true);
    try {
      const data = await TrabajadorService.getAll({ limit: 10000, offset: 0 });
      setTrabajadores(cleanTrabajadores(data?.data));
    } catch (error) {
      console.error("Error al cargar trabajadores:", error);
      setAlert({
        open: true,
        severity: "error",
        message: "No se pudieron cargar los trabajadores",
      });
    } finally {
      setIsLoadingTrabajadores(false);
    }
  }, [setAlert]);

  useEffect(() => {
    cargarTrabajadores();
  }, [cargarTrabajadores]);

  useEffect(() => {
    setFormData({
      nombre: initialFormData?.nombre || "",
      apellido: initialFormData?.apellido || "",
      dni: initialFormData?.dni || "",
    });
  }, [initialFormData?.nombre, initialFormData?.apellido, initialFormData?.dni]);

  const trabajadoresFiltrados = useMemo(() => {
    const term = (busqueda || "").toString().trim().toLowerCase();
    if (!term) return trabajadores;
    return trabajadores.filter((t) => {
      const nombre = (t?.nombre || "").toLowerCase();
      const apellido = (t?.apellido || "").toLowerCase();
      const dni = (t?.dni || "").replace(/\./g, "").toLowerCase();
      return (
        nombre.includes(term) ||
        apellido.includes(term) ||
        `${nombre} ${apellido}`.includes(term) ||
        `${apellido} ${nombre}`.includes(term) ||
        dni.includes(term)
      );
    });
  }, [trabajadores, busqueda]);

  const handleCrearTrabajador = useCallback(async () => {
    if (!formData.nombre || !formData.apellido || !formData.dni) {
      setAlert({
        open: true,
        severity: "error",
        message: "Completá nombre, apellido y DNI para crear el trabajador",
      });
      return null;
    }

    try {
      setIsCreating(true);
      const nuevo = await TrabajadorService.create({
        ...formData,
        desde: new Date().toISOString().split("T")[0],
        active: true,
      });
      const worker = nuevo?._id ? nuevo : nuevo?.data;
      if (!worker) {
        throw new Error("Respuesta inválida al crear trabajador");
      }
      setTrabajadores((prev) => [worker, ...prev]);
      onChange?.(worker);
      setAlert({
        open: true,
        severity: "success",
        message: "Trabajador creado y seleccionado",
      });
      setModoCrear(false);
      return worker;
    } catch (error) {
      console.error("Error al crear trabajador:", error);
      setAlert({
        open: true,
        severity: "error",
        message:
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          "Error al crear el trabajador",
      });
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [formData, onChange, setAlert]);

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Buscar trabajador</Typography>
      <Autocomplete
        options={trabajadoresFiltrados}
        getOptionLabel={(option) =>
          `${option.apellido || ""}, ${option.nombre || ""} (${option.dni || ""})`.trim()
        }
        loading={isLoadingTrabajadores}
        value={value}
        onChange={(_, newValue) => onChange?.(newValue)}
        inputValue={busqueda}
        onInputChange={(_, newInputValue) => setBusqueda(newInputValue)}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            size="small"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {isLoadingTrabajadores ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
      {allowCreate && (
        <>
          <Button variant="text" onClick={() => setModoCrear((prev) => !prev)} size="small">
            {modoCrear ? "Cancelar nuevo trabajador" : createButtonLabel}
          </Button>
          {modoCrear && (
            <Stack spacing={1}>
              <TextField
                label="Nombre"
                size="small"
                value={formData?.nombre || ""}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, nombre: event.target.value }))
                }
              />
              <TextField
                label="Apellido"
                size="small"
                value={formData?.apellido || ""}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, apellido: event.target.value }))
                }
              />
              <TextField
                label="DNI"
                size="small"
                value={formData?.dni || ""}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, dni: event.target.value }))
                }
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleCrearTrabajador}
                disabled={isCreating}
              >
                {isCreating ? <CircularProgress size={18} color="inherit" /> : "Crear y seleccionar"}
              </Button>
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
};

export default TrabajadorSelector;

