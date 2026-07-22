import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Chip, Divider, LinearProgress, Paper, Stack, Typography,
} from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import PaidIcon from '@mui/icons-material/Paid';
import EngineeringIcon from '@mui/icons-material/Engineering';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FormDrawer from 'src/components/controlObra/FormDrawer';
import { fmt } from 'src/components/controlObra/ui';
import NuevoCertificadoDialog from 'src/components/controlObra/NuevoCertificadoDialog';
import ImputarGastoDialog from 'src/components/controlObra/ImputarGastoDialog';
import EditarTareaDrawer from 'src/components/controlObra/EditarTareaDrawer';
import {
  RegistrarAvanceDialog, ResponsableDrawer, ContratoProveedorDrawer, EliminarSubrubroDialog,
} from 'src/components/controlObra/subrubroEditores';

const margenColor = (m) => (m >= 0 ? 'success.main' : 'error.main');
const fmtFecha = (d) => (d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', timeZone: 'UTC' }) : '—');
const signo = (n) => `${n >= 0 ? '+' : ''}${fmt(n)}`;

// Métrica compacta de la cabecera-resumen.
function Metric({ label, value, color, sub }) {
  return (
    <Box sx={{ flex: 1, minWidth: 120 }}>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="subtitle2" fontWeight={700} sx={{ color: color || 'text.primary' }}>{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Box>
  );
}

// Sección editable: título + icono, un resumen y un botón que abre el editor.
function Seccion({ icon, title, resumen, actionLabel, onAction, danger }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          {icon}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={600}>{title}</Typography>
            {resumen && <Typography variant="caption" color="text.secondary" display="block">{resumen}</Typography>}
          </Box>
        </Stack>
        <Button size="small" color={danger ? 'error' : 'primary'} onClick={onAction} sx={{ flexShrink: 0 }}>{actionLabel}</Button>
      </Stack>
    </Paper>
  );
}

// Drawer de detalle de una tarea (sub-rubro): muestra todo de un vistazo y permite
// editar cada aspecto reusando los editores del módulo. `subrubro` = fila de Ejecución.
export default function SubrubroDetalleDrawer({ obra, subrubro: s, empresaId, onClose }) {
  const qc = useQueryClient();
  const [editor, setEditor] = useState(null);
  const cerrarEditor = () => setEditor(null);
  const onDone = () => { qc.invalidateQueries({ queryKey: ['control-obra'] }); setEditor(null); };

  const cp = s.contrato_proveedor;
  const resp = s.responsable;
  const costoResumen = s.costo_directo != null
    ? `prov ${fmt(s.costo_proveedor || 0)} + dir ${fmt(s.costo_directo)}`
    : (s.costo_ref != null ? 'proveedor / estimado' : 'sin costo cargado');

  return (
    <>
      <FormDrawer
        open onClose={onClose} width={520}
        title={s.nombre}
        subtitle={`físico ${s.avance_pct || 0}% · certificado ${s.cert_pct || 0}%`}
        actions={<Button onClick={onClose}>Cerrar</Button>}
      >
        <Stack spacing={2}>
          {/* Chips de estado */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {s.atrasada && <Chip size="small" color="error" variant="outlined" label="atrasada" />}
            {s.sobrecosto && <Chip size="small" color="error" variant="outlined" label="sobrecosto" />}
            {(s.fecha_inicio || s.fecha_fin) && <Chip size="small" variant="outlined" label={`📅 ${fmtFecha(s.fecha_inicio)} → ${fmtFecha(s.fecha_fin)}`} />}
          </Stack>

          {/* Cabecera-resumen: números clave */}
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Stack direction="row" flexWrap="wrap" useFlexGap rowGap={1.5}>
              <Metric label="Contrato cliente" value={fmt(s.contrato)} />
              <Metric label="Costo de referencia" value={s.costo_ref != null ? fmt(s.costo_ref) : '—'} sub={costoResumen} color={s.sobrecosto ? 'error.main' : undefined} />
              <Metric label="Gastado real" value={fmt(s.gastado)} color={s.sobrecosto ? 'error.main' : undefined} />
              <Metric label="Certificado" value={fmt(s.certificado)} />
              <Metric label="Margen esperado" value={s.margen_esperado != null ? signo(s.margen_esperado) : '—'} color={s.margen_esperado != null ? margenColor(s.margen_esperado) : undefined} />
              <Metric label="Margen realizado" value={signo(s.margen)} color={margenColor(s.margen)} sub="certificado − gastado" />
            </Stack>
            <Box sx={{ mt: 1.5 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">Avance físico</Typography>
                <Typography variant="caption">{s.avance_pct || 0}%{(s.cert_pct || 0) < (s.avance_pct || 0) ? ` · cert ${s.cert_pct || 0}%` : ''}</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={Math.min(s.avance_pct || 0, 100)} sx={{ height: 6, borderRadius: 3, mt: 0.5 }} />
            </Box>
          </Paper>

          <Divider textAlign="left"><Typography variant="caption" color="text.secondary">Acciones</Typography></Divider>

          <Seccion
            icon={<TimelineIcon fontSize="small" color="action" />}
            title="Avance físico"
            resumen={`${s.avance_pct || 0}% ejecutado`}
            actionLabel="Registrar"
            onAction={() => setEditor('avance')}
          />
          <Seccion
            icon={<AssignmentTurnedInIcon fontSize="small" color="action" />}
            title="Certificación"
            resumen={`${s.cert_pct || 0}% certificado · ${fmt(s.certificado)}`}
            actionLabel="Certificar"
            onAction={() => setEditor('certificar')}
          />
          <Seccion
            icon={<PaidIcon fontSize="small" color="action" />}
            title="Gastos imputados"
            resumen={`${fmt(s.gastado)} gastado`}
            actionLabel="Imputar"
            onAction={() => setEditor('imputar')}
          />
          <Seccion
            icon={<EngineeringIcon fontSize="small" color="action" />}
            title="Proveedor / contrato"
            resumen={cp ? `${cp.proveedor_nombre} · ${fmt(cp.monto)} · ${cp.modalidad === 'certificado' ? 'por certificado' : 'por avance'}` : 'Sin contrato asignado'}
            actionLabel={cp ? 'Editar' : 'Asignar'}
            onAction={() => setEditor('contrato')}
          />
          <Seccion
            icon={<PersonOutlineIcon fontSize="small" color="action" />}
            title="Responsable"
            resumen={resp ? resp.nombre : 'Sin asignar'}
            actionLabel={resp ? 'Editar' : 'Asignar'}
            onAction={() => setEditor('responsable')}
          />
          <Seccion
            icon={<EditIcon fontSize="small" color="action" />}
            title="Datos y costos"
            resumen={`estimado ${s.costo_estimado != null ? fmt(s.costo_estimado) : '—'} · directo ${s.costo_directo != null ? fmt(s.costo_directo) : '—'}`}
            actionLabel="Editar"
            onAction={() => setEditor('editar')}
          />
          <Seccion
            icon={<DeleteOutlineIcon fontSize="small" color="error" />}
            title="Eliminar tarea"
            resumen={(s.cert_pct || 0) > 0 ? 'Tiene avance certificado' : 'Queda en el historial'}
            actionLabel="Eliminar"
            onAction={() => setEditor('eliminar')}
            danger
          />
        </Stack>
      </FormDrawer>

      {editor === 'avance' && (
        <RegistrarAvanceDialog obra={obra} subrubro={s} empresaId={empresaId} onClose={cerrarEditor} onDone={onDone} />
      )}
      {editor === 'certificar' && (
        <NuevoCertificadoDialog open obra={obra} empresaId={empresaId} subrubroUid={s.uid} onClose={cerrarEditor} onCreated={onDone} />
      )}
      {editor === 'imputar' && (
        <ImputarGastoDialog open obra={obra} empresaId={empresaId} subrubroUid={s.uid} onClose={cerrarEditor} onDone={onDone} />
      )}
      {editor === 'contrato' && (
        <ContratoProveedorDrawer obra={obra} subrubro={s} empresaId={empresaId} onClose={cerrarEditor} onDone={onDone} />
      )}
      {editor === 'responsable' && (
        <ResponsableDrawer obra={obra} subrubro={s} empresaId={empresaId} onClose={cerrarEditor} onDone={onDone} />
      )}
      {editor === 'editar' && (
        <EditarTareaDrawer obra={obra} subrubro={s} empresaId={empresaId} onClose={cerrarEditor} onDone={onDone} />
      )}
      {editor === 'eliminar' && (
        <EliminarSubrubroDialog obra={obra} subrubro={s} empresaId={empresaId} onClose={cerrarEditor} onDone={() => { onDone(); onClose(); }} />
      )}
    </>
  );
}
