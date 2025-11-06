import React, { useState } from 'react';
import { Box, Button, Stack, Table, TableHead, TableRow, TableCell, TableBody, TextField, MenuItem, Checkbox, FormControlLabel } from '@mui/material';

const Step2AjustarColumnas = ({
  tipoLista,
  previewCols,
  previewRows,
  columnMapping,
  setColumnMapping,
  onConfirm,
}) => {
  const [includeHeaderAsRow, setIncludeHeaderAsRow] = useState(false);

  return (
    <Stack spacing={2}>
      <Box>
        <FormControlLabel
          control={
            <Checkbox
              checked={includeHeaderAsRow}
              onChange={(e) => setIncludeHeaderAsRow(e.target.checked)}
            />
          }
          label="Incluir la primera fila como dato (no como encabezado)"
        />
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            {previewCols.map((colKey) => (
              <TableCell key={colKey}>
                <TextField
                  select
                  fullWidth
                  label={String(colKey)}
                  value={columnMapping[colKey] || ''}
                  onChange={(e) =>
                    setColumnMapping((m) => ({
                      ...m,
                      [colKey]: e.target.value,
                    }))
                  }
                >
                  <MenuItem value="">(sin asignar)</MenuItem>
                  <MenuItem value="codigo">Código</MenuItem>
                  <MenuItem value="descripcion">Descripción</MenuItem>
                  {tipoLista === 'materiales' && (
                    <MenuItem value="cantidad">Cantidad</MenuItem>
                  )}
                  <MenuItem value="valorUnitario">Valor unitario</MenuItem>
                  {tipoLista === 'materiales' && (
                    <MenuItem value="valorTotal">Valor total</MenuItem>
                  )}
                  <MenuItem value="ignorar">Ignorar</MenuItem>
                </TextField>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {previewRows.map((row, i) => (
            <TableRow key={i}>
              {row.map((cell, j) => (
                <TableCell key={`${i}-${j}`}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          onClick={() => onConfirm({ includeHeaderAsRow })}
        >
          Confirmar columnas
        </Button>
      </Stack>
    </Stack>
  );
};

export default Step2AjustarColumnas;
