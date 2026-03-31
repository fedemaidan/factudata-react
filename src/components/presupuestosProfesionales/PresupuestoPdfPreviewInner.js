import React, { useMemo } from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import { PresupuestoPdfDocument } from 'src/utils/presupuestos/PdfPresupuestoDocument';

/**
 * Solo cliente: debe cargarse con dynamic(..., { ssr: false }).
 * El documento va memorizado para que re-renders del padre no disparen usePDF() en cada frame.
 */
const PresupuestoPdfPreviewInner = ({
  presupuesto,
  empresa,
  logoDataUrl,
  costoM2Data,
  incluirTotalesM2 = true,
}) => {
  const document = useMemo(
    () => (
      <PresupuestoPdfDocument
        presupuesto={presupuesto}
        empresa={empresa}
        logoDataUrl={logoDataUrl}
        costoM2Data={costoM2Data}
        incluirTotalesM2={incluirTotalesM2}
      />
    ),
    [presupuesto, empresa, logoDataUrl, costoM2Data, incluirTotalesM2]
  );

  return (
    <PDFViewer
      width="100%"
      height="100%"
      showToolbar={false}
      style={{ border: 'none' }}
      title="Vista previa del presupuesto"
    >
      {document}
    </PDFViewer>
  );
};

export default React.memo(PresupuestoPdfPreviewInner);
