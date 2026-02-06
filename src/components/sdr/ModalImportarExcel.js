/**
 * Modal para Importar Contactos desde Excel
 * Con validación de teléfono E.164 y deduplicación
 */
import { useState, useRef } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, Button, Stack, Alert, Paper,
    CircularProgress, IconButton, LinearProgress, Chip,
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
    Divider
} from '@mui/material';
import {
    Close as CloseIcon,
    UploadFile as UploadFileIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    Download as DownloadIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import SDRService from '../../services/sdrService';
import { normalizeToE164, isValidPhone } from '../../utils/phoneUtils';

const ModalImportarExcel = ({
    open,
    onClose,
    empresaId,
    sdrId,
    sdrNombre,
    onSuccess, // Callback al importar exitosamente
}) => {
    const fileInputRef = useRef(null);
    const [archivo, setArchivo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [resultado, setResultado] = useState(null);
    const [error, setError] = useState(null);

    // Reset al cerrar
    const handleClose = () => {
        setArchivo(null);
        setPreview(null);
        setResultado(null);
        setError(null);
        onClose();
    };

    // Procesar archivo Excel
    const handleArchivoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setArchivo(file);
        setPreview(null);
        setResultado(null);
        setError(null);
        setLoading(true);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet);

            // Mapear y validar contactos
            const contactosProcesados = json.map((row, index) => {
                // Buscar columnas con diferentes nombres
                const nombre = row.Nombre || row.nombre || row.Name || row.name || 
                              row['Nombre completo'] || row['nombre completo'] || '';
                const telefono = String(row.Teléfono || row.telefono || row.Telefono || 
                                        row.Phone || row.phone || row.Tel || row.tel || '');
                const email = row.Email || row.email || row.Mail || row.mail || 
                             row['Correo electrónico'] || '';
                const empresa = row.Empresa || row.empresa || row.Company || row.company || 
                               row['Nombre empresa'] || '';
                const cargo = row.Cargo || row.cargo || row.Position || row.position || 
                             row.Rol || row.rol || '';
                const notas = row.Notas || row.notas || row.Notes || row.notes || 
                             row.Comentarios || row.comentarios || '';
                const proximoContacto = row['Próximo contacto'] || row['proximo_contacto'] || 
                                       row['next_contact_at'] || '';

                // Normalizar teléfono
                const telefonoNormalizado = normalizeToE164(telefono);
                const telefonoValido = isValidPhone(telefono);

                // Detectar errores
                const errores = [];
                if (!nombre.trim()) errores.push('Sin nombre');
                if (!telefono) errores.push('Sin teléfono');
                else if (!telefonoValido) errores.push('Teléfono inválido');

                return {
                    fila: index + 2, // +2 porque Excel empieza en 1 y hay header
                    nombre: nombre.trim(),
                    telefono: telefonoNormalizado,
                    telefonoOriginal: telefono,
                    email: email.trim(),
                    empresa: empresa.trim(),
                    cargo: cargo.trim(),
                    notas: notas.trim(),
                    proximoContacto: proximoContacto ? new Date(proximoContacto) : null,
                    errores,
                    valido: errores.length === 0
                };
            });

            // Detectar duplicados internos (mismo teléfono en el archivo)
            const telefonosVistos = {};
            contactosProcesados.forEach(c => {
                if (c.telefono) {
                    if (telefonosVistos[c.telefono]) {
                        c.errores.push('Duplicado en archivo');
                        c.valido = false;
                    } else {
                        telefonosVistos[c.telefono] = true;
                    }
                }
            });

            // Verificar duplicados en base de datos
            const validos = contactosProcesados.filter(c => c.valido);
            if (validos.length > 0) {
                try {
                    const previewData = await SDRService.previewImportacion(
                        validos.map(c => ({
                            nombre: c.nombre,
                            telefono: c.telefono,
                            email: c.email,
                            empresa: c.empresa
                        })),
                        empresaId
                    );
                    
                    // Marcar duplicados en base de datos
                    previewData.forEach((p, i) => {
                        const contacto = contactosProcesados.find(c => c.telefono === validos[i].telefono);
                        if (contacto && p.esDuplicado) {
                            contacto.errores.push('Ya existe en base');
                            contacto.duplicadoEnBase = true;
                        }
                    });
                } catch (err) {
                    console.error('Error verificando duplicados:', err);
                }
            }

            setPreview({
                total: contactosProcesados.length,
                validos: contactosProcesados.filter(c => c.valido).length,
                invalidos: contactosProcesados.filter(c => !c.valido).length,
                duplicadosEnBase: contactosProcesados.filter(c => c.duplicadoEnBase).length,
                contactos: contactosProcesados
            });

        } catch (err) {
            console.error('Error procesando archivo:', err);
            setError('Error al procesar el archivo. Verifica que sea un Excel válido.');
        } finally {
            setLoading(false);
        }
    };

    // Importar contactos válidos
    const handleImportar = async () => {
        if (!preview) return;

        const contactosAImportar = preview.contactos
            .filter(c => c.valido && !c.duplicadoEnBase)
            .map(c => ({
                nombre: c.nombre,
                telefono: c.telefono,
                email: c.email || undefined,
                empresa: c.empresa || undefined,
                cargo: c.cargo || undefined,
                notas: c.notas || undefined,
                proximoContacto: c.proximoContacto || undefined,
                empresaId,
                sdrAsignado: sdrId,
                sdrAsignadoNombre: sdrNombre,
                estado: 'nuevo',
                origen: 'excel'
            }));

        if (contactosAImportar.length === 0) {
            setError('No hay contactos válidos para importar');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await SDRService.importarContactos(contactosAImportar, empresaId, 'excel');
            
            setResultado({
                importados: res.importados || contactosAImportar.length,
                duplicados: res.duplicados || 0,
                errores: res.errores || 0
            });

            onSuccess?.(res);
        } catch (err) {
            console.error('Error importando:', err);
            setError(err.response?.data?.error || 'Error al importar contactos');
        } finally {
            setLoading(false);
        }
    };

    // Descargar plantilla
    const handleDescargarPlantilla = () => {
        const plantilla = [
            {
                'Nombre': 'Juan Pérez',
                'Teléfono': '1123456789',
                'Email': 'juan@empresa.com',
                'Empresa': 'Mi Empresa SA',
                'Cargo': 'Gerente',
                'Notas': 'Interesado en facturación',
                'Próximo contacto': '2026-02-01'
            }
        ];
        const ws = XLSX.utils.json_to_sheet(plantilla);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Contactos');
        XLSX.writeFile(wb, 'plantilla_contactos_sdr.xlsx');
    };

    // Renderizar preview
    const renderPreview = () => {
        if (!preview) return null;

        const contactosParaMostrar = preview.contactos.slice(0, 10);
        const hayMas = preview.contactos.length > 10;

        return (
            <Stack spacing={2}>
                {/* Resumen */}
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                    <Chip 
                        icon={<CheckCircleIcon />}
                        label={`${preview.validos - preview.duplicadosEnBase} válidos para importar`}
                        color="success"
                        variant="outlined"
                    />
                    {preview.duplicadosEnBase > 0 && (
                        <Chip 
                            icon={<WarningIcon />}
                            label={`${preview.duplicadosEnBase} ya existen`}
                            color="warning"
                            variant="outlined"
                        />
                    )}
                    {preview.invalidos > 0 && (
                        <Chip 
                            icon={<ErrorIcon />}
                            label={`${preview.invalidos} con errores`}
                            color="error"
                            variant="outlined"
                        />
                    )}
                </Stack>

                {/* Tabla de preview */}
                <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>Fila</TableCell>
                                <TableCell>Nombre</TableCell>
                                <TableCell>Teléfono</TableCell>
                                <TableCell>Empresa</TableCell>
                                <TableCell>Estado</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {contactosParaMostrar.map((c, i) => (
                                <TableRow 
                                    key={i}
                                    sx={{ 
                                        bgcolor: !c.valido ? 'error.50' : 
                                                 c.duplicadoEnBase ? 'warning.50' : 'inherit'
                                    }}
                                >
                                    <TableCell>{c.fila}</TableCell>
                                    <TableCell>{c.nombre || '-'}</TableCell>
                                    <TableCell>
                                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                            {c.telefono || c.telefonoOriginal || '-'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{c.empresa || '-'}</TableCell>
                                    <TableCell>
                                        {c.valido && !c.duplicadoEnBase ? (
                                            <Chip size="small" label="OK" color="success" />
                                        ) : (
                                            <Chip 
                                                size="small" 
                                                label={c.errores.join(', ')} 
                                                color={c.duplicadoEnBase ? 'warning' : 'error'}
                                            />
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                
                {hayMas && (
                    <Typography variant="caption" color="text.secondary" textAlign="center">
                        ... y {preview.contactos.length - 10} filas más
                    </Typography>
                )}
            </Stack>
        );
    };

    // Renderizar resultado
    const renderResultado = () => {
        if (!resultado) return null;

        return (
            <Box sx={{ textAlign: 'center', py: 3 }}>
                <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                    ¡Importación completada!
                </Typography>
                <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
                    <Chip 
                        label={`${resultado.importados} importados`}
                        color="success"
                    />
                    {resultado.duplicados > 0 && (
                        <Chip 
                            label={`${resultado.duplicados} duplicados omitidos`}
                            color="warning"
                        />
                    )}
                </Stack>
            </Box>
        );
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose}
            fullWidth
            maxWidth="md"
            PaperProps={{ sx: { borderRadius: 3 } }}
        >
            <DialogTitle>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Importar desde Excel</Typography>
                    <IconButton onClick={handleClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Stack>
            </DialogTitle>

            <DialogContent dividers>
                {resultado ? (
                    renderResultado()
                ) : (
                    <Stack spacing={3}>
                        {/* Instrucciones */}
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            <Typography variant="body2">
                                <strong>Columnas requeridas:</strong> Nombre, Teléfono<br />
                                <strong>Columnas opcionales:</strong> Email, Empresa, Cargo, Notas, Próximo contacto
                            </Typography>
                        </Alert>

                        {/* Botones de acción */}
                        <Stack direction="row" spacing={2}>
                            <Button
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={handleDescargarPlantilla}
                            >
                                Descargar plantilla
                            </Button>
                            <Button
                                variant="contained"
                                component="label"
                                startIcon={<UploadFileIcon />}
                                disabled={loading}
                            >
                                {archivo ? 'Cambiar archivo' : 'Seleccionar archivo'}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    hidden
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleArchivoChange}
                                />
                            </Button>
                        </Stack>

                        {/* Nombre del archivo */}
                        {archivo && (
                            <Typography variant="body2" color="text.secondary">
                                📁 {archivo.name}
                            </Typography>
                        )}

                        {/* Loading */}
                        {loading && <LinearProgress />}

                        {/* Preview */}
                        {preview && renderPreview()}

                        {/* Error */}
                        {error && (
                            <Alert severity="error" sx={{ borderRadius: 2 }}>
                                {error}
                            </Alert>
                        )}
                    </Stack>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                {resultado ? (
                    <Button variant="contained" onClick={handleClose}>
                        Cerrar
                    </Button>
                ) : (
                    <>
                        <Button onClick={handleClose} color="inherit">
                            Cancelar
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleImportar}
                            disabled={loading || !preview || (preview.validos - preview.duplicadosEnBase) === 0}
                            sx={{ borderRadius: 2, px: 3 }}
                        >
                            {loading ? (
                                <CircularProgress size={20} />
                            ) : (
                                `Importar ${preview ? preview.validos - preview.duplicadosEnBase : 0} contactos`
                            )}
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default ModalImportarExcel;
