import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Autocomplete,
  CircularProgress,
} from "@mui/material";
import clientesService from "src/services/celulandia/clientesService";
import dolarService from "src/services/celulandia/dolarService";
import { getUser } from "src/utils/celulandia/currentUser";
import movimientosService from "src/services/celulandia/movimientosService";
import cajasService from "src/services/celulandia/cajasService";

const AgregarModal = ({ open, onClose, onSave }) => {
  const [clientes, setClientes] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [tipoDeCambio, setTipoDeCambio] = useState({
    ultimaActualizacion: "",
    oficial: null,
    blue: null,
    current: 1,
  });
  const [tipoDeCambioManual, setTipoDeCambioManual] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    cliente: "",
    cuentaDestino: "ENSHOP SRL",
    monedaDePago: "ARS",
    montoEnviado: "",
    CC: "ARS",
    montoCC: "",
    usuario: getUser(),
  });
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const getCCOptions = () => {
    if (clienteSeleccionado && clienteSeleccionado.ccActivas) {
      return clienteSeleccionado.ccActivas;
    }
    return ["ARS", "USD BLUE", "USD OFICIAL"];
  };

  useEffect(() => {
    setIsLoading(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    Promise.all([
      clientesService.getAllClientes(),
      dolarService.getTipoDeCambio(),
      cajasService.getAllCajas(),
    ])
      .then(([clientes, tipoDeCambio, cajas]) => {
        const clientesArray = Array.isArray(clientes) ? clientes : clientes?.data || [];
        setClientes(clientesArray);
        setTipoDeCambio({
          ...tipoDeCambio,
          current: tipoDeCambio?.current || 1,
        });
        setCajas(cajas.data);
      })
      .catch((error) => {
        console.error("Error al obtener datos:", error);
        setClientes([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const getTipoDeCambio = (monedaDePago, CC) => {
    // Si moneda y CC son iguales, tipo de cambio es 1
    if (
      (monedaDePago === "ARS" && CC === "ARS") ||
      (monedaDePago === "USD" && CC === "USD BLUE") ||
      (monedaDePago === "USD" && CC === "USD OFICIAL")
    ) {
      return 1;
    }

    // Si hay un valor manual, usarlo
    if (tipoDeCambioManual !== null) {
      return tipoDeCambioManual;
    }

    // Casos donde moneda y CC son diferentes
    if (monedaDePago === "ARS" && CC === "USD OFICIAL") {
      return tipoDeCambio.oficial || 1;
    }
    if (monedaDePago === "ARS" && CC === "USD BLUE") {
      return tipoDeCambio.blue || 1;
    }
    if (monedaDePago === "USD" && CC === "ARS") {
      return tipoDeCambio.blue || 1;
    }

    return 1; // Valor por defecto
  };

  const calcularMontoCC = (montoEnviado, monedaDePago, CC) => {
    const tc = getTipoDeCambio(monedaDePago, CC);

    // Si moneda y CC son iguales, montoCC = montoEnviado
    if (
      (monedaDePago === "ARS" && CC === "ARS") ||
      (monedaDePago === "USD" && CC === "USD BLUE") ||
      (monedaDePago === "USD" && CC === "USD OFICIAL")
    ) {
      return montoEnviado;
    }

    // Si moneda es ARS y CC es USD, dividir montoEnviado por tipo de cambio
    if (monedaDePago === "ARS" && (CC === "USD OFICIAL" || CC === "USD BLUE")) {
      return montoEnviado / tc;
    }

    // Si moneda es USD y CC es ARS, multiplicar montoEnviado por tipo de cambio
    if (monedaDePago === "USD" && CC === "ARS") {
      return montoEnviado * tc;
    }

    return montoEnviado;
  };

  const handleTipoDeCambioChange = (value) => {
    if (value > 0) {
      setTipoDeCambioManual(parseFloat(value));
    }

    // Recalcular montoCC cuando cambia el tipo de cambio
    if (formData.montoEnviado) {
      const newMontoCC = calcularMontoCC(
        parseFloat(formData.montoEnviado) || 0,
        formData.monedaDePago,
        formData.CC
      );
      setFormData((prev) => ({
        ...prev,
        montoCC: Math.round(newMontoCC),
      }));
    }
  };

  const handleMontoEnviado = (value) => {
    const monto = parseFloat(value) || 0;
    const montoCC = calcularMontoCC(monto, formData.monedaDePago, formData.CC);

    setFormData((prev) => ({
      ...prev,
      montoEnviado: value,
      montoCC: Math.round(montoCC),
    }));
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const newFormData = {
        ...prev,
        [field]: value,
      };

      // Si cambia moneda de pago o CC, recalcular montoCC y tipo de cambio
      if (field === "monedaDePago" || field === "CC") {
        // Resetear valor manual cuando cambian las monedas
        setTipoDeCambioManual(null);

        const newTipoDeCambio = getTipoDeCambio(
          value,
          field === "monedaDePago" ? newFormData.CC : newFormData.monedaDePago
        );

        // Actualizar tipo de cambio
        setTipoDeCambio((prev) => ({
          ...prev,
          current: newTipoDeCambio,
        }));

        // Recalcular montoCC si hay un monto enviado
        if (newFormData.montoEnviado) {
          const newMontoCC = calcularMontoCC(
            parseFloat(newFormData.montoEnviado) || 0,
            newFormData.monedaDePago,
            newFormData.CC
          );
          newFormData.montoCC = Math.round(newMontoCC);
        }
      }

      return newFormData;
    });
  };
  const handleSave = async () => {
    if (!formData.cliente || !formData.montoEnviado || !formData.cuentaDestino) {
      alert("Por favor complete todos los campos requeridos");
      return;
    }

    let clienteData;
    let clienteId;

    if (clienteSeleccionado) {
      clienteData = {
        nombre: clienteSeleccionado.nombre,
        ccActivas: clienteSeleccionado.ccActivas,
        descuento: clienteSeleccionado.descuento,
      };
      clienteId = clienteSeleccionado._id;
    } else {
      clienteData = {
        nombre: formData.cliente,
      };
      clienteId = null;
    }

    const cajaId = cajas.find((caja) => caja.nombre === formData.cuentaDestino)?._id;
    const tipoDeCambioCalculado = getTipoDeCambio(formData.monedaDePago, formData.CC);

    const result = await movimientosService.createMovimiento({
      movimiento: {
        type: "INGRESO",
        clienteId: clienteId || null,
        cliente: clienteData,
        cuentaCorriente: formData.CC,
        moneda: formData.monedaDePago,
        tipoFactura: "transferencia",
        caja: cajaId,
        nombreUsuario: getUser(),
        tipoDeCambio: tipoDeCambioCalculado,
        estado: "CONFIRMADO",
      },
      montoEnviado: formData.montoEnviado,
    });

    if (result.success) {
      onSave(result.data);
    } else {
      alert(result.error);
    }
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      cliente: "",
      cuentaDestino: "ENSHOP SRL",
      montoEnviado: "",
      monedaDePago: "ARS",
      CC: "ARS",
      montoCC: "",
      tipoDeCambio,
      usuario: getUser(),
    });
    setTipoDeCambioManual(null);
    setClienteSeleccionado(null);
    onClose();
  };

  if (isLoading) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Nuevo Comprobante
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                options={Array.isArray(clientes) ? clientes : []}
                getOptionLabel={(option) => (typeof option === "string" ? option : option.nombre)}
                value={formData.cliente}
                onChange={(event, newValue) => {
                  if (newValue && typeof newValue === "object") {
                    setClienteSeleccionado(newValue);
                    handleInputChange("cliente", newValue.nombre);
                    const ccOptions = newValue.ccActivas || ["ARS", "USD BLUE", "USD OFICIAL"];
                    if (!ccOptions.includes(formData.CC)) {
                      setFormData((prev) => ({
                        ...prev,
                        CC: ccOptions[0] || "ARS",
                      }));
                    }
                  } else {
                    setClienteSeleccionado(null);
                    handleInputChange("cliente", newValue || "");
                    setFormData((prev) => ({
                      ...prev,
                      CC: "ARS",
                    }));
                  }
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Cliente *" margin="normal" required fullWidth />
                )}
                loading={isLoading}
                ListboxProps={{
                  style: { maxHeight: 200, overflow: "auto" },
                }}
                filterOptions={(options, { inputValue }) => {
                  const filtered = options.filter((option) =>
                    option.nombre.toLowerCase().includes(inputValue.toLowerCase())
                  );
                  return filtered.slice(0, 50);
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Cuenta Destino *</InputLabel>
                <Select
                  value={formData.cuentaDestino}
                  label="Cuenta Destino *"
                  onChange={(e) => handleInputChange("cuentaDestino", e.target.value)}
                  required
                >
                  {cajas?.map((caja) => (
                    <MenuItem key={caja._id} value={caja.nombre}>
                      {caja.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Monto *"
                type="number"
                value={formData.montoEnviado}
                onChange={(e) => handleMontoEnviado(e.target.value)}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Moneda de Pago *</InputLabel>
                <Select
                  value={formData.monedaDePago}
                  label="Moneda de Pago *"
                  onChange={(e) => handleInputChange("monedaDePago", e.target.value)}
                  required
                >
                  <MenuItem value="ARS">ARS</MenuItem>
                  <MenuItem value="USD">USD</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Monto CC"
                type="number"
                value={formData.montoCC}
                disabled={true}
                margin="normal"
                helperText="Calculado automáticamente"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Cuenta Corriente *</InputLabel>
                <Select
                  value={formData.CC}
                  label="Cuenta Corriente *"
                  onChange={(e) => handleInputChange("CC", e.target.value)}
                  required
                >
                  {getCCOptions().map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tipo de Cambio"
                type="number"
                value={getTipoDeCambio(formData.monedaDePago, formData.CC)}
                disabled={
                  (formData.monedaDePago === "ARS" && formData.CC === "ARS") ||
                  (formData.monedaDePago === "USD" && formData.CC === "USD BLUE") ||
                  (formData.monedaDePago === "USD" && formData.CC === "USD OFICIAL")
                }
                onChange={(e) => handleTipoDeCambioChange(e.target.value)}
                margin="normal"
                helperText={
                  (formData.monedaDePago === "ARS" && formData.CC === "ARS") ||
                  (formData.monedaDePago === "USD" && formData.CC === "USD BLUE") ||
                  (formData.monedaDePago === "USD" && formData.CC === "USD OFICIAL")
                    ? "No aplica"
                    : tipoDeCambioManual !== null
                    ? "Valor personalizado"
                    : tipoDeCambio.ultimaActualizacion
                    ? `Última actualización: ${new Date(
                        tipoDeCambio.ultimaActualizacion
                      ).toLocaleString("es-AR", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : "Valor automático"
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Usuario"
                value={formData.usuario}
                onChange={(e) => handleInputChange("usuario", e.target.value)}
                margin="normal"
                disabled
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          Cancelar
        </Button>
        <Button onClick={handleSave} color="primary" variant="contained" disabled={isLoading}>
          Agregar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AgregarModal;
