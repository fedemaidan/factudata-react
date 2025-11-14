// src/components/loteParaTodos/LoteInfoExtendida.js
import React from 'react';
import {
  Box, Typography, Stack, Chip, IconButton, Tooltip,
  Grid, Card, CardContent, Button, Link
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Description as DocumentIcon,
  Link as LinkIcon,
  Person as PersonIcon,
  AccountBalance as AccountBalanceIcon
} from '@mui/icons-material';

import { 
  CONDICION_LOTE_LABELS, 
  CONDICION_LOTE_COLORS,
  ESTADO_LEGAL_LABELS,
  ESTADO_LEGAL_COLORS,
  SITUACION_FISICA_LABELS,
  SITUACION_FISICA_COLORS
} from '../../data/loteParaTodos/constantes.js';
import { generarLinkDeudaMunicipal } from '../../data/loteParaTodos/mockLotes.js';
import { getVendedorById } from '../../data/loteParaTodos/mockVendedores.js';

const LoteInfoExtendida = ({ 
  lote, 
  emprendimiento, 
  showActions = true,
  onNuevaReserva,
  onEditarLote,
  onVerDocumentos 
}) => {
  const vendedorResponsable = lote.vendedor_responsable_id 
    ? getVendedorById(lote.vendedor_responsable_id)
    : null;
    
  const linkDeudaMunicipal = generarLinkDeudaMunicipal(
    lote.numero_partida, 
    emprendimiento?.municipio
  );

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Grid container spacing={3}>
          {/* Información básica del lote */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                <Typography variant="h5" fontWeight={700}>
                  Lote {lote.numero}
                </Typography>
                <Chip 
                  label={CONDICION_LOTE_LABELS[lote.condicion_lote]} 
                  color={CONDICION_LOTE_COLORS[lote.condicion_lote]}
                  size="small"
                />
              </Stack>
              
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Manzana:</strong> {lote.manzana}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Superficie:</strong> {lote.superficie}m²
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Precio Base:</strong> ${lote.precio_base?.toLocaleString('es-AR')}
                </Typography>
                {lote.fecha_venta && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Fecha Venta:</strong> {new Date(lote.fecha_venta).toLocaleDateString('es-AR')}
                  </Typography>
                )}
              </Stack>
            </Box>
          </Grid>

          {/* Estados del lote */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" sx={{ mb: 2 }}>Estados</Typography>
            
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="body2" sx={{ minWidth: 120 }}>
                  <strong>Condición:</strong>
                </Typography>
                <Chip 
                  label={CONDICION_LOTE_LABELS[lote.condicion_lote]} 
                  color={CONDICION_LOTE_COLORS[lote.condicion_lote]}
                  size="small"
                />
              </Stack>
              
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="body2" sx={{ minWidth: 120 }}>
                  <strong>Estado Legal:</strong>
                </Typography>
                <Chip 
                  label={ESTADO_LEGAL_LABELS[lote.estado_legal]} 
                  color={ESTADO_LEGAL_COLORS[lote.estado_legal]}
                  size="small"
                />
              </Stack>
              
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="body2" sx={{ minWidth: 120 }}>
                  <strong>Situación Física:</strong>
                </Typography>
                <Chip 
                  label={SITUACION_FISICA_LABELS[lote.situacion_fisica]} 
                  color={SITUACION_FISICA_COLORS[lote.situacion_fisica]}
                  size="small"
                />
              </Stack>
            </Stack>
          </Grid>

          {/* Información adicional */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2 }}>Información Adicional</Typography>
            
            <Grid container spacing={2}>
              {/* Número de partida y deuda municipal */}
              {lote.numero_partida && (
                <Grid item xs={12} sm={6} md={4}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <AccountBalanceIcon color="action" fontSize="small" />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Partida Municipal
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {lote.numero_partida}
                      </Typography>
                      {linkDeudaMunicipal && (
                        <Link 
                          href={linkDeudaMunicipal} 
                          target="_blank" 
                          rel="noopener"
                          sx={{ fontSize: '0.75rem' }}
                        >
                          Ver deuda municipal
                        </Link>
                      )}
                    </Box>
                  </Stack>
                </Grid>
              )}

              {/* Vendedor responsable */}
              {vendedorResponsable && (
                <Grid item xs={12} sm={6} md={4}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <PersonIcon color="action" fontSize="small" />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Vendedor Responsable
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {vendedorResponsable.nombre} {vendedorResponsable.apellido}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {vendedorResponsable.email}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
              )}

              {/* Master plan */}
              {emprendimiento?.master_plan_url && (
                <Grid item xs={12} sm={6} md={4}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <LocationIcon color="action" fontSize="small" />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Master Plan
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<DocumentIcon />}
                        onClick={() => window.open(emprendimiento.master_plan_url, '_blank')}
                      >
                        Ver plano
                      </Button>
                    </Box>
                  </Stack>
                </Grid>
              )}
            </Grid>
          </Grid>

          {/* Observaciones */}
          {lote.observaciones_lote && (
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 1 }}>Observaciones del Lote</Typography>
              <Typography variant="body2" color="text.secondary">
                {lote.observaciones_lote}
              </Typography>
            </Grid>
          )}

          {/* Documentos del emprendimiento */}
          {emprendimiento?.documentos_reglamento?.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>Documentos del Emprendimiento</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {emprendimiento.documentos_reglamento.map((doc, index) => (
                  <Button
                    key={index}
                    size="small"
                    variant="outlined"
                    startIcon={<DocumentIcon />}
                    onClick={() => window.open(doc.url, '_blank')}
                  >
                    {doc.nombre}
                  </Button>
                ))}
              </Stack>
            </Grid>
          )}

          {/* Acciones */}
          {showActions && (
            <Grid item xs={12}>
              <Stack direction="row" spacing={2} sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
                {/* Botón Nueva Reserva/Venta - Solo para lotes disponibles o pre-reservados */}
                {['disponible', 'pre_reservado'].includes(lote.condicion_lote) && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => onNuevaReserva?.(lote)}
                  >
                    {lote.condicion_lote === 'pre_reservado' 
                      ? 'Completar Reserva' 
                      : 'Nueva Reserva/Venta'
                    }
                  </Button>
                )}

                <Button
                  variant="outlined"
                  onClick={() => onEditarLote?.(lote)}
                >
                  Editar Lote
                </Button>

                {emprendimiento?.documentos_reglamento?.length > 0 && (
                  <Button
                    variant="outlined"
                    startIcon={<DocumentIcon />}
                    onClick={() => onVerDocumentos?.(emprendimiento)}
                  >
                    Ver Reglamento
                  </Button>
                )}
              </Stack>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default LoteInfoExtendida;