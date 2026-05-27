import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FormControl, MenuItem, Select, InputLabel } from '@mui/material';
import { useAuthContext } from 'src/contexts/auth-context';
import { useSucursalContext } from 'src/contexts/sucursal-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import sucursalService from 'src/services/sucursalService';

/**
 * Selector global de sucursal en el top-nav. Se renderiza SOLO cuando
 * `empresa.vertical === 'corralon'`.
 *
 * Persiste la selección en el SucursalContext (que la guarda en localStorage).
 */
export const SucursalSelector = () => {
  const { user } = useAuthContext();
  const { sucursalId, setSucursalId } = useSucursalContext();
  const [empresa, setEmpresa] = useState(null);
  const [sucursales, setSucursales] = useState([]);

  useEffect(() => {
    let cancel = false;
    getEmpresaDetailsFromUser(user).then((emp) => {
      if (!cancel) setEmpresa(emp);
    });
    return () => {
      cancel = true;
    };
  }, [user]);

  useEffect(() => {
    if (empresa?.vertical !== 'corralon' || !empresa?.id) return;
    let cancel = false;
    sucursalService
      .getByEmpresa(empresa.id)
      .then((data) => {
        if (cancel) return;
        const list = data || [];
        setSucursales(list);
        // Si no hay ninguna sucursal seleccionada y hay sucursales, no
        // forzamos: dejamos "Todas" como default.
      })
      .catch(() => {
        if (!cancel) setSucursales([]);
      });
    return () => {
      cancel = true;
    };
  }, [empresa?.id, empresa?.vertical]);

  if (empresa?.vertical !== 'corralon') return null;
  if (!sucursales.length) return null;

  return (
    <FormControl size="small" sx={{ minWidth: 160 }}>
      <InputLabel>Sucursal</InputLabel>
      <Select
        value={sucursalId || ''}
        label="Sucursal"
        onChange={(e) => setSucursalId(e.target.value || null)}
      >
        <MenuItem value="">Todas las sucursales</MenuItem>
        {sucursales.map((s) => (
          <MenuItem key={s._id || s.id} value={s._id || s.id}>
            {s.nombre}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

SucursalSelector.propTypes = {};

export default SucursalSelector;
