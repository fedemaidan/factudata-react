import pdfPlantillaService from 'src/services/pdfPlantillaService';
import { compilePlantillaComponent } from './compilePlantillaComponent';

/**
 * Carga el código de una plantilla custom por id (proxiado por el backend para
 * evitar CORS) y lo compila al componente PlantillaPDF. Útil para editar una
 * plantilla existente o (a futuro) para el export.
 */
export async function loadCustomComponentById(templateId) {
  const code = await pdfPlantillaService.getComponentCode(templateId);
  if (!code) throw new Error('No se pudo cargar el código de la plantilla');
  const Component = await compilePlantillaComponent(code);
  return { code, Component };
}
