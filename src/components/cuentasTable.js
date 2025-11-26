import React, { useState } from 'react';
import {
  Table, TableHead, TableRow, TableCell, TableBody,
  Button, Collapse, Box, Typography, Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { formatCurrency, formatTimestamp, toDateFromFirestore } from 'src/utils/formatters';
import { CuotaRowWithActions } from './cuotaRowWithActions';
import CuentasPendientesService from 'src/services/cuentasPendientesService';

export const CuentasTable = ({
  cuentas,
  expandedCuentaId,
  setExpandedCuentaId,
  onEliminar,
  fetchCuentas,
  setCuentas
}) => {
  const [cargandoId, setCargandoId] = useState(null);

  const handleToggleDetalle = async (cuenta) => {
    console.log(cuenta)
    const esExpandida = expandedCuentaId === cuenta.id;

    if (esExpandida) {
      setExpandedCuentaId(null);
      return;
    }

    if (!cuenta.cuotas) {
      setCargandoId(cuenta.id);
      const {cuenta: cuentaActualizada, cuotas} = await CuentasPendientesService.obtenerCuenta(cuenta.id);
      
      setCuentas(prev =>
        prev.map(c => c.id === cuenta.id ? { ...c, cuotas } : c)
      );
      setCargandoId(null);
    }

    setExpandedCuentaId(cuenta.id);
  };
  return (
  <Table>
    <TableHead>
      <TableRow>
        <TableCell>Proyecto</TableCell>
        <TableCell>Subproyecto</TableCell>
        <TableCell>Descripción</TableCell>
        <TableCell>Tipo</TableCell>
        <TableCell>Cliente/Proveedor</TableCell>
        <TableCell>Monto Total</TableCell>
        <TableCell>Moneda</TableCell>
        <TableCell>Cuotas</TableCell>
        <TableCell>Indexación</TableCell>
        <TableCell>Fecha</TableCell>
        <TableCell>Acciones</TableCell>
      </TableRow>
    </TableHead>

    <TableBody>
      {cuentas.map((cuenta) => (
        <React.Fragment key={cuenta.id}>
          <TableRow>
            <TableCell>{cuenta.proyecto_nombre || '-'}</TableCell>
            <TableCell>{cuenta.subproyecto_nombre || '-'}</TableCell>
            <TableCell>{cuenta.descripcion}</TableCell>
            <TableCell>
              <Chip
                label={cuenta.tipo === 'a_cobrar' ? 'A cobrar' : 'A pagar'}
                color={cuenta.tipo === 'a_cobrar' ? 'success' : 'error'}
                size="small"
              />
            </TableCell>

            <TableCell>{cuenta.proveedor_o_cliente}</TableCell>
            <TableCell>{formatCurrency(cuenta.monto_total)}</TableCell>
            <TableCell>{cuenta.moneda_nominal}</TableCell>
            <TableCell>{cuenta.cantidad_cuotas}</TableCell>
            <TableCell>{cuenta.unidad_indexacion || '-'}</TableCell>
            <TableCell>{cuenta.fecha_creacion ? formatTimestamp(cuenta.fecha_creacion) : '-'}</TableCell>
            <TableCell>
              <Button
              onClick={() => handleToggleDetalle(cuenta)}
                startIcon={expandedCuentaId === cuenta.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              >
                {expandedCuentaId === cuenta.id ? 'Ocultar' : 'Ver Detalle'}
              </Button>
              <Button
                color="error"
                sx={{ ml: 1 }}
                onClick={async () => {
                  const confirmar = window.confirm(`¿Seguro que querés eliminar la cuenta "${cuenta.descripcion}"?`);
                  if (!confirmar) return;
                  await onEliminar(cuenta.id);
                  await fetchCuentas();
                }}
              >
                Eliminar
              </Button>
            </TableCell>
          </TableRow>

          <TableRow>
            <TableCell colSpan={8} sx={{ p: 0 }}>
              <Collapse in={expandedCuentaId === cuenta.id}>
                <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Cuotas</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>N°</TableCell>
                        <TableCell>Monto</TableCell>
                        <TableCell>Vencimiento</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Pagado</TableCell>
                        <TableCell>Pagos</TableCell>
                        <TableCell>Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                          {cargandoId === cuenta.id ? (
                            <TableRow>
                              <TableCell colSpan={7}>Cargando cuotas...</TableCell>
                            </TableRow>
                          ) : (
                            (cuenta.cuotas || [])
                              .sort((a, b) => {
                                const fechaA = toDateFromFirestore(a.fecha_vencimiento);
                                const fechaB = toDateFromFirestore(b.fecha_vencimiento);
                                
                                // Si alguna fecha es inválida, ponerla al final
                                if (!fechaA && !fechaB) return (a.numero || 0) - (b.numero || 0);
                                if (!fechaA) return 1;
                                if (!fechaB) return -1;

                                if (fechaA.getTime() !== fechaB.getTime()) {
                                  return fechaA - fechaB;
                                }
                                return (a.numero || 0) - (b.numero || 0);
                              })
                              .map((cuota, idx) => (
                              <CuotaRowWithActions
                                key={cuota.id || idx}
                                cuota={cuota}
                                cuentaId={cuenta.id}
                                onActualizar={fetchCuentas}
                              />
                            ))
                          )}
                        </TableBody>
                  </Table>
                </Box>
              </Collapse>
            </TableCell>
          </TableRow>
        </React.Fragment>
      ))}
    </TableBody>
  </Table>)};
