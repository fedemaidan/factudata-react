import React from 'react';
import { WalletIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import { formatCurrencyWithCode } from 'src/utils/formatters';

/**
 * Información cuando un movimiento fue pagado desde otra caja
 */
const PagoEntreCajasInfo = ({ movimiento }) => {
  if (!movimiento?.es_pago_entre_cajas) {
    return null;
  }

  const esEgresoOperativo = movimiento.movimiento_relacionado_tipo === 'egreso_operativo';
  const esTransferencia = movimiento.movimiento_relacionado_tipo === 'transferencia_pago';

  return (
    <div className="mt-2 rounded-xl border-2 border-warning-main/50 bg-warning-main/10 p-3">
      <div className="mb-2 flex items-center gap-1">
        <WalletIcon className="h-4 w-4 text-warning-dark" aria-hidden />
        <span className="rounded-full bg-warning-main px-2 py-0.5 text-xs font-bold text-white">
          PAGO ENTRE CAJAS
        </span>
      </div>

      {esEgresoOperativo && (
        <>
          <h3 className="mb-2 text-sm font-semibold text-warning-dark">Gasto pagado desde otra caja</h3>
          <div className="mb-2 rounded-lg border border-warning-main/40 bg-white p-2">
            <p className="text-xs font-bold text-warning-dark">
              Este gasto: {formatCurrencyWithCode(movimiento.total, movimiento.moneda)}
            </p>
            <p className="mt-1 text-xs text-neutral-600">
              <strong>Pagado desde:</strong> {movimiento.caja_pagadora_nombre}
            </p>
            <p className="text-xs text-neutral-600">
              <strong>Proyecto del gasto:</strong> {movimiento.proyecto}
            </p>
          </div>
          <div className="rounded-lg border border-info-main/30 bg-info-main/10 p-2 text-xs text-neutral-800">
            <p className="mb-1 font-semibold text-info-dark">¿Cómo funciona el pago entre cajas?</p>
            <p>Este gasto se registró automáticamente junto con:</p>
            <ol className="mt-1 list-decimal pl-4">
              <li>
                <strong>Transferencia</strong> desde <em>{movimiento.caja_pagadora_nombre}</em> hacia{' '}
                <em>{movimiento.proyecto}</em>
              </li>
              <li>
                <strong>Este egreso operativo</strong> en <em>{movimiento.proyecto}</em>
              </li>
            </ol>
          </div>
        </>
      )}

      {esTransferencia && (
        <>
          <div className="mb-2 flex items-center gap-1">
            <ArrowsRightLeftIcon className="h-4 w-4 text-warning-dark" aria-hidden />
            <h3 className="text-sm font-semibold text-warning-dark">Transferencia para financiar gasto</h3>
          </div>
          <div className="mb-2 rounded-lg border border-warning-main/40 bg-white p-2">
            <p className="text-xs font-bold text-warning-dark">
              Transferencia: {formatCurrencyWithCode(movimiento.total, movimiento.moneda)}
            </p>
            <p className="mt-1 text-xs text-neutral-600">
              <strong>De:</strong> {movimiento.proyecto}
            </p>
            <p className="text-xs text-neutral-600">
              <strong>Para:</strong> {movimiento.subcategoria}
            </p>
          </div>
          <div className="rounded-lg border border-info-main/30 bg-info-main/10 p-2 text-xs text-neutral-800">
            Esta transferencia se creó automáticamente para financiar un gasto en otro proyecto. Permite mantener la
            trazabilidad de los fondos entre diferentes cajas/proyectos.
          </div>
        </>
      )}
    </div>
  );
};

export default PagoEntreCajasInfo;
