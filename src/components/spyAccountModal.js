import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Autocomplete,
  TextField,
  CircularProgress,
} from "@mui/material";
import profileService from "src/services/profileService";

export const SpyAccountModal = ({ open, onClose, onSpyUser, user }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoading(true);
    const profiles = await profileService.getProfiles();
    setUsers(profiles.filter((profile) => profile.email && profile.email !== user.email));
    setLoading(false);
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
  };

  const handleConfirm = () => {
    if (selectedUser) {
      onSpyUser(selectedUser);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedUser(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Seleccionar cuenta</DialogTitle>
      <DialogContent>
        <Autocomplete
          freeSolo
          options={users}
          getOptionLabel={(user) => user.email}
          loading={loading}
          value={selectedUser}
          onChange={(_, value) => handleSelectUser(value)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Buscar por email"
              margin="normal"
              required
              fullWidth
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading ? (
                      <CircularProgress sx={{ alignSelf: "center" }} color="inherit" size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          ListboxProps={{
            style: { maxHeight: 200, overflow: "auto" },
          }}
          filterOptions={(options, { inputValue }) => {
            const filtered = options.filter((option) =>
              option.email.toLowerCase().includes(inputValue.toLowerCase())
            );
            return filtered.slice(0, 50);
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!selectedUser}>
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

SpyAccountModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSpyUser: PropTypes.func.isRequired,
};
