import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Autocomplete,
  TextField,
  CircularProgress,
} from '@mui/material';
import profileService from 'src/services/profileService';

export const SpyAccountModal = ({ open, onClose, onSpyUser, user }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userInput, setUserInput] = useState('');

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoading(true);
    const profiles = await profileService.getProfiles();
    console.log('profiles', profiles);
    setUsers(profiles.filter((profile) => profile.email && profile.email !== user.email));
    setLoading(false);
  };

  const userOptions = useMemo(
    () =>
      users.map((u) => ({
        id: u.id,
        label: `${u.empresaData?.nombre || ''} ${u.email || ''} ${u.phone || ''} ${
          u.firstName || ''
        } ${u.lastName || ''}`.trim(),
        ...u,
      })),
    [users]
  );

  useEffect(() => {
    setUserInput(selectedUser?.label || '');
  }, [selectedUser]);

  const matchesOption = (text) =>
    !!userOptions.find((o) =>
      (o.label || '')
        .trim()
        .toUpperCase()
        .includes((text || '').trim().toUpperCase())
    );

  const selectedOption = userOptions.find((o) => o.id === selectedUser?.id) || null;

  const invalidUser = userInput !== '' && !matchesOption(userInput);

  const handleConfirm = () => {
    if (selectedUser) {
      onSpyUser(selectedUser);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedUser(null);
    setUserInput('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Seleccionar cuenta</DialogTitle>
      <DialogContent>
        <Autocomplete
          options={userOptions}
          value={selectedOption}
          inputValue={userInput}
          onInputChange={(_, newInput) => setUserInput(newInput || '')}
          onChange={(_, value) => setSelectedUser(value)}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          getOptionLabel={(option) => option?.label || ''}
          loading={loading}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Buscar usuario"
              margin="normal"
              required
              fullWidth
              error={invalidUser}
              helperText={invalidUser ? 'Debés seleccionar un usuario de la lista' : undefined}
              onBlur={() => {
                if (!matchesOption(userInput)) {
                  setUserInput('');
                  setSelectedUser(null);
                }
              }}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading ? (
                      <CircularProgress sx={{ alignSelf: 'center' }} color="inherit" size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          ListboxProps={{
            style: { maxHeight: 200, overflow: 'auto' },
          }}
          filterOptions={(options, { inputValue }) => {
            const filtered = options.filter((option) =>
              option.label.toLowerCase().includes(inputValue.toLowerCase())
            );
            return filtered.slice(0, 50);
          }}
          freeSolo={false}
          selectOnFocus
          clearOnBlur={false}
          handleHomeEndKeys
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
