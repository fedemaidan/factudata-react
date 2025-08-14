import React from "react";
import { Stack, IconButton, Button } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import HistoryIcon from "@mui/icons-material/History";
import ImageIcon from "@mui/icons-material/Image";

const TableActions = ({ item, onEdit, onViewHistory, onViewImage }) => {
  return (
    <Stack direction="row" spacing={1}>
      {onEdit && (
        <IconButton
          size="small"
          color="primary"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(item);
          }}
          sx={{
            backgroundColor: "primary.main",
            color: "white",
            "&:hover": {
              backgroundColor: "primary.dark",
            },
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      )}
      {onViewHistory && (
        <IconButton
          size="small"
          color="secondary"
          onClick={(e) => {
            e.stopPropagation();
            onViewHistory(item);
          }}
          sx={{
            backgroundColor: "secondary.main",
            color: "white",
            "&:hover": {
              backgroundColor: "secondary.dark",
            },
          }}
        >
          <HistoryIcon fontSize="small" />
        </IconButton>
      )}
      {onViewImage && item.urlImagen && (
        <Button
          size="small"
          variant="outlined"
          startIcon={<ImageIcon />}
          onClick={(e) => {
            e.stopPropagation();
            onViewImage(item.urlImagen);
          }}
          sx={{
            minWidth: "auto",
            px: 1,
            py: 0.5,
            fontSize: "0.75rem",
          }}
        >
          Ver
        </Button>
      )}
    </Stack>
  );
};

export default TableActions;
