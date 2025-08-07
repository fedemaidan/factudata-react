import React from 'react';
import Papa from 'papaparse';
import { Button } from '@mui/material';

const ImportarMaterialesCSV = ({ onImport }) => {
  const handleFile = (e) => {
    const file = e.target.files[0];
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const agrupado = {};
        result.data.forEach(row => {
          if (!agrupado[row.etapa]) {
            agrupado[row.etapa] = { nombre: row.etapa, materiales: [], certificados: [], presupuestos: [] };
          }
          agrupado[row.etapa].materiales.push({
            nombre: row.nombre,
            cantidad: Number(row.cantidad),
            unidad: row.unidad,
            precio_estimado: Number(row.precio_estimado)
          });
        });
        onImport(Object.values(agrupado));
      }
    });
  };

  return <Button component="label" variant="outlined">Importar materiales
    <input type="file" hidden accept=".csv" onChange={handleFile} />
  </Button>;
};

export default ImportarMaterialesCSV;
