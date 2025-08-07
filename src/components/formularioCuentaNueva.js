// src/components/FormularioCuentaNueva.js

import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';

const FormularioCuentaNueva = React.memo(({ abierta, onCerrar, onCrear, nuevaCuenta, setNuevaCuenta, proyectos = [] }) => {
  const handleChange = (campo) => (e) => {
    const value = campo === 'monto_total' || campo === 'cantidad_cuotas'
      ? parseFloat(e.target.value) || 0
      : e.target.value;
    setNuevaCuenta({ ...nuevaCuenta, [campo]: value });
  };

  const proyectoSeleccionado = proyectos.find(p => p.id === nuevaCuenta.proyecto_id);
  const subproyectos = proyectoSeleccionado?.subproyectos || [];

  return (
    <Dialog open={abierta} onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle>Nueva Cuenta Pendiente</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="dense">
          <InputLabel>Proyecto</InputLabel>
          <Select
            value={nuevaCuenta.proyecto_id}
            label="Proyecto"
            onChange={(e) => {
              const proyecto = proyectos.find(p => p.id === e.target.value);
              setNuevaCuenta({
                ...nuevaCuenta,
                proyecto_id: e.target.value,
                proyecto_nombre: proyecto?.nombre || '',
                subproyecto_id: '',
                subproyecto_nombre: ''
              });
            }}
          >
            {proyectos.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {nuevaCuenta.proyecto_id && (
          <FormControl fullWidth margin="dense">
            <InputLabel>Subproyecto</InputLabel>
            <Select
              value={nuevaCuenta.subproyecto_id}
              label="Subproyecto"
              onChange={(e) => {
                const sub = subproyectos.find(s => s.id === e.target.value);
                setNuevaCuenta({
                  ...nuevaCuenta,
                  subproyecto_id: e.target.value,
                  subproyecto_nombre: sub?.nombre || ''
                });
              }}
            >
              {subproyectos.map((sub) => (
                <MenuItem key={sub.id} value={sub.id}>{sub.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControl fullWidth margin="dense">
          <InputLabel>Tipo</InputLabel>
          <Select
            value={nuevaCuenta.tipo}
            onChange={handleChange('tipo')}
          >
            <MenuItem value="a_pagar">A pagar</MenuItem>
            <MenuItem value="a_cobrar">A cobrar</MenuItem>
          </Select>
        </FormControl>

        <TextField
          margin="dense"
          fullWidth
          label="Descripción"
          value={nuevaCuenta.descripcion}
          onChange={handleChange('descripcion')}
        />

        <TextField
          margin="dense"
          fullWidth
          label="Monto total"
          type="number"
          value={nuevaCuenta.monto_total}
          onChange={handleChange('monto_total')}
        />

        <FormControl fullWidth margin="dense">
          <InputLabel>Moneda</InputLabel>
          <Select
            value={nuevaCuenta.moneda_nominal}
            onChange={handleChange('moneda_nominal')}
          >
            <MenuItem value="ARS">ARS</MenuItem>
            <MenuItem value="USD">USD</MenuItem>
          </Select>
        </FormControl>

        <TextField
          margin="dense"
          fullWidth
          label="Proveedor o Cliente"
          value={nuevaCuenta.proveedor_o_cliente}
          onChange={handleChange('proveedor_o_cliente')}
        />

        <FormControl fullWidth margin="dense">
          <InputLabel>Unidad de Indexación</InputLabel>
          <Select
            value={nuevaCuenta.unidad_indexacion}
            onChange={handleChange('unidad_indexacion')}
          >
            <MenuItem value="">Ninguna</MenuItem>
            <MenuItem value="UVA">UVA</MenuItem>
            <MenuItem value="CER">CER</MenuItem>
            <MenuItem value="CAC">CAC</MenuItem>
            <MenuItem value="IPC">IPC</MenuItem>
          </Select>
        </FormControl>

        {nuevaCuenta.unidad_indexacion && (
          <FormControl fullWidth margin="dense">
            <InputLabel>Frecuencia de Indexación</InputLabel>
            <Select
              value={nuevaCuenta.frecuencia_indexacion}
              onChange={handleChange('frecuencia_indexacion')}
            >
              <MenuItem value="diaria">Diaria</MenuItem>
              <MenuItem value="mensual">Mensual</MenuItem>
              <MenuItem value="trimestral">Trimestral</MenuItem>
              <MenuItem value="semestral">Semestral</MenuItem>
              <MenuItem value="anual">Anual</MenuItem>
            </Select>
          </FormControl>
        )}

        <TextField
          margin="dense"
          fullWidth
          label="Cantidad de Cuotas"
          type="number"
          value={nuevaCuenta.cantidad_cuotas}
          onChange={handleChange('cantidad_cuotas')}
        />

        <TextField
          margin="dense"
          fullWidth
          label="Fecha de la primera cuota"
          type="date"
          value={nuevaCuenta.fecha_primera_cuota}
          onChange={handleChange('fecha_primera_cuota')}
          InputLabelProps={{ shrink: true }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCerrar}>Cancelar</Button>
        <Button onClick={onCrear} variant="contained">Crear</Button>
      </DialogActions>
    </Dialog>
  );
});

export default FormularioCuentaNueva;
