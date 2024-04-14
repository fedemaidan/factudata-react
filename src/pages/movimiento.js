// pages/movement-data-entry.js
import Head from 'next/head';
import { Box, Container, TextField, Typography, Button, CircularProgress, Tab, Tabs, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import movimientosService from 'src/services/movimientosService';
import {getEmpresaDetailsFromUser} from 'src/services/empresaService';
import { useAuthContext } from 'src/contexts/auth-context';



const formatTimestamp = (timestamp) => {
    if (!timestamp) {
      return '';
    }
  
    const date = new Date(timestamp.seconds * 1000); // Convert seconds to milliseconds
    const year = date.getFullYear();
    const month = `0${date.getMonth() + 1}`.slice(-2); // getMonth() devuelve un índice basado en cero, así que se agrega 1
    const day = `0${date.getDate()}`.slice(-2);
  
    return `${year}-${month}-${day}`; // Formato YYYY-MM-DD
  };

const MovementDataEntryPage = () => {
  const { user } = useAuthContext();
  const router = useRouter();
  const { movimientoId } = router.query;
  const [movimiento, setMovimiento] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState('');

  const tabs = [
    { value: 'datos', label: 'Datos' },
    { value: 'comprobante', label: 'Comprobante' },
  ];
  const formik = useFormik({
    initialValues: {
      categoria: '',
      fecha_factura: '',
      moneda: '',
      nombre_proveedor: '',
      observacion: '',
      proyecto: '',
      categoria: '',
      subcategoria: '',
      total: '',
      type: '',
      url_imagen: null,
      user_phone: '',
    },
    validationSchema: Yup.object({
      // Validaciones de cada campo
    }),
    onSubmit: (values) => {
      setIsLoading(true);
      // Aquí agregarías el código para enviar los datos al servidor.
      console.log(values);
      setIsLoading(false);
    },
  });

  const handleTabsChange = (event, value) => {
    setCurrentTab(value);
  };


  useEffect(() => {
    if (movimientoId) {
      setIsLoading(true);
      async function fetchMovimientoData() {
        const empresa = await getEmpresaDetailsFromUser(user)
        setEmpresa(empresa)
        const cates = empresa.categorias.map( (cate) => {
          return cate.name
        } )
        setCategorias(cates)
        // Aquí deberías obtener los datos del movimiento usando movimientoId
        const data = await movimientosService.getMovimientoById(movimientoId);
        setMovimiento(data);
        formik.setValues(data);
        setIsLoading(false);
        setCurrentTab('datos')

      }
      
      fetchMovimientoData();
    }
  }, [movimientoId]);

  if (isLoading) {
    return <CircularProgress />;
  }

  if (!movimiento) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Detalle del Movimiento</title>
      </Head>
      <Container maxWidth="lg">
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            py: 8
          }}
        >
          <Typography variant="h4" sx={{ mb: 3 }}>
            Detalle del Movimiento
          </Typography>
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

          <form onSubmit={formik.handleSubmit}>
          {currentTab === 'comprobante' && 
          <>
          <input
              accept="image/*"
              type="file"
              onChange={(event) => {
                formik.setFieldValue("url_imagen", event.currentTarget.files[0]);
              }}/>

            <img src={formik.values.url_imagen} alt="Imagen del movimiento" />
            </>
              } 
             {currentTab === 'datos' && 
             <>
                <TextField
                fullWidth
                label="Nombre del Proveedor"
                name="nombre_proveedor"
                value={formik.values.nombre_proveedor}
                onChange={formik.handleChange}
                error={formik.touched.nombre_proveedor && Boolean(formik.errors.nombre_proveedor)}
                helperText={formik.touched.nombre_proveedor && formik.errors.nombre_proveedor}
                margin="normal"
                />
                
<TextField
  fullWidth
  label="Fecha de la Factura"
  name="fecha_factura"
  type="date"
  value={new Date(formatTimestamp(formik.values.fecha_factura))}
  onChange={formik.handleChange}
  error={formik.touched.fecha_factura && Boolean(formik.errors.fecha_factura)}
  helperText={formik.touched.fecha_factura && formik.errors.fecha_factura}
  margin="normal"
/>

<TextField
  fullWidth
  label="Moneda"
  name="moneda"
  value={formik.values.moneda}
  onChange={formik.handleChange}
  error={formik.touched.moneda && Boolean(formik.errors.moneda)}
  helperText={formik.touched.moneda && formik.errors.moneda}
  margin="normal"
/>

<TextField
  fullWidth
  label="Observación"
  name="observacion"
  value={formik.values.observacion}
  onChange={formik.handleChange}
  error={formik.touched.observacion && Boolean(formik.errors.observacion)}
  helperText={formik.touched.observacion && formik.errors.observacion}
  margin="normal"
/>

<TextField
  fullWidth
  label="Proyecto"
  name="proyecto"
  value={formik.values.proyecto}
  onChange={formik.handleChange}
  error={formik.touched.proyecto && Boolean(formik.errors.proyecto)}
  helperText={formik.touched.proyecto && formik.errors.proyecto}
  margin="normal"
/>

{/* <TextField
  fullWidth
  label="Categoría"
  name="categoria"
  value={formik.values.categoria}
  onChange={formik.handleChange}
  error={formik.touched.categoria && Boolean(formik.errors.categoria)}
  helperText={formik.touched.categoria && formik.errors.categoria}
  margin="normal"
/> */}

<FormControl fullWidth margin="normal">
            <InputLabel id={`label-categorias`}>Categorías</InputLabel>
            <Select
              labelId={`label-categorias`}
              id="categoria"
              name="categoria"
              label="Categoría"
              value={formik.values.categoria}
              onChange={formik.handleChange}
            >
              {categorias.map((element, index) => (
                <MenuItem key={index} value={element}>
                  {element}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

<TextField
  fullWidth
  label="Subcategoría"
  name="subcategoria"
  value={formik.values.subcategoria}
  onChange={formik.handleChange}
  error={formik.touched.subcategoria && Boolean(formik.errors.subcategoria)}
  helperText={formik.touched.subcategoria && formik.errors.subcategoria}
  margin="normal"
/>

<TextField
  fullWidth
  label="Total"
  name="total"
  type="number"
  value={formik.values.total}
  onChange={formik.handleChange}
  error={formik.touched.total && Boolean(formik.errors.total)}
  helperText={formik.touched.total && formik.errors.total}
  margin="normal"
/>

<TextField
  fullWidth
  label="Tipo"
  name="type"
  value={formik.values.type}
  onChange={formik.handleChange}
  error={formik.touched.type && Boolean(formik.errors.type)}
  helperText={formik.touched.type && formik.errors.type}
  margin="normal"
/>

<TextField
  fullWidth
  label="Teléfono del Usuario"
  name="user_phone"
  value={formik.values.user_phone}
  onChange={formik.handleChange}
  error={formik.touched.user_phone && Boolean(formik.errors.user_phone)}
  helperText={formik.touched.user_phone && formik.errors.user_phone}
  margin="normal"
/>

            
            </>
            }

            <Box sx={{ py: 2 }}>
              <Button color="primary" variant="contained" type="submit">
                Guardar cambios
              </Button>
            </Box>
          </form>
        </Box>
      </Container>
    </>
  );
};

MovementDataEntryPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default MovementDataEntryPage;
