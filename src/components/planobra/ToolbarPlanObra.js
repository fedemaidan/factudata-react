import React from 'react';
import { Box, Button, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import UndoIcon from '@mui/icons-material/Undo';

const ToolbarPlanObra = ({
  vista, onChangeVista,
  onOpenImportMateriales, onOpenImportCertificados,
  onUndo, onExportExcel,
  search, setSearch,
}) => {
  return (
    <Box sx={{
      position: 'sticky', top: 8, zIndex: 10, backdropFilter: 'blur(6px)',
      display: 'flex', gap: 2, alignItems: 'center', py: 1.5, mb: 2,
      borderRadius: 2, px: 2, border: theme => `1px solid ${theme.palette.divider}`,
      backgroundColor: theme => theme.palette.background.paper,
    }}>
      <Button variant="outlined" size="small" startIcon={<UploadFileIcon />} onClick={onOpenImportMateriales}>
        Importar materiales
      </Button>
      <Button variant="outlined" size="small" startIcon={<UploadFileIcon />} onClick={onOpenImportCertificados}>
        Importar certificados
      </Button>
      <Button variant="text" size="small" startIcon={<UndoIcon />} onClick={onUndo}>Deshacer</Button>
      <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={onExportExcel}>Exportar Excel</Button>

      <ToggleButtonGroup size="small" exclusive value={vista} onChange={(_, v) => v && onChangeVista(v)} sx={{ ml: 'auto' }}>
        <ToggleButton value="todo">Todo</ToggleButton>
        <ToggleButton value="materiales">Materiales</ToggleButton>
        <ToggleButton value="certificados">Certificados</ToggleButton>
      </ToggleButtonGroup>

      <TextField size="small" placeholder="Buscar etapa o ítem" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 260 }} />
    </Box>
  );
};

export default ToolbarPlanObra;