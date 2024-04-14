import { Table, TableBody, TableCell, TableHead, TableRow, Checkbox, Link, Chip } from '@mui/material';
import Button from '@mui/material/Button';


export const VendedoresFacturasTable = ({ items, selected, onSelectOne, onApproveOne }) => {

    const getStatusChip = (status) => {
        const statusColors = {
          Aprobado: 'success',
          Cancelado: 'error',
          Pendiente: 'warning',
        };
      
        return (
          <Chip
            label={status}
            color={statusColors[status]}
            size="small"
          />
        );
      };
    
    const getFacturaAChip = (facturaA) => {
        return facturaA ? (
          <Chip label="Sí" color="success" size="small" />
        ) : (
          <Chip label="No" color="error" size="small" />
        );
      };

      const getAction = (id,estado) => {
        // Si el estado es 'Pendiente', retorna botones para 'Aprobar' o 'Rechazar'
        if (estado === 'Pendiente') {
          return (
            <>
              <Button variant="contained" color="success" onClick={() => {onApproveOne(id)}}>
                Aprobar
              </Button>
              <Button variant="contained" color="error" onClick={() => {/* lógica para rechazar */}}>
                Rechazar
              </Button>
            </>
          );
        }
        // Para otros estados, retorna un fragmento vacío para ocultar los botones
        return <></>;
      };
      
      

      
    const handleImageClick = () => {
        
    }
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Factura</TableCell>
          <TableCell>Usuario</TableCell>
          <TableCell>Fecha</TableCell>
          <TableCell>Razón social</TableCell>
          <TableCell>Total</TableCell>
          <TableCell>IVA</TableCell>
          <TableCell>Factura A</TableCell>
          <TableCell>Estado</TableCell>
          <TableCell>Accion</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id} selected={selected.includes(item.id)}>
            <TableCell>
                <Link to={item.filename} onClick={handleImageClick}>
                <img src={item.filename} alt="Factura" style={{ width: '100px', height: '150px' }} />
                </Link>
            </TableCell>
            <TableCell>{item.usuario}</TableCell>
            <TableCell>{item.fecha}</TableCell>
            <TableCell>{item.razonSocial}</TableCell>
            <TableCell>${item.total}</TableCell>
            <TableCell>${item.iva}</TableCell>
            <TableCell>{getFacturaAChip(item.facturaA)}</TableCell>
            <TableCell>{getStatusChip(item.estado)}</TableCell>
            <TableCell>{getAction(item.id, item.estado)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
