import React from 'react';
import { Stack, TextField, MenuItem, Autocomplete } from '@mui/material';

export default function Step0DatosIniciales({
  codigo, setCodigo,
  tipoLista, setTipoLista,
  proveedor, setProveedor,
  proyecto, setProyecto,
  valorTotal, setValorTotal,
  proveedoresOptions = [],
  proyectosOptions = [],
}) {
  return (
    <Stack spacing={2}>
      <TextField
        label="Código de acopio"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        fullWidth
      />

      <TextField
        select
        label="Tipo de acopio"
        value={tipoLista}
        onChange={(e) => setTipoLista(e.target.value)}
        fullWidth
      >
        <MenuItem value="lista_precios">Lista de precios</MenuItem>
        <MenuItem value="materiales">Lista de materiales</MenuItem>
      </TextField>

      <Autocomplete
        freeSolo
        options={proveedoresOptions}
        value={proveedor}
        onInputChange={(e, v) => setProveedor(v)}
        renderInput={(params) => <TextField {...params} label="Proveedor" fullWidth />}
      />

      <TextField
        select
        label="Proyecto"
        value={proyecto}
        onChange={(e) => setProyecto(e.target.value)}
        fullWidth
      >
        {proyectosOptions.map((p) => (
          <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
        ))}
      </TextField>

      <TextField
        type="number"
        label="Valor total estimado"
        value={valorTotal}
        onChange={(e) => setValorTotal(e.target.value)}
        fullWidth
      />
    </Stack>
  );
}
