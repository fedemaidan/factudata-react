// src/components/InstructionBarIA.jsx
import React, { useState } from 'react';
import { Paper, Stack, TextField, Button, Typography } from '@mui/material';

export default function InstructionBarIA({ acopioId, items, setItems, onResumen }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const enviar = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const { interpretarInstruccionRemito } = (await import('src/services/acopioService')).default;
      const resp = await interpretarInstruccionRemito(acopioId, text, items, { moneda:'ARS' });
      if (resp?.items) setItems(resp.items);
      if (onResumen) onResumen(resp?.resumen || 'Listo.');
    } finally {
      setLoading(false);
      setText('');
    }
  };

  return (
    <Paper variant="outlined" sx={{ p:2 }}>
      <Stack direction="row" spacing={1}>
        <TextField
          fullWidth
          label="Escribí una instrucción (ej: “agregá 4 bolsas cemento a 12500”, “borrá línea 2”, “cambiá precio de hierro 8 a 9990”)"
          value={text}
          onChange={(e)=>setText(e.target.value)}
          onKeyDown={(e)=>{ if(e.key==='Enter') enviar(); }}
        />
        <Button variant="contained" onClick={enviar} disabled={loading}>
          {loading ? 'Aplicando...' : 'Aplicar'}
        </Button>
      </Stack>
      <Typography variant="caption" sx={{ opacity:.8, display:'block', mt:1 }}>
        Tip: podés referirte por “línea N” o por parte del nombre (“malla 15x15”).
      </Typography>
    </Paper>
  );
}
