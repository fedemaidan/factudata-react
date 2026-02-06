// src/components/TooltipHelp.js
import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

/**
 * Componente de Tooltip con ayuda paso a paso
 * Ideal para UX "a prueba de boludos" - explica qué hace cada botón
 * 
 * @param {string} title - Título del tooltip (ej: "📥 Exportar Excel")
 * @param {string[]} steps - Pasos explicativos (ej: ["Descarga archivo", "Abrí con Excel"])
 * @param {string} description - Descripción alternativa (si no querés usar steps)
 * @param {boolean} showIcon - Mostrar ícono de ayuda al lado del children
 * @param {string} placement - Posición del tooltip (default: "bottom")
 * @param {ReactNode} children - Elemento que activa el tooltip (botón, etc)
 */
export default function TooltipHelp({ 
  title, 
  steps = [], 
  description,
  showIcon = false,
  placement = 'bottom',
  children 
}) {
  const tooltipContent = (
    <Box sx={{ p: 0.5, maxWidth: 280 }}>
      {title && (
        <Typography 
          variant="subtitle2" 
          sx={{ fontWeight: 700, mb: steps.length > 0 || description ? 0.5 : 0 }}
        >
          {title}
        </Typography>
      )}
      
      {description && (
        <Typography variant="caption" component="div" sx={{ color: 'grey.300' }}>
          {description}
        </Typography>
      )}
      
      {steps.length > 0 && (
        <Box component="ol" sx={{ m: 0, pl: 2, mt: 0.5 }}>
          {steps.map((step, i) => (
            <Typography 
              key={i} 
              component="li" 
              variant="caption" 
              sx={{ color: 'grey.300', mb: 0.25 }}
            >
              {step}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );

  if (showIcon) {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
        {children}
        <Tooltip arrow placement={placement} title={tooltipContent}>
          <HelpOutlineIcon 
            sx={{ 
              fontSize: 16, 
              color: 'text.secondary', 
              cursor: 'help',
              '&:hover': { color: 'primary.main' }
            }} 
          />
        </Tooltip>
      </Box>
    );
  }

  return (
    <Tooltip arrow placement={placement} title={tooltipContent}>
      {children}
    </Tooltip>
  );
}
