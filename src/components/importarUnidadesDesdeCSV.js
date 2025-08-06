import React, { useState } from 'react';
import Papa from 'papaparse';
import { Button, Box, Typography, FormControl, InputLabel, Select, MenuItem, Stack } from '@mui/material';
import { calcularTotalUF, calcularRentabilidad } from 'src/utils/unidadUtils';

const encabezadoTemplate = [
  'Nombre', 'Lote', 'Edificio', 'Piso', 'Tipificacion',
  'M2Cubierta', 'M2Comunes', 'Cocheras', 'Camas',
  'ValorUF', 'ValorCochera', 'AlquilerMensual', 'Estado'
];


export default function ImportarUnidadesDesdeCSV({ onImport, proyectos }) {
  const [archivo, setArchivo] = useState(null);
  const [unidadesPreview, setUnidadesPreview] = useState([]);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);

  const handleArchivo = (e) => {
    const file = e.target.files[0];
    setArchivo(file);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (!proyectoSeleccionado) {
          alert('Seleccioná un proyecto antes de importar');
          return;
        }

        const datos = result.data.map((row, idx) => {
          const unidad = {
            nombre: row.Nombre || `Unidad ${idx + 1}`,
            lote: row.Lote || '',
            edificio: row.Edificio || '',
            piso: row.Piso || '',
            tipificacion: row.Tipificacion || '',
            m2_cubierta: parseFloat(row.M2Cubierta || 0),
            m2_comunes: parseFloat(row.M2Comunes || 0),
            cocheras: row.Cocheras || 0,
            camas: row.Camas || 0,
            valor_uf: parseFloat(row.ValorUF || 0),
            valor_cochera: parseFloat(row.ValorCochera || 0),
            alquiler_mensual: parseFloat(row.AlquilerMensual || 0),
            estado: row.Estado?.toLowerCase() || 'disponible',
            proyectoId: proyectoSeleccionado.id,
            proyecto: proyectoSeleccionado.nombre,
            total_uf: 0,
            rentabilidad: 0,
          };

          unidad.total_uf = calcularTotalUF(unidad);
          unidad.rentabilidad = calcularRentabilidad(unidad);
          return unidad;
        });

        setUnidadesPreview(datos);
      }
    });
  };

  const handleImportar = () => {
    if (!proyectoSeleccionado) {
      alert('Seleccioná un proyecto antes de importar');
      return;
    }
    if (onImport) onImport(unidadesPreview);
  };

  const descargarTemplate = () => {
    const csv = encabezadoTemplate.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_unidades.csv');
    link.click();
  };

  return (
    <Box p={2}>
      <Typography variant="h6">Importar unidades desde CSV</Typography>

      <FormControl fullWidth sx={{ my: 2 }}>
        <InputLabel>Proyecto</InputLabel>
        <Select
          value={proyectoSeleccionado?.id || ''}
          onChange={(e) => {
            const p = proyectos.find(p => p.id === e.target.value);
            setProyectoSeleccionado(p);
          }}
          label="Proyecto"
        >
          {proyectos.map(p => (
            <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Stack direction="row" spacing={2} alignItems="center">
  <Button variant="contained" component="label">
    Seleccionar archivo
    <input hidden type="file" accept=".csv" onChange={handleArchivo} />
  </Button>
  <Button variant="outlined" onClick={descargarTemplate}>
    📥 Descargar template
  </Button>
</Stack>


      {unidadesPreview.length > 0 && (
        <>
          <Typography variant="body2" mt={2}>Unidades a importar: {unidadesPreview.length}</Typography>
          <Button variant="contained" color="primary" onClick={handleImportar} sx={{ mt: 1 }}>
            Confirmar importación
          </Button>
        </>
      )}
    </Box>
  );
}
