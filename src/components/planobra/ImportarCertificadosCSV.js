import React from 'react';
import Papa from 'papaparse';
import { Button } from '@mui/material';

const ImportarCertificadosCSV = ({ onImport }) => {
  const handleFile = (e) => {
    const file = e.target.files[0];
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const agrupado = {};
        result.data.forEach(row => {
          const etapa = row.etapa || 'Sin etapa';
          if (!agrupado[etapa]) {
            agrupado[etapa] = {
              nombre: etapa,
              materiales: [],
              certificados: [],
              presupuestos: []
            };
          }

          agrupado[etapa].certificados.push({
            descripcion: row.descripcion,
            responsable: row.responsable,
            comienza: row.comienza,
            fin: row.fin,
            completado: Number(row.completado || 0)
          });
        });

        onImport(Object.values(agrupado));
      }
    });
  };

  return (
    <Button component="label" variant="outlined">
      Importar certificados
      <input type="file" hidden accept=".csv" onChange={handleFile} />
    </Button>
  );
};

export default ImportarCertificadosCSV;
