import React, { useState } from 'react';
import { Box, IconButton, LinearProgress, Slider, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { numberFmt } from 'src/utils/planobra';

const CertificadosTable = ({ certificados, onActualizarCertificado }) => {
  const [editIdx, setEditIdx] = useState(null);
  const [temp, setTemp] = useState(0);

  const startEdit = (i, val) => { setEditIdx(i); setTemp(val ?? 0); };
  const cancel = () => { setEditIdx(null); setTemp(0); };
  const confirm = () => { const v = Math.max(0, Math.min(100, Number(temp))); onActualizarCertificado(editIdx, v); cancel(); };

  return (
    <>
      <Typography variant="subtitle2" sx={{ mt: 2 }}>📄 Certificados</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Descripción</TableCell>
            <TableCell>Contratista</TableCell>
            <TableCell>Inicio</TableCell>
            <TableCell>Fin</TableCell>
            <TableCell>% Certificado</TableCell>
            <TableCell>$ Certificado</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(certificados || []).map((c, i) => {
            const val$ = Number(c.monto || 0) * Number(c.porcentaje_certificado || 0) / 100;
            return (
              <TableRow key={i}>
                <TableCell>{c.descripcion}</TableCell>
                <TableCell>{c.contratista || '-'}</TableCell>
                <TableCell>{c.fecha_inicio || '-'}</TableCell>
                <TableCell>{c.fecha_fin || '-'}</TableCell>
                <TableCell>
                  {editIdx === i ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Slider size="small" min={0} max={100} value={Number(temp)} onChange={(_, v) => setTemp(v)} sx={{ width: 120 }} />
                      <TextField size="small" type="number" value={temp} onChange={(e) => setTemp(e.target.value)} sx={{ width: 70 }} />
                      <IconButton size="small" onClick={confirm}><CheckIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={cancel}><CloseIcon fontSize="small" /></IconButton>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography>{c.porcentaje_certificado ?? 0}%</Typography>
                      <IconButton size="small" onClick={() => startEdit(i, c.porcentaje_certificado)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                  <LinearProgress variant="determinate" value={c.porcentaje_certificado ?? 0} sx={{ mt: 1 }} />
                </TableCell>
                <TableCell>{numberFmt(val$)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
};

export default CertificadosTable;