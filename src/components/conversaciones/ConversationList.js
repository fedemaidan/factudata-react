import { useState, useEffect } from "react";
import {
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Badge,
  OutlinedInput,
  InputAdornment,
  IconButton,
  Button,
  FormControlLabel,
  Checkbox,
  TextField,
  Alert,
  Collapse,
  CircularProgress,
  Chip,
  Tooltip
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import ConversacionesFilter from "./ConversacionesFilter";
import { formatFecha } from "src/utils/handleDates";
import { useConversationsContext } from "src/contexts/conversations-context";
import { getNombreCliente } from "src/utils/conversacionesUtils";
import { subDays, format, differenceInDays, parseISO } from "date-fns";

// Colores para los estados de cliente
const ESTADO_CLIENTE_COLORS = {
  cliente_activo: { border: '#4caf50', bg: '#e8f5e9', label: 'Activo' },      // Verde
  dado_de_baja: { border: '#ef5350', bg: '#ffebee', label: 'Baja' },          // Rojo sutil
  no_cliente: { border: '#2196f3', bg: '#e3f2fd', label: 'Nuevo' },           // Azul
};

// Obtiene el estado de cliente de una conversación
const getEstadoCliente = (conversation) => {
  const empresa = conversation?.empresa;
  if (!empresa) return 'no_cliente';  // Sin empresa = Nuevo
  if (!empresa.esCliente) return 'no_cliente';
  if (empresa.estaDadoDeBaja) return 'dado_de_baja';
  return 'cliente_activo';
};

export default function ConversationList({ onSelect, onMessageSelect }) {
  const {
    conversations = [],
    selected,
    search,
    filters = {},
    messageResults = [],
    onSearch,
    onRefreshConversations,
    onSelectConversation,
    onMessageSelect: handleMessageSelect,
    onFiltersChange,
    loading
  } = useConversationsContext();

  const [localSearch, setLocalSearch] = useState(search || "");
  const [searchInMessages, setSearchInMessages] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState("");
  
  // Default dates: last 7 days
  const [dates, setDates] = useState({
    start: format(subDays(new Date(), 7), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd")
  });

  useEffect(() => {
    if (search !== localSearch) {
      setLocalSearch(search || "");
    }
  }, [search]);

  const handleSearchClick = () => {
    setError("");
    
    if (searchInMessages) {
      if (!dates.start || !dates.end) {
        setError("Debes seleccionar un rango de fechas para buscar en mensajes.");
        return;
      }

      const start = parseISO(dates.start);
      const end = parseISO(dates.end);
      const diff = differenceInDays(end, start);

      if (diff > 7) {
        setError("El rango máximo para buscar en mensajes es de 7 días.");
        return;
      }
      
      if (diff < 0) {
        setError("La fecha de fin debe ser posterior a la de inicio.");
        return;
      }
    }

    // Pass extra params via onSearch if supported, or handle via context update
    // Assuming onSearch handles the query update. We might need to update context to handle filters too.
    // For now, we'll pass the query. The context needs to be updated to handle message search flag.
    onSearch?.(localSearch, { 
      searchInMessages, 
      fechaDesde: dates.start, 
      fechaHasta: dates.end 
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearchClick();
    }
  };

  const selectedId = selected?.ultimoMensaje?.id_conversacion;

  const renderInsightBadge = (count) => {
    const insightCount = Number(count || 0);
    if (!insightCount) {
      return null;
    }

    return (
      <Badge
        color="warning"
        badgeContent={insightCount}
        sx={{
          "& .MuiBadge-badge": {
            fontSize: "0.65rem",
            minWidth: 16,
            height: 16,
            px: 0.5
          }
        }}
      >
        <Box sx={{ width: 8, height: 8 }} />
      </Badge>
    );
  };

  const renderMessageSnippet = (match) => {
    const text = match?.matchMessage?.message || match?.matchMessage?.caption || "[Sin texto]";
    return text?.length > 80 ? `${text.slice(0, 80)}…` : text;
  };

  const hasConversationResults = conversations.length > 0;
  const hasMessageResults = messageResults.length > 0;

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Box
        sx={{
          p: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          borderBottom: 1,
          borderColor: "divider"
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <OutlinedInput
            fullWidth
            size="small"
            placeholder="Buscar conversación..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
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
            onClick={handleSearchClick}
            sx={{ minWidth: 'auto', px: 2 }}
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
        </Box>

        {localSearch && (
          <Box>
             <Button 
                size="small" 
                onClick={() => {
                    setSearchInMessages(!searchInMessages);
                    if (!searchInMessages) setShowFilters(true);
                }}
                sx={{ textTransform: 'none', p: 0, justifyContent: 'flex-start' }}
             >
                {searchInMessages ? "No buscar en mensajes" : "¿Buscar también en mensajes?"}
             </Button>
          </Box>
        )}

        <Collapse in={searchInMessages}>
            <Box display="flex" flexDirection="column" gap={1} mt={1} p={1} bgcolor="action.hover" borderRadius={1}>
                <Typography variant="caption" color="text.secondary">
                    Búsqueda en mensajes (Máx 7 días)
                </Typography>
                <Box display="flex" gap={1}>
                    <TextField
                        type="date"
                        size="small"
                        value={dates.start}
                        onChange={(e) => setDates({...dates, start: e.target.value})}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        type="date"
                        size="small"
                        value={dates.end}
                        onChange={(e) => setDates({...dates, end: e.target.value})}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                    />
                </Box>
                {error && (
                    <Alert severity="warning" sx={{ py: 0, px: 1, '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
                        {error}
                    </Alert>
                )}
            </Box>
        </Collapse>
        
        <ConversacionesFilter />

        {/* Chips de filtro rápido por estado de cliente */}
        <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
          {[
            { value: 'todos', label: 'Todos', color: 'default' },
            { value: 'cliente_activo', label: 'Activos', color: 'success' },
            { value: 'dado_de_baja', label: 'Bajas', color: 'default' },
            { value: 'no_cliente', label: 'Nuevos', color: 'info' },
          ].map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              size="small"
              color={filters?.estadoCliente === option.value || (!filters?.estadoCliente && option.value === 'todos') ? option.color : 'default'}
              variant={filters?.estadoCliente === option.value || (!filters?.estadoCliente && option.value === 'todos') ? 'filled' : 'outlined'}
              onClick={() => onFiltersChange?.({ ...filters, estadoCliente: option.value, empresaId: '' })}
              sx={{ 
                cursor: 'pointer',
                fontSize: '0.7rem',
                height: 24,
              }}
            />
          ))}
        </Box>
      </Box>

      <Box flex={1} overflow="auto" position="relative">
        {loading && (
            <Box 
                position="absolute" 
                top={0} 
                left={0} 
                right={0} 
                bottom={0} 
                bgcolor="rgba(255,255,255,0.7)" 
                zIndex={1} 
                display="flex" 
                alignItems="center" 
                justifyContent="center"
            >
                <CircularProgress />
            </Box>
        )}
        <List dense sx={{ overflowY: "auto" }}>
          {conversations.map((c) => {
            const estadoCliente = getEstadoCliente(c);
            const estadoConfig = ESTADO_CLIENTE_COLORS[estadoCliente];
            
            return (
            <Tooltip 
              key={c.ultimoMensaje?.id_conversacion}
              title={estadoConfig?.label || ''}
              placement="left"
              arrow
            >
              <ListItemButton
                selected={c.ultimoMensaje?.id_conversacion === selectedId}
                onClick={() => {
                  onSelectConversation(c);
                  onSelect?.(c);
                }}
                sx={{
                  borderLeft: `4px solid ${estadoConfig?.border || 'transparent'}`,
                  '&:hover': {
                    bgcolor: estadoConfig?.bg || 'action.hover',
                  },
                  '&.Mui-selected': {
                    borderLeft: `4px solid ${estadoConfig?.border || 'transparent'}`,
                  }
                }}
              >
                <ListItemAvatar>
                  <Avatar>
                    {getNombreCliente(c)?.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography fontWeight={600} noWrap>
                      {getNombreCliente(c)}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      {filters?.showInsight && renderInsightBadge(c.insightCount)}
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ minWidth: 45, textAlign: "right" }}
                      >
                        {formatFecha(c.ultimoMensaje?.fecha)}
                      </Typography>
                    </Box>
                  </Box>
                }
                secondary={
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {c.ultimoMensaje?.type === "text" || c.ultimoMensaje?.type === "text_extended"
                      ? c.ultimoMensaje?.message || ""
                      : `${
                          c.ultimoMensaje?.type.charAt(0).toUpperCase() + c.ultimoMensaje?.type.slice(1)
                        }`}
                  </Typography>
                }
              />
              </ListItemButton>
            </Tooltip>
          );
          })}
          {!hasConversationResults && !hasMessageResults && (
            <Box p={2}>
              <Typography variant="body2" color="text.secondary">
                Sin conversaciones
              </Typography>
            </Box>
          )}
        </List>

        {hasMessageResults && (
          <>
            <Box px={2} py={1}>
              <Divider />
              <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 600 }}>
                Mensajes
              </Typography>
            </Box> 
            <List dense>
              {messageResults.map((match, index) => {
                const primaryLabel = getNombreCliente(match.conversation);
                const messageId = match.matchMessage?.id || match.matchMessage?._id;
                const uniqueKey = `${match.conversationId}-${messageId || index}`;
                return (
                  <ListItemButton
                    key={uniqueKey}
                    onClick={() => {
                      handleMessageSelect(match);
                      onMessageSelect?.(match);
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar>
                        {primaryLabel?.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Typography fontWeight={600} noWrap>
                            {primaryLabel}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ minWidth: 50, textAlign: "right" }}
                          >
                            {formatFecha(match.matchMessage?.createdAt)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {renderMessageSnippet(match)}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </>
        )}
      </Box>
    </Box>
  );
}
