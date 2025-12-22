import { useEffect, useState, useCallback } from "react";

const DEFAULT_ALERT = {
  open: false,
  message: "",
  severity: "error",
};

const useModalAlert = (open) => {
  const [alert, setAlert] = useState(DEFAULT_ALERT);

  useEffect(() => {
    setAlert((prev) => ({ ...prev, open: false }));
  }, [open]);

  const showAlert = useCallback(({ message, severity = "error" }) => {
    setAlert({ open: true, message: message || "", severity });
  }, []);

  const closeAlert = useCallback((_event, reason) => {
    if (reason === "clickaway") return;
    setAlert((prev) => ({ ...prev, open: false }));
  }, []);

  const resetAlert = useCallback(() => {
    setAlert(DEFAULT_ALERT);
  }, []);

  return { alert, showAlert, closeAlert, resetAlert };
};

export default useModalAlert;
