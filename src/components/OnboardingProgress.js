/**
 * OnboardingProgress.js
 * 
 * Componente que muestra el progreso de onboarding del usuario actual.
 * Presenta una vista de módulos con pasos (checklist) y barras de progreso.
 * Se consume desde el dashboard principal o la página de caja.
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  Chip,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useAuthContext } from 'src/contexts/auth-context';
import api from 'src/services/axiosConfig';

const MODULO_ICONS = {
  caja: '💰',
  notaPedido: '📋',
  acopio: '📦',
  tomaDecision: '📊',
};

export function OnboardingProgress() {
  const { user } = useAuthContext();
  const theme = useTheme();
  const [progreso, setProgreso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandidos, setExpandidos] = useState({});

  useEffect(() => {
    if (!user?.id) return;

    const fetchProgreso = async () => {
      try {
        const response = await api.get(`/onboarding/${user.id}/progreso`);
        if (!response.data?.error && response.data?.data) {
          setProgreso(response.data.data);
          // Expandir el primer módulo incompleto por defecto
          const primerIncompleto = response.data.data.modulos?.find(m => m.scorePercent < 100);
          if (primerIncompleto) {
            setExpandidos({ [primerIncompleto.id]: true });
          }
        }
      } catch (err) {
        // Silencioso: si no tiene onboarding, simplemente no mostrar el componente
        console.debug('[OnboardingProgress] Sin onboarding:', err?.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProgreso();
  }, [user?.id]);

  if (loading || !progreso) return null;

  // No mostrar si el onboarding está completo al 100%
  if (progreso.scoreGeneralPercent >= 100) return null;

  const toggleModulo = (moduloId) => {
    setExpandidos(prev => ({ ...prev, [moduloId]: !prev[moduloId] }));
  };

  return (
    <Card
      sx={{
        mb: 3,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
      }}
    >
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <EmojiEventsIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Tu progreso en Sorby
            </Typography>
          </Stack>
          <Chip
            label={`${progreso.scoreGeneralPercent}%`}
            color={progreso.scoreGeneralPercent >= 70 ? 'success' : progreso.scoreGeneralPercent >= 40 ? 'warning' : 'default'}
            size="small"
            sx={{ fontWeight: 'bold' }}
          />
        </Stack>

        <LinearProgress
          variant="determinate"
          value={progreso.scoreGeneralPercent}
          sx={{
            mb: 2,
            height: 8,
            borderRadius: 4,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
          }}
        />

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Completá estos pasos para sacarle el máximo provecho a Sorby. ¡Cada paso cuenta!
        </Typography>

        {progreso.modulos.map((modulo) => (
          <Box key={modulo.id} sx={{ mb: 1 }}>
            <Box
              onClick={() => toggleModulo(modulo.id)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                py: 1,
                px: 1,
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.action.hover, 0.5),
                },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography fontSize="1.2rem">
                  {MODULO_ICONS[modulo.id] || '📌'}
                </Typography>
                <Typography variant="subtitle2" fontWeight="bold">
                  {modulo.nombre.replace(/^[^\s]+\s/, '')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ({modulo.completados}/{modulo.totalPasos})
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <LinearProgress
                  variant="determinate"
                  value={modulo.scorePercent}
                  sx={{
                    width: 60,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  }}
                />
                <IconButton size="small">
                  {expandidos[modulo.id] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
              </Stack>
            </Box>

            <Collapse in={expandidos[modulo.id]}>
              <List dense disablePadding sx={{ pl: 2 }}>
                {modulo.pasos.map((paso) => (
                  <ListItem key={paso.id} disablePadding sx={{ py: 0.3 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {paso.completado ? (
                        <CheckCircleIcon color="success" fontSize="small" />
                      ) : (
                        <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={paso.nombre}
                      primaryTypographyProps={{
                        variant: 'body2',
                        sx: {
                          textDecoration: paso.completado ? 'line-through' : 'none',
                          color: paso.completado ? 'text.secondary' : 'text.primary',
                        },
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}

export default OnboardingProgress;
