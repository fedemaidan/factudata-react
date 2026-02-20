import { useState, useEffect, useCallback, memo } from "react";
import {
  Box,
  OutlinedInput,
  InputAdornment,
  IconButton,
  Button,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import CachedIcon from "@mui/icons-material/Cached";

const ConversationSearchBox = memo(function ConversationSearchBox({
  initialSearch = "",
  onSearchSubmit,
  loading,
  onRefreshConversations,
  onForceRefresh,
}) {
  const [value, setValue] = useState(initialSearch || "");

  useEffect(() => {
    if (initialSearch !== value) setValue(initialSearch || "");
  }, [initialSearch]);

  const handleSubmit = useCallback(() => {
    onSearchSubmit?.(value);
  }, [value, onSearchSubmit]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") handleSubmit();
    },
    [handleSubmit]
  );

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <OutlinedInput
        fullWidth
        size="small"
        placeholder="Buscar conversación..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        startAdornment={
          <InputAdornment position="start">
            <SearchIcon fontSize="small" sx={{ color: "action.active" }} />
          </InputAdornment>
        }
      />
      <Button
        variant="contained"
        size="small"
        onClick={handleSubmit}
        sx={{ minWidth: "auto", px: 2 }}
        disabled={loading}
      >
        {loading ? <CircularProgress size={20} color="inherit" /> : "Buscar"}
      </Button>
      <IconButton
        onClick={onRefreshConversations}
        title="Refrescar lista"
        size="small"
        sx={{ flexShrink: 0, color: "action.active" }}
        disabled={loading}
      >
        <RefreshIcon fontSize="small" />
      </IconButton>
      <Tooltip title="Recargar todo desde cero (limpia caché local)" arrow>
        <IconButton
          onClick={onForceRefresh}
          size="small"
          sx={{ flexShrink: 0, color: "warning.main" }}
          disabled={loading}
        >
          <CachedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
});

export default ConversationSearchBox;
