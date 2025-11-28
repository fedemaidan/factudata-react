import React, { useState, useEffect } from "react";
import { useAuthContext } from "src/contexts/auth-context";
import {
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Snackbar,
  Alert,
  Typography,
  Grid,
  Chip,
} from "@mui/material";

import { Autocomplete } from "@mui/material";
import { actualizarSheetsDesdeBaseEmpresa } from "src/services/proyectosService";

export const ConfiguracionGeneral = ({ empresa, updateEmpresaData, hasPermission }) => {
  const comprobante_info_default = {
    categoria: true,
    observacion: true,
    proveedor: true,
    proyecto: true,
    subcategoria: false,
    total_original: false,
    medio_pago: false,
    tipo_factura: false,
    tags_extra: false,
    caja_chica: false,
    impuestos: false,
    numero_factura: false,
    proveedor_cuit: false,
    subtotal: false,
    cuenta_interna: false,
    etapa: false,
    empresa_facturacion: false,
    fecha_pago: false,
    obra: false,
    cliente: false,
  };
  const ingreso_info_default = {
    observacion: true,
    medio_pago: false,
    categoria: false,
    subcategoria: false,
    tags_extra: false,
  };

  const [ingresoInfo, setIngresoInfo] = useState({
    ...ingreso_info_default,
    ...empresa.ingreso_info,
  });

  const [camposObligatorios, setCamposObligatorios] = useState(empresa.camposObligatorios || []);
  const [confFecha, setConfFecha] = useState(empresa.conf_fecha || "REAL");
  const [tipo, setTipo] = useState(empresa.tipo || "Constructora");
  const [sheetCentral, setSheetCentral] = useState(empresa.sheetCentral || "");
  const [acciones, setAcciones] = useState(empresa.acciones || []);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarInfo, setSnackbarInfo] = useState({ message: "", severity: "success" });
  const [hasPermissionError, setHasPermissionError] = useState(false);
  const [dolarDeAjuste, setDolarDeAjuste] = useState(empresa.dolarDeAjuste || "MANUAL");
  const [comprobanteInfo, setComprobanteInfo] = useState(
    { ...comprobante_info_default, ...empresa.comprobante_info } || comprobante_info_default
  );
  const [conEstados, setConEstados] = useState(empresa.con_estados || false);
  const [soloDolar, setSoloDolar] = useState(empresa.solo_dolar || false);
  const [cajaChicaDirecto, setCajaChicaDirecto] = useState(empresa.caja_chica_directo || false);
  const [notasEstados, setNotasEstados] = useState(
    empresa.notas_estados || ["Pendiente", "En proceso", "Completa"]
  );
  const [tagsExtra, setTagsExtra] = useState(empresa.tags_extra || []);
  const [razonSocial, setRazonSocial] = useState(empresa.razon_social || "");
  const [cuit, setCuit] = useState(empresa.cuit || "");
  const [domicilioFiscal, setDomicilioFiscal] = useState(empresa.domicilio_fiscal || "");
  const [carpetaEmpresaRef, setCarpetaEmpresaRef] = useState(empresa.carpetaEmpresaRef || "");
  const [isRegenerandoSheets, setIsRegenerandoSheets] = useState(false);
  const [cuentaSuspendida, setCuentaSuspendida] = useState(empresa.cuenta_suspendida || false);
  // ----- Cuentas y defaults -----
  const empresaTieneCuentas = Array.isArray(empresa.cuentas) && empresa.cuentas.length > 0;
  const initialCuentas = empresaTieneCuentas
    ? empresa.cuentas
    : ["Cuenta A", "Cuenta B", "Cuenta C"];

  // Regla: si NO hay campo cuentas en la empresa, defaults: texto = Cuenta B, imagen/pdf = Cuenta A
  const initialDefaultTexto =
    empresa.cuenta_default_texto ?? (empresaTieneCuentas ? initialCuentas[0] : "Cuenta B");
  const initialDefaultFactura =
    empresa.cuenta_default_factura ?? (empresaTieneCuentas ? initialCuentas[0] : "Cuenta A");

  const [cuentas, setCuentas] = useState(initialCuentas);
  const [nuevaCuenta, setNuevaCuenta] = useState("");
  const [cuentaDefaultTexto, setCuentaDefaultTexto] = useState(initialDefaultTexto);
  const [cuentaDefaultFactura, setcuentaDefaultFactura] = useState(initialDefaultFactura);

  // Si cambia la empresa por props, recalcular todo
  useEffect(() => {
    const has = Array.isArray(empresa.cuentas) && empresa.cuentas.length > 0;
    const nextCuentas = has ? empresa.cuentas : ["Cuenta A", "Cuenta B", "Cuenta C"];
    setCuentas(nextCuentas);
    setCuentaDefaultTexto(empresa.cuenta_default_texto ?? (has ? nextCuentas[0] : "Cuenta B"));
    setcuentaDefaultFactura(empresa.cuenta_default_factura ?? (has ? nextCuentas[0] : "Cuenta A"));
  }, [empresa]);

  // Si borran una cuenta que estaba como default, reasignamos
  useEffect(() => {
    if (!cuentas.includes(cuentaDefaultTexto)) {
      setCuentaDefaultTexto(cuentas.includes("Cuenta B") ? "Cuenta B" : cuentas[0]);
    }
    if (!cuentas.includes(cuentaDefaultFactura)) {
      setcuentaDefaultFactura(cuentas.includes("Cuenta A") ? "Cuenta A" : cuentas[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuentas]);

  const addCuenta = () => {
    const name = (nuevaCuenta || "").trim();
    if (!name) return;
    if (cuentas.includes(name)) {
      setSnackbarInfo({ message: "Esa cuenta ya existe.", severity: "warning" });
      setSnackbarOpen(true);
      return;
    }
    setCuentas([...cuentas, name]);
    setNuevaCuenta("");
  };

  const removeCuenta = (name) => {
    setCuentas(cuentas.filter((c) => c !== name));
  };

  const handleTagsExtraChange = (event, newValue) => {
    setTagsExtra(newValue);
  };

  const handleNotasEstadosChange = (event, newValue) => {
    setNotasEstados(newValue);
  };

  const handleComprobanteInfoChange = (field) => (event) => {
    setComprobanteInfo((prevState) => ({
      ...prevState,
      [field]: event.target.checked,
    }));
  };

  const handleIngresoInfoChange = (field) => (event) => {
    setIngresoInfo((prevState) => ({
      ...prevState,
      [field]: event.target.checked,
    }));
  };

  const { user } = useAuthContext();

  const opcionesAcciones = [
    "CREAR_EGRESO",
    "CREAR_EGRESO_PRORATEADO",
    "CREAR_INGRESO",
    "VER_CAJAS",
    "AJUSTAR_CAJAS",
    "TRANSFERIR_ENTRE_CAJAS",
    "CREAR_NUEVO_PROYECTO",
    "VENDER_DOLARES",
    "VALIDAR_CODIGO",
    "CONFIRMAR_PAGOS_PENDIENTES",
    "VER_DRIVE",
    "CREAR_NOTA_PEDIDO",
    "MODIFICAR_NOTA_PEDIDO",
    "ELIMINAR_NOTA_PEDIDO",
    "VER_NOTAS_DE_PEDIDO",
    "GESTIONAR_MOVIMIENTO",
    "CREAR_INGRESO_CAJA_CHICA",
    "VER_MI_CAJA_CHICA",
    "LISTAR_MOVIMIENTOS",
    "ADMIN_USUARIOS",
    "CREAR_ACOPIO",
    "CREAR_PRESUPUESTO",
    "VER_PRESUPUESTOS",
    "MODIFICAR_PRESUPUESTO",
    "ELIMINAR_PRESUPUESTO",
    "VER_ACOPIO",
    "INTEGRACION_ODOO",
    "VER_CUENTAS_PENDIENTES",
    "VER_UNIDADES",
    "GESTIONAR_MATERIALES",
    "GESTIONAR_PLAN_DE_OBRA",
    "CREAR_OBRA",
    "CREAR_EGRESO_SIMPLIFICADO",
    "VER_CONVERSACIONES",
    "CARGAR_REMITO",
    "VER_STOCK_MATERIALES",
    "VER_STOCK_SOLICITUDES",
    "CREAR_SOLICITUD_MATERIAL",
    "VER_STOCK_MOVIMIENTOS"

  ];

  const celulandiaAcciones = [
    "CELULANDIA_COMPROBANTES",
    "CELULANDIA_CLIENTES",
    "CELULANDIA_ENTREGAS",
    "CELULANDIA_PAGOS",
    "CELULANDIA_CONCILIACION",
    "CELULANDIA_CUENTA_CORRIENTE",
    "CELULANDIA_CHEQUES",
    "CELULANDIA_ARQUEO_CAJA",
    "CELULANDIA_EZE_NICO",
    "CELULANDIA_PROYECCIONES",
    "CELULANDIA_RESUMEN",
    "CELULANDIA_BACKUPS"
  ];

  opcionesAcciones.push(...celulandiaAcciones);

  const dolarAjuste = [
    "MANUAL",
    "OFICIAL_COMPRA",
    "OFICIAL_VENTA",
    "OFICIAL_MEDIO",
    "BLUE_COMPRA",
    "BLUE_VENTA",
    "BLUE_MEDIO",
  ];

  const opcionesCampos = [
    "proyecto",
    "categoria",
    "total",
    "observacion",
    "nombre_proveedor",
    "fecha_factura",
  ];

  const handleDolarAjusteChange = (event) => {
    setDolarDeAjuste(event.target.value);
  };

  const handleCampoChange = (event) => {
    setCamposObligatorios(event.target.value);
  };

  const handleAccionesChange = (event) => {
    setAcciones(event.target.value);
  };

  const handleSheetCentralChange = async (event) => {
    const newSheetId = event.target.value;
    setSheetCentral(newSheetId);

    try {
      const permissionResult = await hasPermission(newSheetId);
      if (!permissionResult) {
        setHasPermissionError(true);
      } else {
        setHasPermissionError(false);
      }
    } catch (error) {
      console.error("Error al verificar los permisos:", error);
      setSnackbarInfo({ message: "Error al verificar los permisos.", severity: "error" });
      setSnackbarOpen(true);
    }
  };

  const handleRegenerarSheets = async () => {
    if (!empresa?.id) return;

    setIsRegenerandoSheets(true);
    try {
      const resultado = await actualizarSheetsDesdeBaseEmpresa(empresa.id);
      if (resultado.success) {
        setSnackbarInfo({
          message: "Sheets regenerados correctamente.",
          severity: "success",
        });
      } else {
        setSnackbarInfo({
          message: "Ocurrió un error al regenerar los sheets.",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error en handleRegenerarSheets:", error);
      setSnackbarInfo({
        message: "Error inesperado al regenerar los sheets.",
        severity: "error",
      });
    } finally {
      setSnackbarOpen(true);
      setIsRegenerandoSheets(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsLoading(true);
    const updatedData = {
      camposObligatorios: camposObligatorios,
      conf_fecha: confFecha,
      tipo: tipo,
      sheetCentral: sheetCentral,
      acciones: acciones,
      dolarDeAjuste: dolarDeAjuste,
      comprobante_info: comprobanteInfo,
      con_estados: conEstados,
      solo_dolar: soloDolar,
      caja_chica_directo: cajaChicaDirecto,
      notas_estados: notasEstados,
      tags_extra: tagsExtra,
      ingreso_info: ingresoInfo,
      razon_social: razonSocial,
      cuit,
      domicilio_fiscal: domicilioFiscal,
      carpetaEmpresaRef: carpetaEmpresaRef,
      cuenta_suspendida: cuentaSuspendida,
      cuentas: cuentas,
      cuenta_default_texto: cuentaDefaultTexto,
      cuenta_default_factura: cuentaDefaultFactura,
    };

    try {
      await updateEmpresaData(empresa.id, updatedData);
      setSnackbarInfo({ message: "Configuración guardada con éxito.", severity: "success" });
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error al guardar la configuración:", error);
      setSnackbarInfo({ message: "Error al guardar la configuración.", severity: "error" });
      setSnackbarOpen(true);
    }
    setIsLoading(false);
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  return (
    <>
      {user.admin && (
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="acciones-label">Acciones Configuradas</InputLabel>
          <Select
            labelId="acciones-label"
            multiple
            value={acciones}
            onChange={handleAccionesChange}
            renderValue={(selected) => selected.join(", ")}
          >
            {opcionesAcciones.map((accion) => (
              <MenuItem key={accion} value={accion}>
                <Checkbox checked={acciones.indexOf(accion) > -1} />
                <ListItemText primary={accion} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <FormControl fullWidth>
        <InputLabel id="campos-obligatorios-label">Campos Obligatorios</InputLabel>
        <Select
          labelId="campos-obligatorios-label"
          multiple
          value={camposObligatorios}
          onChange={handleCampoChange}
          renderValue={(selected) => selected.join(", ")}
        >
          {opcionesCampos.map((campo) => (
            <MenuItem key={campo} value={campo}>
              <Checkbox checked={camposObligatorios.indexOf(campo) > -1} />
              <ListItemText primary={campo} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography variant="h6" sx={{ mt: 4 }}>
        Configuración de campos que muestra un egreso
      </Typography>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {Object.keys(comprobanteInfo).map((field) => (
          <Grid item xs={6} md={4} key={field}>
            <FormControl>
              <Checkbox
                checked={comprobanteInfo[field]}
                onChange={handleComprobanteInfoChange(field)}
              />
              <ListItemText primary={field.charAt(0).toUpperCase() + field.slice(1)} />
            </FormControl>
          </Grid>
        ))}
      </Grid>
      <Typography variant="h6" sx={{ mt: 4 }}>
        Configuración de campos que muestra un ingreso
      </Typography>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {Object.keys(ingresoInfo).map((field) => (
          <Grid item xs={6} md={4} key={field}>
            <FormControl>
              <Checkbox checked={ingresoInfo[field]} onChange={handleIngresoInfoChange(field)} />
              <ListItemText primary={field.charAt(0).toUpperCase() + field.slice(1)} />
            </FormControl>
          </Grid>
        ))}
      </Grid>

      <TextField
        select
        label="Configuración de Fecha"
        value={confFecha}
        onChange={(e) => setConfFecha(e.target.value)}
        fullWidth
      >
        <MenuItem value="HOY">Hoy</MenuItem>
        <MenuItem value="REAL">Real</MenuItem>
      </TextField>
      <TextField
        select
        label="Tipo de Empresa"
        value={tipo}
        onChange={(e) => setTipo(e.target.value)}
        fullWidth
      >
        <MenuItem value="Constructora">Constructora</MenuItem>
        <MenuItem value="Financiera">Financiera</MenuItem>
        <MenuItem value="Logistica">Logística</MenuItem>
        <MenuItem value="Rinde gastos">Rinde Gastos</MenuItem>
      </TextField>
      <Typography variant="h6" sx={{ mt: 4 }}>
        Cuentas de la empresa
      </Typography>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12}>
          {cuentas.map((c) => (
            <Chip key={c} label={c} onDelete={() => removeCuenta(c)} sx={{ mr: 1, mb: 1 }} />
          ))}
        </Grid>

        <Grid item xs={12} md={8}>
          <TextField
            label="Nueva cuenta"
            value={nuevaCuenta}
            onChange={(e) => setNuevaCuenta(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCuenta()}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} md={4} display="flex" alignItems="center">
          <Button variant="outlined" onClick={addCuenta}>
            Agregar
          </Button>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            select
            label="Cuenta default para texto"
            value={cuentaDefaultTexto}
            onChange={(e) => setCuentaDefaultTexto(e.target.value)}
            fullWidth
          >
            {cuentas.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            select
            label="Cuenta default para imagen/pdf"
            value={cuentaDefaultFactura}
            onChange={(e) => setcuentaDefaultFactura(e.target.value)}
            fullWidth
          >
            {cuentas.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mt: 4 }}>
        Datos fiscales de la empresa
      </Typography>

      <TextField
        label="Razón Social"
        value={razonSocial}
        onChange={(e) => setRazonSocial(e.target.value)}
        fullWidth
        sx={{ mt: 2 }}
      />

      <TextField
        label="CUIT"
        value={cuit}
        onChange={(e) => setCuit(e.target.value)}
        fullWidth
        sx={{ mt: 2 }}
      />

      <TextField
        label="Domicilio Fiscal"
        value={domicilioFiscal}
        onChange={(e) => setDomicilioFiscal(e.target.value)}
        fullWidth
        sx={{ mt: 2 }}
      />

      <TextField
        select
        label="Dólar de Ajuste"
        value={dolarDeAjuste}
        onChange={handleDolarAjusteChange}
        fullWidth
      >
        {dolarAjuste.map((tipoDolar) => (
          <MenuItem key={tipoDolar} value={tipoDolar}>
            {tipoDolar.replace("_", " ")}
          </MenuItem>
        ))}
      </TextField>
      <Autocomplete
        multiple
        options={[]}
        value={notasEstados}
        onChange={handleNotasEstadosChange}
        freeSolo
        renderInput={(params) => (
          <TextField {...params} label="Estados del Pedido" variant="outlined" fullWidth />
        )}
      />
      <Autocomplete
        multiple
        options={[]} // Opciones predefinidas si las hay, sino queda vacío
        value={tagsExtra}
        onChange={handleTagsExtraChange}
        freeSolo
        renderInput={(params) => (
          <TextField {...params} label="Tags Extra" variant="outlined" fullWidth />
        )}
      />

      <FormControl sx={{ mt: 2 }}>
        <Checkbox checked={conEstados} onChange={(e) => setConEstados(e.target.checked)} />
        <ListItemText primary="Con Estados" />
      </FormControl>

      <FormControl sx={{ mt: 2 }}>
        <Checkbox checked={cajaChicaDirecto} onChange={(e) => setCajaChicaDirecto(e.target.checked)} />
        <ListItemText primary="Caja chica directo" />
      </FormControl>

      <FormControl sx={{ mt: 2 }}>
        <Checkbox checked={soloDolar} onChange={(e) => setSoloDolar(e.target.checked)} />
        <ListItemText primary="Solo Dólar" />
      </FormControl>
      <FormControl sx={{ mt: 2 }}>
        <Checkbox
          checked={cuentaSuspendida}
          onChange={(e) => setCuentaSuspendida(e.target.checked)}
        />
        <ListItemText primary="Cuenta suspendida" />
      </FormControl>
      <TextField
        label="ID de Google Sheet Central"
        value={sheetCentral}
        onChange={handleSheetCentralChange}
        fullWidth
        error={hasPermissionError}
        helperText={
          hasPermissionError
            ? "El google sheet no está configurado para que podamos editarlo. Asegurate que el id esté bien escrito y de darle permisos de edición a firebase-adminsdk-xts1d@factudata-3afdf.iam.gserviceaccount.com."
            : ""
        }
      />

      <Typography variant="h6" sx={{ mt: 4 }}>
        Gestionar Google Sheets
      </Typography>

      <TextField
        label="ID de carpeta de Drive"
        value={carpetaEmpresaRef}
        onChange={(e) => setCarpetaEmpresaRef(e.target.value)}
        fullWidth
        sx={{ mt: 2 }}
        helperText="Ejemplo: 1a2B3cD4eFgHiJKLmNopQRStuvWxYzZ123"
      />

      <Button
        onClick={handleRegenerarSheets}
        variant="outlined"
        color="secondary"
        sx={{ mt: 2, mb: 2 }}
        disabled={isRegenerandoSheets}
      >
        {isRegenerandoSheets ? <CircularProgress size={24} /> : "Regenerar Sheets"}
      </Button>

      <Button onClick={handleSaveConfig} variant="contained" color="primary" disabled={isLoading}>
        {isLoading ? <CircularProgress size={24} /> : "Guardar Configuración"}
      </Button>
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarInfo.severity}
          sx={{ width: "100%" }}
        >
          {snackbarInfo.message}
        </Alert>
      </Snackbar>
    </>
  );
};
