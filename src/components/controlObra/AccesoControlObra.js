import { Box, Alert } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';

// Devuelve true si el usuario puede acceder a Control de Obra.
// Acceso explícito por la acción VER_CONTROL_OBRA (admin global siempre pasa).
export function puedeVerControlObra(user) {
  if (!user) return false;
  if (user.admin) return true;
  const acciones = user?.empresaData?.acciones || user?.empresa?.acciones || [];
  const ocultos = user?.permisosOcultos || [];
  return acciones.includes('VER_CONTROL_OBRA') && !ocultos.includes('VER_CONTROL_OBRA');
}

// Pantalla de "sin permiso" consistente con el resto del producto.
export default function SinPermisoControlObra() {
  return (
    <DashboardLayout title="Control de Obra">
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8, px: 2 }}>
        <Alert severity="warning">
          No tenés permiso para acceder a Control de Obra. Pedile a un administrador que habilite la acción <strong>VER_CONTROL_OBRA</strong> en la configuración de la empresa.
        </Alert>
      </Box>
    </DashboardLayout>
  );
}
