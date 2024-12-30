import React from 'react';
import { Snackbar, Alert } from '@mui/material';

const Alerts = ({ alert, onClose }) => {
  if (!alert || !alert.open) return null;

  return (
    <Snackbar
      open={alert.open}
      autoHideDuration={6000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={onClose} severity={alert.severity} variant="filled">
        {alert.message}
      </Alert>
    </Snackbar>
  );
};

export default Alerts;
