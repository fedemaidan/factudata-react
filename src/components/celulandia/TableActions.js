import React from "react";
import { Stack, IconButton } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import HistoryIcon from "@mui/icons-material/History";

const TableActions = ({ item, onEdit, onViewHistory }) => {
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
    </Stack>
  );
};

export default TableActions;
