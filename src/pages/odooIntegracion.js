import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { Box, Container, Stack, Typography, Tab, Tabs, TextField, Button, ListItem, ListItemText , Divider, List, Chip, Select, FormControl, InputLabel, MenuItem} from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useRouter } from 'next/router';
import OdooService from 'src/services/odooService';
import { invalidateEmpresaCache } from 'src/services/empresaService';

const OdooIntegrationPage = () => {
  const router = useRouter();
  const { empresaId } = router.query;

  const [currentTab, setCurrentTab] = useState('configuracion');
  const [config, setConfig] = useState({
    odooUrl: '',
    db: '',
    username: '',
    password: '',
    userId: null,
    lastAuthenticated: ''
  });
  const [datosImportados, setDatosImportados] = useState({
    productos: [],
    proveedores: [],
    taxes: [],
    diarios: [], 
    tipos_documento: [], 
    cuentas: [], 
  });
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // ✅ Estado para activar/desactivar y gestionar alias
  const [activaciones, setActivaciones] = useState({});
  const [alias, setAlias] = useState({});
  const [tipoSeleccionado, setTipoSeleccionado] = useState('productos'); // "productos", "proveedores" o "impuestos"
  const [paginaActual, setPaginaActual] = useState(0);
  const elementosPorPagina = 30;
  const totalPaginas = Math.ceil(datosImportados[tipoSeleccionado]?.length / elementosPorPagina);
  const [mostrarOpciones, setMostrarOpciones] = useState(false);
  const [filtroActivo, setFiltroActivo] = useState('todos'); // 'todos' | 'activos' | 'inactivos'

  const [nombresPersonalizados, setNombresPersonalizados] = useState({});
  const [nombresOriginales, setNombresOriginales] = useState({});


  const handlePaginaSiguiente = () => {
    setPaginaActual(prev => (prev < totalPaginas - 1 ? prev + 1 : prev));
  };
  
  const handlePaginaAnterior = () => {
    setPaginaActual(prev => (prev > 0 ? prev - 1 : prev));
  };
 
  const toggleActivacionGlobal = async (tipo, activar) => {
    try {
      // Obtener los IDs de los elementos en la página actual
      const idsEnPagina = itemsFiltrados.map((item) => item.id);
  
      // Optimismo: Cambia en el frontend antes de la respuesta del backend
      setActivaciones((prev) => ({
        ...prev,
        [tipo]: {
          ...prev[tipo],
          ...Object.fromEntries(idsEnPagina.map((id) => [id, activar])),
        },
      }));
  
      // Llamar al backend
      await Promise.all(
        idsEnPagina.map((id) => OdooService.setActive(empresaId, tipo, id, activar))
      );

      // Invalidar caché de la empresa
      await invalidateEmpresaCache(empresaId);
  
    } catch (error) {
      console.error('Error al cambiar el estado global:', error);
      alert('Error al cambiar el estado global.');
    }
  };

  const toggleActivacionTodasLasPaginas = async (tipo, activar) => {
    try {
      // Obtener todos los elementos del tipo seleccionado
      const ids = datosImportados[tipo].map((item) => item.id);
  
      // Optimismo: Actualizar frontend antes de la respuesta del backend
      setActivaciones((prev) => ({
        ...prev,
        [tipo]: Object.fromEntries(ids.map((id) => [id, activar])),
      }));
  
      // Llamar al backend para actualizar todos
      await Promise.all(ids.map((id) => OdooService.setActive(empresaId, tipo, id, activar)));

      // Invalidar caché de la empresa
      await invalidateEmpresaCache(empresaId);
  
    } catch (error) {
      console.error('Error al cambiar el estado de todos los elementos:', error);
      alert('Error al cambiar el estado de todos los elementos.');
    }
  };
  
  

  const toggleActivacion = async (tipo, id) => {
    const nuevoEstado = !activaciones[tipo][id];
  
    // Optimismo: Cambia en el frontend antes de la respuesta del backend
    setActivaciones((prev) => ({
      ...prev,
      [tipo]: { ...prev[tipo], [id]: nuevoEstado },
    }));
  
    // Llamar al backend
    try {
      await OdooService.setActive(empresaId, tipo, id, nuevoEstado);
      // Invalidar caché de la empresa
      await invalidateEmpresaCache(empresaId);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert('Error al cambiar el estado.');
    }
  };
  

  const handleAliasChange = (tipo, id, valor) => {
    setAlias(prev => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        [id]: valor
      }
    }));
  };

  const handleAddAlias = async (tipo, id, event) => {
    if (event.key === 'Enter' && event.target.value.trim() !== '') {
      const nuevoAlias = event.target.value.trim();
      const nuevosAlias = [...(alias[tipo]?.[id] || []), nuevoAlias];
  
      // Optimismo: Cambia en el frontend antes de la respuesta del backend
      setAlias((prev) => ({
        ...prev,
        [tipo]: { ...prev[tipo], [id]: nuevosAlias },
      }));
  
      event.target.value = ''; // Limpiar input
  
      // Llamar al backend
      try {
        await OdooService.agregarAlias(empresaId, tipo, id, nuevoAlias);
        // Invalidar caché de la empresa
        await invalidateEmpresaCache(empresaId);
      } catch (error) {
        console.error('Error al agregar alias:', error);
        alert('Error al agregar el alias.');
      }
    }
  };
  
  const handleRemoveAlias = async (tipo, id, aliasToRemove) => {
    const nuevosAlias = alias[tipo][id].filter((alias) => alias !== aliasToRemove);
  
    // Optimismo: Cambia en el frontend antes de la respuesta del backend
    setAlias((prev) => ({
      ...prev,
      [tipo]: { ...prev[tipo], [id]: nuevosAlias },
    }));
  
    // Llamar al backend
    try {
      await OdooService.eliminarAlias(empresaId, tipo, id, aliasToRemove);
      // Invalidar caché de la empresa
      await invalidateEmpresaCache(empresaId);
    } catch (error) {
      console.error('Error al eliminar alias:', error);
      alert('Error al eliminar el alias.');
    }
  };
  
  
  
  
  /**
   * Maneja el cambio en la contraseña solo si se está editando.
   */
  const handlePasswordChange = (event) => {
    setNewPassword(event.target.value);
  };
  
  /**
   * Alterna el estado de edición de la contraseña.
   */
  const toggleEditPassword = () => {
    setIsEditingPassword(!isEditingPassword);
    if (!isEditingPassword) {
      setNewPassword('');
    }
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  
  /**
   * Modifica la lógica para enviar solo la contraseña si se editó.
   */
  const handleSincronizar = async () => {
    setIsLoading(true);
    try {
      const payload = {
        ...config,
        password: isEditingPassword && newPassword ? newPassword : config.password,
      };
  
      const success = await OdooService.configurarEImportar(empresaId, payload);
      if (success) {
        // Invalidar caché de la empresa
        await invalidateEmpresaCache(empresaId);
        alert('Configuración guardada e importación iniciada correctamente');
        setIsEditingPassword(false);
      } else {
        alert('Error en la configuración o importación');
      }
    } catch (error) {
      console.error('Error en la integración con Odoo:', error);
      alert('Error inesperado en la integración');
    }
    setIsLoading(false);
  };
  const tabs = [
    { value: 'configuracion', label: 'Configuración Odoo' },
    { value: 'datos', label: 'Datos Importados' },
  ];

  const fetchConfig = async () => {
    try {
      const configData = await OdooService.obtenerConfiguracion(empresaId);
      if (configData) {
        setConfig({
          odooUrl: configData.odoo_url || '',
          db: configData.odoo_db || '',
          username: configData.odoo_username || '',
          password: configData.odoo_token || '',
          userId: configData.odoo_userId || null,
          lastAuthenticated: configData.last_authenticated
            ? new Date(configData.last_authenticated._seconds * 1000).toLocaleString()
            : 'No autenticado'
        });
      }
    } catch (error) {
      console.error('Error obteniendo configuración de Odoo:', error);
    }
  };


  useEffect(() => {
    
    fetchConfig();
  }, [empresaId]);

  useEffect(() => {
    if (currentTab === 'datos') {
      fetchDatosImportados();
    }
  }, [currentTab]);

  const fetchDatosImportados = async () => {
    setIsLoading(true);
    try {
      const datos = await OdooService.obtenerDatosCompletos(empresaId);
      
      // Extraer activaciones y alias del backend
      const nuevasActivaciones = {};
      const nuevosAlias = {};
  
      ['productos', 'proveedores', 'taxes', 'diarios', 'cuentas', 'tipos_documento'].forEach((tipo) => {
        nuevasActivaciones[tipo] = {};
        nuevosAlias[tipo] = {};
      
        datos[tipo]?.forEach((item) => {
          nuevasActivaciones[tipo][item.id] = item.activo || false;
          nuevosAlias[tipo][item.id] = item.aliases || [];
        });
      
        if (tipo === 'diarios') {
          const nombres = {};
          const originales = {};
          datos[tipo].forEach((item) => {
            nombres[item.id] = item.nombrePersonalizado || '';
            originales[item.id] = item.nombrePersonalizado || '';
          });
          setNombresPersonalizados(nombres);
          setNombresOriginales(originales);
        }
      });
      
  
      setDatosImportados(datos);
      setActivaciones(nuevasActivaciones);
      setAlias(nuevosAlias);
    } catch (error) {
      console.error('Error obteniendo datos importados:', error);
      alert('Error al obtener los datos importados');
    }
    setIsLoading(false);
  };

  const handleTabsChange = (event, value) => {
    setCurrentTab(value);
  };

  const handleChange = (event) => {
    setConfig({
      ...config,
      [event.target.name]: event.target.value,
    });
  };

  const handleVerConfiguracion = async () => {
    await fetchConfig()
    alert(
      `Configuración actual:\n\n` +
      `🔗 URL: ${config.odooUrl}\n` +
      `📂 Base de Datos: ${config.db}\n` +
      `👤 Usuario: ${config.username}\n` +
      `🆔 User ID: ${config.userId || 'No disponible'}\n` +
      `📅 Última Autenticación: ${config.lastAuthenticated}`
    );
  };

  const handleEliminarIntegracion = async () => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar la integración con Odoo? Esta acción no se puede deshacer.")) {
      return;
    }
  
    setIsLoading(true);
    try {
      const success = await OdooService.eliminarIntegracion(empresaId);
      if (success) {
        // Invalidar caché de la empresa
        await invalidateEmpresaCache(empresaId);
        alert("Integración eliminada con éxito.");
        setConfig({
          odooUrl: '',
          db: '',
          username: '',
          password: '********',
          userId: null,
          lastAuthenticated: ''
        });
      } else {
        alert("Error al eliminar la integración.");
      }
    } catch (error) {
      console.error("Error al eliminar la integración con Odoo:", error);
      alert("Error inesperado al eliminar la integración.");
    }
    setIsLoading(false);
  };
  

  // ✅ `useMemo` para calcular los elementos filtrados y paginados
  const itemsFiltrados = useMemo(() => {
    return datosImportados[tipoSeleccionado]
      .filter((item) => {
        const estaActivo = activaciones[tipoSeleccionado]?.[item.id] ?? false;
        return (
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          (filtroActivo === 'todos' || 
          (filtroActivo === 'activos' && estaActivo) || 
          (filtroActivo === 'inactivos' && !estaActivo))
        );
      })
      .slice(paginaActual * elementosPorPagina, (paginaActual + 1) * elementosPorPagina);
  }, [datosImportados, tipoSeleccionado, searchTerm, paginaActual, filtroActivo, activaciones]);
  
  

const renderList = (items, tipo, title, fields) => (
  <>
    <Typography variant="h6" sx={{ mt: 2 }}>{title}</Typography>
    <List>
      {items.map((item) => (
        <React.Fragment key={item.id}>
          <ListItem>
            <ListItemText
              primary={`${item.id} - ${item.name}`}
              secondary={fields.map((field) => `${field.label}: ${item[field.key]}`).join(' | ')}
            />
            <Button
              variant="contained"
              color={activaciones[tipo]?.[item.id] ? "success" : "error"}
              onClick={() => toggleActivacion(tipo, item.id)}
            >
              {activaciones[tipo]?.[item.id] ? "Activo" : "Inactivo"}
            </Button>
            {tipo === 'diarios' && (
  <Box sx={{ ml: 2, display: 'flex', gap: 1 }}>
    <TextField
      size="small"
      label="Nombre personalizado"
      value={nombresPersonalizados[item.id] || ''}
      onChange={(e) =>
        setNombresPersonalizados((prev) => ({
          ...prev,
          [item.id]: e.target.value,
        }))
      }
    />
    {nombresPersonalizados[item.id]?.trim() !== nombresOriginales[item.id]?.trim() && (
      <Button
        variant="outlined"
        size="small"
        onClick={async () => {
          try {
            const nuevoNombre = nombresPersonalizados[item.id]?.trim();
            await OdooService.editarNombreDiario(empresaId, item.id, nuevoNombre);
            // Invalidar caché de la empresa
            await invalidateEmpresaCache(empresaId);
            setNombresOriginales((prev) => ({
              ...prev,
              [item.id]: nuevoNombre,
            }));
            console.log('Nombre guardado');
          } catch (err) {
            console.error('Error al guardar nombre personalizado:', err);
            alert('Error al guardar el nombre personalizado');
          }
        }}
      >
        Guardar
      </Button>
    )}
  </Box>
)}

            {tipo !== 'diarios' && tipo !== 'cuentas' && tipo !== 'tipos_documento' && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              {(alias[tipo]?.[item.id] || []).map((aliasItem) => (
                <Chip
                  key={aliasItem}
                  label={aliasItem}
                  onDelete={() => handleRemoveAlias(tipo, item.id, aliasItem)}
                  color="primary"
                />
              ))}
              <TextField
                label="Agregar alias"
                variant="outlined"
                size="small"
                sx={{ width: 150 }}
                onKeyDown={(e) => handleAddAlias(tipo, item.id, e)}
              />
            </Box>)}
          </ListItem>
          <Divider />
        </React.Fragment>
      ))}
    </List>
  </>
);


return (
    <>
      <Head>
        <title>Integración con Odoo</title>
      </Head>
      <Box
        component="main"
        sx={{ flexGrow: 1, py: 8 }}
      >
        <Container maxWidth="lg">
          <Stack spacing={3}>
            <Typography variant="h4">Integración con Odoo</Typography>
            <Tabs
              value={currentTab}
              onChange={handleTabsChange}
              textColor="primary"
              indicatorColor="primary"
            >
              {tabs.map((tab) => (
                <Tab key={tab.value} label={tab.label} value={tab.value} />
              ))}
            </Tabs>

            {currentTab === 'configuracion' && (
              <Stack spacing={2}>
              { 
                isEditingPassword && (
                  <>
                    <TextField
                    label="URL de Odoo"
                    name="odooUrl"
                    value={config.odooUrl}
                    onChange={handleChange}
                    fullWidth
                  />
                  <TextField
                    label="Base de Datos"
                    name="db"
                    value={config.db}
                    onChange={handleChange}
                    fullWidth
                  />
                  <TextField
                    label="Usuario"
                    name="username"
                    value={config.username}
                    onChange={handleChange}
                    fullWidth
                  />
                  <TextField
                      label="Contraseña / API Key"
                      name="password"
                      type="password"
                      value={isEditingPassword ? newPassword : '********'}
                      onChange={handlePasswordChange}
                      fullWidth
                      disabled={!isEditingPassword}
                      />
                </>
                )
              }
              <Button
                color="secondary"
                variant="outlined"
                onClick={toggleEditPassword}
                >
                {isEditingPassword ? 'Cancelar' : 'Editar configuración'}
                </Button>

                <Stack direction="row" spacing={2}>
                  <Button color="primary" variant="contained" onClick={handleSincronizar} disabled={isLoading}>
                      Sincronizar datos
                  </Button>
                  <Button color="secondary" variant="outlined" onClick={handleVerConfiguracion} disabled={isLoading}>
                      Ver Configuración
                  </Button>
                  <Button color="error" variant="outlined" onClick={handleEliminarIntegracion} disabled={isLoading}>
                      Eliminar Integración
                  </Button>
                </Stack>
              </Stack>
            )}

{currentTab === 'datos' && (
              <Box>
                <Typography variant="h6">Datos Importados</Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <TextField
                    label="Buscar"
                    variant="outlined"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    sx={{ flex: 1 }} // Hace que el campo de búsqueda ocupe más espacio
                  />
                  <FormControl sx={{ minWidth: 180 }}>
                    <InputLabel>Filtrar por estado</InputLabel>
                    <Select
                      value={filtroActivo}
                      onChange={(e) => setFiltroActivo(e.target.value)}
                    >
                      <MenuItem value="todos">Todos</MenuItem>
                      <MenuItem value="activos">Activos</MenuItem>
                      <MenuItem value="inactivos">Inactivos</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>

                {isLoading ? (
                  <Typography>Cargando datos...</Typography>
                ) : (
                  <>
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant={tipoSeleccionado === 'productos' ? "contained" : "outlined"}
                      onClick={() => setTipoSeleccionado('productos')}
                    >
                      Productos
                    </Button>
                    <Button
                      variant={tipoSeleccionado === 'proveedores' ? "contained" : "outlined"}
                      onClick={() => setTipoSeleccionado('proveedores')}
                    >
                      Proveedores
                    </Button>
                    <Button
                      variant={tipoSeleccionado === 'taxes' ? "contained" : "outlined"}
                      onClick={() => setTipoSeleccionado('taxes')}
                    >
                      Impuestos
                    </Button>
                    <Button
                      variant={tipoSeleccionado === 'diarios' ? "contained" : "outlined"}
                      onClick={() => setTipoSeleccionado('diarios')}
                    >
                      Diarios de Compra
                    </Button>
                    <Button
                      variant={tipoSeleccionado === 'cuentas' ? "contained" : "outlined"}
                      onClick={() => setTipoSeleccionado('cuentas')}
                    >
                      Cuentas Analíticas
                    </Button>
                    <Button
                      variant={tipoSeleccionado === 'tipos_documento' ? "contained" : "outlined"}
                      onClick={() => setTipoSeleccionado('tipos_documento')}
                    >
                      Tipos de documento
                    </Button>

                    {/* Botón para mostrar/ocultar el menú */}
      <Button
        variant="contained"
        color="primary"
        sx={{ mt: 2 }}
        onClick={() => setMostrarOpciones(!mostrarOpciones)}
      >
        {mostrarOpciones ? "Ocultar Opciones de Activación" : "Mostrar Opciones de Activación"}
      </Button>

                  </Stack>
                  {/* Menú oculto de activación/desactivación */}
      {mostrarOpciones && (
        <Box sx={{ mt: 2, p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
          <Stack direction="row" spacing={2} justifyContent="left">
            <Button
              onClick={() => toggleActivacionGlobal(tipoSeleccionado, true)}
            >
              Activar toda la página
            </Button>
            <Button
              onClick={() => toggleActivacionGlobal(tipoSeleccionado, false)}
            >
              Desactivar toda la página
            </Button>
            <Button
              onClick={() => toggleActivacionTodasLasPaginas(tipoSeleccionado, true)}
            >
              Activar TODAS las páginas
            </Button>
            <Button
              onClick={() => toggleActivacionTodasLasPaginas(tipoSeleccionado, false)}
            >
              Desactivar TODAS las páginas
            </Button>
          </Stack>
        </Box>
      )}
                  {renderList(
                    itemsFiltrados, 
                    tipoSeleccionado, 
                    tipoSeleccionado.charAt(0).toUpperCase() + tipoSeleccionado.slice(1), 
                    tipoSeleccionado === 'productos' 
                      ? [{ key: 'list_price', label: 'Precio' }, { key: 'company_id', label: 'Id Empresa' }] 
                      : tipoSeleccionado === 'taxes' 
                      ? [{ key: 'amount', label: 'Monto' }, { key: 'company_id', label: 'Id Empresa' }] 
                      : tipoSeleccionado === 'cuentas' 
                      ? [{ key: 'code', label: 'Código' }, { key: 'company_id', label: 'Id Empresa' }]
                      : tipoSeleccionado === 'proveedores' 
                      ? [{ key: 'id', label: 'Id' }, { key: 'company_id', label: 'Id Empresa' }, { key: 'vat', label: 'Cuit' }]: []
                  )}



                  <Stack direction="row" spacing={2} justifyContent="center">
                    <Button variant="outlined" onClick={handlePaginaAnterior} disabled={paginaActual === 0}>
                      Anterior
                    </Button>
                    <Typography>{`Página ${paginaActual + 1} de ${totalPaginas}`}</Typography>
                    <Button variant="outlined" onClick={handlePaginaSiguiente} disabled={paginaActual >= totalPaginas - 1}>
                      Siguiente
                    </Button>
                  </Stack>

                  </>
                )}
              </Box>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
};

OdooIntegrationPage.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default OdooIntegrationPage;
