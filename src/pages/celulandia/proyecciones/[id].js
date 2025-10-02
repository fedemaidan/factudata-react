import { useRouter } from 'next/router';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import {
  Container,
  Typography,
  Box,
  Stack,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Chip,
} from '@mui/material';
import { FileDownload as FileDownloadIcon } from '@mui/icons-material';
import Head from 'next/head';
import DataTable from 'src/components/celulandia/DataTable';
import EliminarTagsModal from 'src/components/celulandia/EliminarTagsModal';
import proyeccionService from 'src/services/celulandia/proyeccionService';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

export default function ProyeccionDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [productosProyeccion, setProductosProyeccion] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paginaActual, setPaginaActual] = useState(1);
  const [total, setTotal] = useState(0);
  const [limitePorPagina] = useState(400);
  const [sortField, setSortField] = useState('codigo');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState([]);

  const [isTagOpen, setIsTagOpen] = useState(false);
  const [isTagSaving, setIsTagSaving] = useState(false);
  const [isTagLoading, setIsTagLoading] = useState(false);
  const [availableTags, setAvailableTags] = useState([]); // array de strings (nombres)
  const [selectedExistingTag, setSelectedExistingTag] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [tagError, setTagError] = useState('');
  const [tagFilter, setTagFilter] = useState('Todos');
  const [tagsDisponibles, setTagsDisponibles] = useState([]);

  // Estados para eliminar tags
  const [isRemoveTagOpen, setIsRemoveTagOpen] = useState(false);
  const [isRemoveTagSaving, setIsRemoveTagSaving] = useState(false);
  const [removeTagError, setRemoveTagError] = useState('');

  // Estados para exportar
  const [isExporting, setIsExporting] = useState(false);

  // Genera un color pastel determinístico basado en el texto del tag
  const getTagColor = (tag) => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    const s = 75 + (hash % 10);
    const l = 85 + (hash % 5);
    return `hsl(${h}, ${s}%, ${l}%)`;
  };

  useEffect(() => {
    if (!id) return;
    fetchData(paginaActual);
  }, [id, paginaActual, sortField, sortDirection, tagFilter]);

  const fetchData = async (pagina = 1) => {
    setIsLoading(true);
    try {
      const offset = (pagina - 1) * limitePorPagina;
      const proyeccionResponse = await proyeccionService.getProyeccionById(id, {
        limit: limitePorPagina,
        offset,
        sortField,
        sortDirection,
        tag: tagFilter,
      });

      const payload = proyeccionResponse?.data ? proyeccionResponse : { data: proyeccionResponse };
      setProductosProyeccion(payload.data || payload?.data?.data || []);
      setTotal(payload.total || payload?.data?.total || 0);
      const tagsSrv = payload.tagsDisponibles || payload?.data?.tagsDisponibles || [];
      setTagsDisponibles(['Todos', ...Array.from(new Set(tagsSrv)).sort()]);
      setPaginaActual(pagina);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSortChange = (campo) => {
    if (sortField === campo) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(campo);
      setSortDirection('asc');
    }
    setPaginaActual(1);
  };

  const handleVolver = useCallback(() => router.back(), [router]);

  const handleAgregarTag = async () => {
    try {
      setTagError('');
      const finalTag = (newTagName || selectedExistingTag || '').trim();
      if (!finalTag) {
        setTagError('Elegí un tag existente o crea uno nuevo');
        return;
      }
      setIsTagSaving(true);
      const ids = Array.from(selectedKeys);
      await proyeccionService.agregarTagsAProductos({
        productosProyeccionId: ids,
        tag: finalTag,
        persist: true,
      });
      setSelectedKeys(new Set());
      setIsTagOpen(false);
      await fetchData(paginaActual);
    } catch (e) {
      console.error(e);
      setTagError('Error al guardar el tag');
    } finally {
      setIsTagSaving(false);
    }
  };

  const handleEliminarTags = async () => {
    try {
      setRemoveTagError('');
      setIsRemoveTagSaving(true);
      const ids = Array.from(selectedKeys);
      await proyeccionService.eliminarTagsAProductos({
        productosProyeccionId: ids,
      });
      setSelectedKeys(new Set());
      setIsRemoveTagOpen(false);
      await fetchData(paginaActual);
    } catch (e) {
      console.error(e);
      setRemoveTagError('Error al eliminar los tags');
    } finally {
      setIsRemoveTagSaving(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      // Obtener todos los datos sin paginación
      const proyeccionResponse = await proyeccionService.getProyeccionById(id, {
        limit: 10000, // Un número grande para obtener todos los datos
        offset: 0,
        sortField,
        sortDirection,
        tag: tagFilter,
      });

      const payload = proyeccionResponse?.data ? proyeccionResponse : { data: proyeccionResponse };
      const allProductos = payload.data || payload?.data?.data || [];

      // Formatear datos para Excel
      const data = allProductos.map((item) => {
        // Formatear tags como string separado por comas
        const tagsValue = item?.tags;
        let tagsArray = [];
        if (Array.isArray(tagsValue)) tagsArray = tagsValue;
        else if (typeof tagsValue === 'string' && tagsValue.trim() !== '') tagsArray = [tagsValue];

        const tagsString = tagsArray.length > 0 ? tagsArray.join(', ') : '';

        // Formatear días para agotar
        const dias = Number(item?.diasSinStock ?? 0);
        const diasString = dias === 0 ? 'Agotado' : `${dias} días`;

        return {
          Código: item.codigo || '',
          Descripción: item.descripcion || '',
          Tags: tagsString,
          'Stock Actual': Number(item?.cantidad ?? 0),
          'Ventas Período': Number(item?.ventasPeriodo ?? 0),
          'Ventas 3M': Number(item?.ventasProyectadas ?? 0),
          'Días p/Agotar': diasString.split(' ')[0],
        };
      });

      const headers = Object.keys(data[0] || {});
      const ws = XLSX.utils.json_to_sheet(data, { header: headers });
      const wb = XLSX.utils.book_new();

      // Auto-fit de anchos por contenido (para que nada quede "cortado")
      const prettyNum = (v, dec = 2) =>
        typeof v === 'number'
          ? v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
          : String(v ?? '');

      const decimalsFor = (header) => (header === 'Tipo de cambio' ? 4 : 2); // más precisión para tipo de cambio

      const colWidths = headers.map((h) => {
        const maxLen = Math.max(
          String(h).length,
          ...data.map((row) => {
            const v = row[h];
            if (typeof v === 'number') return prettyNum(v, decimalsFor(h)).length;
            return String(v ?? '').length;
          })
        );
        // límites razonables: mínimo 10, máximo 40 'caracteres'
        return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
      });
      ws['!cols'] = colWidths;

      // Formatos numéricos (miles/decimales) por columna
      const currencyCols = new Set(['Stock Actual', 'Ventas Período', 'Ventas 3M']);
      const numberCols = new Set(['Días p/Agotar']);

      // Rango de la hoja para iterar celdas
      const range = XLSX.utils.decode_range(
        ws['!ref'] || `A1:${XLSX.utils.encode_col(headers.length - 1)}${data.length + 1}`
      );

      headers.forEach((h, colIdx) => {
        let numFmt = null;
        if (currencyCols.has(h)) numFmt = '#,##0';
        else if (numberCols.has(h)) numFmt = '#,##0';
        for (let r = 1; r <= data.length; r++) {
          const addr = XLSX.utils.encode_cell({ c: colIdx, r });
          const cell = ws[addr];
          if (cell && typeof cell.v === 'number') {
            cell.z = numFmt;
          }
        }
      });

      XLSX.utils.book_append_sheet(wb, ws, 'Proyección');

      const filename = `proyeccion_${dayjs().format('YYYY-MM-DD_HHmm')}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      alert('Error al exportar los datos');
    } finally {
      setIsExporting(false);
    }
  };

  const allVisibleKeys = useMemo(
    () => new Set(productosProyeccion.map((i) => i._id)),
    [productosProyeccion]
  );
  const allSelected = useMemo(
    () =>
      productosProyeccion.length > 0 && productosProyeccion.every((i) => selectedKeys.has(i._id)),
    [productosProyeccion, selectedKeys]
  );
  const someSelected = useMemo(
    () => productosProyeccion.some((i) => selectedKeys.has(i._id)) && !allSelected,
    [productosProyeccion, selectedKeys, allSelected]
  );

  const toggleSelectAll = () => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        productosProyeccion.forEach((i) => next.delete(i._id));
      } else {
        productosProyeccion.forEach((i) => next.add(i._id));
      }
      return next;
    });
  };

  const toggleRow = (id) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmDelete = async () => {
    if (!itemsToDelete || itemsToDelete.length === 0) {
      setIsConfirmOpen(false);
      return;
    }
    setIsDeleting(true);
    try {
      const ids = itemsToDelete.map((p) => p._id).filter(Boolean);
      const codigos = Array.from(new Set(itemsToDelete.map((p) => p.codigo).filter(Boolean)));
      await proyeccionService.eliminarProductosYAgregarIgnorar({ ids, codigos });
      setSelectedKeys(new Set());
      setItemsToDelete([]);
      setIsConfirmOpen(false);
      await fetchData(paginaActual);
    } catch (e) {
      console.error('Error eliminando/ignorando productos:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setItemsToDelete([]);
    setIsConfirmOpen(false);
  };

  const columns = useMemo(
    () => [
      {
        key: 'seleccionar',
        label: (
          <Checkbox indeterminate={someSelected} checked={allSelected} onChange={toggleSelectAll} />
        ),
        sortable: false,
        render: (item) => (
          <Checkbox checked={selectedKeys.has(item._id)} onChange={() => toggleRow(item._id)} />
        ),
        onRowClick: (item) => toggleRow(item._id),
      },
      {
        key: 'codigo',
        label: 'Código',
        sortable: true,
      },
      {
        key: 'descripcion',
        label: 'Descripción',
        sortable: true,
      },
      {
        key: 'tags',
        label: 'Tags',
        sortable: false,
        render: (item) => {
          const tagsValue = item?.tags;
          let tagsArray = [];
          if (Array.isArray(tagsValue)) tagsArray = tagsValue;
          else if (typeof tagsValue === 'string' && tagsValue.trim() !== '')
            tagsArray = [tagsValue];

          if (!tagsArray || tagsArray.length === 0) return '-';
          return (
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
              {tagsArray.map((t, idx) => (
                <Chip
                  key={`${item._id}-tag-${idx}`}
                  label={t}
                  size="small"
                  sx={{
                    backgroundColor: getTagColor(t),
                    color: 'text.primary',
                    fontWeight: 500,
                    '& .MuiChip-label': { px: 1 },
                  }}
                />
              ))}
            </Stack>
          );
        },
      },
      {
        key: 'cantidad',
        label: 'Stock Actual',
        sortable: true,
        render: (item) => {
          const cantidad = Number(item?.cantidad ?? 0);
          const color = cantidad < 0 ? 'error' : cantidad < 100 ? 'warning' : 'success';
          return (
            <Typography
              variant="body2"
              sx={{
                color: `${color}.main`,
                fontWeight: cantidad < 0 ? 'bold' : 'normal',
              }}
            >
              {cantidad.toLocaleString()}
            </Typography>
          );
        },
      },
      {
        key: 'ventasPeriodo',
        label: 'Ventas Período',
        sortable: true,
        render: (item) => Number(item?.ventasPeriodo ?? 0).toLocaleString(),
      },
      {
        key: 'ventasProyectadas',
        label: 'Ventas 3M',
        sortable: true,
        render: (item) => Number(item?.ventasProyectadas ?? 0).toLocaleString(),
      },
      {
        key: 'diasSinStock',
        label: 'Días p/Agotar',
        sortable: true,
        render: (item) => {
          const dias = Number(item?.diasSinStock ?? 0);
          let color = 'success';
          if (dias === 0) color = 'error';
          else if (dias < 30) color = 'warning';

          return (
            <Typography
              variant="body2"
              sx={{
                color: `${color}.main`,
                fontWeight: dias < 30 ? 'bold' : 'normal',
              }}
            >
              {dias === 0 ? 'Agotado' : `${dias} días`}
            </Typography>
          );
        },
      },
    ],
    [someSelected, allSelected, toggleSelectAll, selectedKeys, toggleRow]
  );

  return (
    <DashboardLayout title="Detalle de Proyección">
      <Head>
        <title>Detalle de Proyección</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, pb: 2 }}>
        <Container maxWidth="xl">
          <Stack
            spacing={2}
            direction="row"
            alignItems="center"
            justifyContent="end"
            sx={{ mb: 1 }}
          >
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="tag-filter-label">Filtrar por tag</InputLabel>
              <Select
                labelId="tag-filter-label"
                id="tag-filter"
                value={tagFilter}
                variant="standard"
                onChange={(e) => {
                  setTagFilter(e.target.value);
                  setPaginaActual(1);
                }}
              >
                {tagsDisponibles.map((t) => (
                  <MenuItem
                    key={`tagopt-${t}`}
                    value={t}
                    sx={
                      t !== 'Todos'
                        ? {
                            backgroundColor: getTagColor(t),
                            '&:hover': {
                              backgroundColor: getTagColor(t),
                              filter: 'brightness(0.95)',
                            },
                          }
                        : {}
                    }
                  >
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              color="error"
              disabled={selectedKeys.size === 0 || isDeleting}
              onClick={() => {
                if (selectedKeys.size === 0) return;
                const selected = productosProyeccion.filter((p) => selectedKeys.has(p._id));
                setItemsToDelete(selected);
                setIsConfirmOpen(true);
              }}
              startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {isDeleting ? 'Eliminando...' : `Eliminar seleccionados (${selectedKeys.size})`}
            </Button>
            <Button
              variant="contained"
              color="primary"
              disabled={selectedKeys.size === 0}
              onClick={async () => {
                setIsTagOpen(true);
                setSelectedExistingTag('');
                setNewTagName('');
                setTagError('');
                try {
                  setIsTagLoading(true);
                  const tags = await proyeccionService.getTags();
                  const nombres = Array.from(
                    new Set((tags || []).map((t) => t?.nombre).filter(Boolean))
                  );
                  setAvailableTags(nombres);
                } catch (e) {
                  console.error(e);
                } finally {
                  setIsTagLoading(false);
                }
              }}
            >
              {`Agregar tag (${selectedKeys.size})`}
            </Button>
            <Button
              variant="contained"
              color="warning"
              disabled={selectedKeys.size === 0}
              onClick={() => {
                setIsRemoveTagOpen(true);
                setRemoveTagError('');
              }}
            >
              {`Eliminar todos los tags (${selectedKeys.size})`}
            </Button>
            <Button
              variant="contained"
              color="success"
              disabled={isExporting}
              onClick={handleExportExcel}
              startIcon={
                isExporting ? <CircularProgress size={16} color="inherit" /> : <FileDownloadIcon />
              }
            >
              {isExporting ? 'Exportando...' : 'Exportar a Excel'}
            </Button>
          </Stack>

          <DataTable
            data={productosProyeccion}
            isLoading={isLoading}
            columns={columns}
            rowIsSelected={(item) => selectedKeys.has(item._id)}
            showSearch={false}
            showDateFilterOptions={false}
            showDatePicker={false}
            showRefreshButton={false}
            searchFields={['codigo', 'descripcion']}
            serverSide={true}
            total={total}
            currentPage={paginaActual}
            onPageChange={(nuevaPagina) => setPaginaActual(nuevaPagina)}
            rowsPerPage={limitePorPagina}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            showBackButton={true}
            onBack={handleVolver}
          />
        </Container>
      </Box>

      <Dialog open={isConfirmOpen} onClose={isDeleting ? undefined : handleCancelDelete} fullWidth>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {`¿Seguro que deseas eliminar ${itemsToDelete.length} producto(s) de la proyección?`}
          </Typography>
          {itemsToDelete.length > 0 && (
            <Box sx={{ maxHeight: 200, overflow: 'auto', mt: 1 }}>
              {itemsToDelete.slice(0, 15).map((p) => (
                <Typography key={p._id} variant="caption" display="block">
                  {p.codigo ? `${p.codigo} - ` : ''}
                  {p.descripcion || 'Sin descripción'}
                </Typography>
              ))}
              {itemsToDelete.length > 15 && (
                <Typography variant="caption" color="text.secondary">
                  {`… y ${itemsToDelete.length - 15} más`}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {isDeleting ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isTagOpen}
        onClose={isTagSaving ? undefined : () => setIsTagOpen(false)}
        fullWidth
        TransitionProps={{ timeout: 0 }}
      >
        <DialogTitle>Agregar tag a seleccionados</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Seleccionados: {selectedKeys.size}
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel id="existing-tag-label">Tag existente</InputLabel>
              <Select
                labelId="existing-tag-label"
                label="Tag existente"
                value={selectedExistingTag}
                onChange={(e) => setSelectedExistingTag(e.target.value)}
              >
                <MenuItem value="">
                  <em>Ninguno</em>
                </MenuItem>
                {availableTags.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              O crear uno nuevo
            </Typography>
            <TextField
              size="small"
              label="Nuevo tag"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
            />
            {tagError && (
              <Typography variant="caption" color="error">
                {tagError}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsTagOpen(false)} disabled={isTagSaving}>
            Cancelar
          </Button>
          <Button
            onClick={handleAgregarTag}
            variant="contained"
            disabled={isTagSaving}
            startIcon={isTagSaving ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {isTagSaving ? 'Guardando…' : 'Guardar tag'}
          </Button>
        </DialogActions>
      </Dialog>

      <EliminarTagsModal
        open={isRemoveTagOpen}
        onClose={() => setIsRemoveTagOpen(false)}
        isSaving={isRemoveTagSaving}
        selectedCount={selectedKeys.size}
        onConfirm={handleEliminarTags}
        error={removeTagError}
      />
    </DashboardLayout>
  );
}
