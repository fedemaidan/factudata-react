import React, { useState } from "react";
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import HistoryIcon from "@mui/icons-material/History";
import ImageIcon from "@mui/icons-material/Image";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

const RowActions = ({ item, onEdit, onViewHistory, onViewImage, onDelete, showImage = false }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <IconButton size="small" onClick={handleOpen} sx={{ p: 0.5 }}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        MenuListProps={{ dense: true }}
      >
        {onEdit && (
          <MenuItem
            onClick={() => {
              onEdit(item);
              handleClose();
            }}
          >
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Editar" />
          </MenuItem>
        )}
        {onViewHistory && (
          <MenuItem
            onClick={() => {
              onViewHistory(item);
              handleClose();
            }}
          >
            <ListItemIcon>
              <HistoryIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Historial" />
          </MenuItem>
        )}
        {showImage && onViewImage && item?.urlImagen && (
          <MenuItem
            onClick={() => {
              onViewImage(item.urlImagen);
              handleClose();
            }}
          >
            <ListItemIcon>
              <ImageIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Ver imagen" />
          </MenuItem>
        )}
        {onDelete && (
          <MenuItem
            onClick={() => {
              onDelete(item);
              handleClose();
            }}
          >
            <ListItemIcon>
              <DeleteOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Eliminar" />
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default RowActions;
