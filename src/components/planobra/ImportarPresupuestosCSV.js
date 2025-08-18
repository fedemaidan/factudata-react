import React from 'react';
import Papa from 'papaparse';
import { Button } from '@mui/material';

const ImportarPresupuestosCSV = ({ onImport }) => {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        const datos = results.data;

        // Agrupar por etapa
        const agrupadas = {};
        datos.forEach(row => {
          const nombreEtapa = row.etapa?.trim();
          const categoria = row.categoria?.trim();
          const monto = parseFloat(row.monto || 0);

          if (!nombreEtapa || !categoria || isNaN(monto)) return;

          if (!agrupadas[nombreEtapa]) agrupadas[nombreEtapa] = [];

          agrupadas[nombreEtapa].push({ categoria, monto });
        });

        const etapas = Object.entries(agrupadas).map(([nombre, presupuestos]) => ({
          nombre,
          presupuestos,
        }));

        onImport(etapas);
      }
    });
  };

  return (
    <Button variant="outlined" component="label">
      Importar presupuestos
      <input type="file" hidden accept=".csv" onChange={handleFileChange} />
    </Button>
  );
};

export default ImportarPresupuestosCSV;
