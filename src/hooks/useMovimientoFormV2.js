import { useMemo, useState, useCallback, useEffect } from "react";
import { toNumber } from "src/utils/celulandia/separacionMiles";

// Función de cálculo única (pura)
export const calcularMovimientoV2 = ({
  montoEnviado,
  monedaDePago,
  cuentaCorriente,
  tipoDeCambioManual = null,
  tipoDeCambio = { oficial: 1, blue: 1 },
  descuentoPercent = 0,
  aplicarDescuento = false,
  signo = 1,
}) => {
  const resolveTC = (tc) => {
    if (tc === null || tc === undefined) return 1;
    if (typeof tc === "number") return tc > 0 ? tc : 1;
    if (typeof tc === "object") {
      const venta = toNumber(tc.venta);
      const compra = toNumber(tc.compra);
      const value = venta || compra;
      return value > 0 ? value : 1;
    }
    return 1;
  };

  const monto = Math.abs(toNumber(montoEnviado));
  const tcOficial = resolveTC(tipoDeCambio?.oficial) || 1;
  const tcBlue = resolveTC(tipoDeCambio?.blue) || 1;
  const manualTC = (() => {
    const n = toNumber(tipoDeCambioManual);
    return n > 0 ? n : 0;
  })();

  const tc = (() => {
    if (
      (monedaDePago === "ARS" && cuentaCorriente === "ARS") ||
      (monedaDePago === "USD" && cuentaCorriente === "USD BLUE") ||
      (monedaDePago === "USD" && cuentaCorriente === "USD OFICIAL")
    ) {
      return 1;
    }
    if (manualTC > 0) return manualTC;
    if (monedaDePago === "ARS" && cuentaCorriente === "USD OFICIAL") return tcOficial || 1;
    if (monedaDePago === "ARS" && cuentaCorriente === "USD BLUE") return tcBlue || 1;
    if (monedaDePago === "USD" && cuentaCorriente === "ARS") return tcBlue || 1;
    return 1;
  })();

  let subtotalSinDescuento = 0;
  if (
    (monedaDePago === "ARS" && cuentaCorriente === "ARS") ||
    (monedaDePago === "USD" && cuentaCorriente === "USD BLUE") ||
    (monedaDePago === "USD" && cuentaCorriente === "USD OFICIAL")
  ) {
    subtotalSinDescuento = monto;
  } else if (
    monedaDePago === "ARS" &&
    (cuentaCorriente === "USD OFICIAL" || cuentaCorriente === "USD BLUE")
  ) {
    subtotalSinDescuento = tc > 0 ? monto / tc : 0;
  } else if (monedaDePago === "USD" && cuentaCorriente === "ARS") {
    subtotalSinDescuento = monto * tc;
  } else {
    subtotalSinDescuento = monto;
  }

  const subtotalSinDescuentoRedondeado = Math.round(Math.abs(subtotalSinDescuento));
  const porcentaje = aplicarDescuento ? Math.max(0, Math.min(100, toNumber(descuentoPercent))) : 0;
  const factorDescuento = 1 - porcentaje / 100;
  const totalConDescuento = subtotalSinDescuento * factorDescuento;
  const totalConDescuentoRedondeado = Math.round(Math.abs(totalConDescuento));

  let subTotal = { ars: 0, usdOficial: 0, usdBlue: 0 };
  if (cuentaCorriente === "ARS") {
    subTotal = {
      ars: signo * (monedaDePago === "ARS" ? monto : subtotalSinDescuentoRedondeado),
      usdOficial:
        signo *
        (monedaDePago === "USD" ? monto : Math.round(subtotalSinDescuentoRedondeado / tcOficial)),
      usdBlue:
        signo *
        (monedaDePago === "USD" ? monto : Math.round(subtotalSinDescuentoRedondeado / tcBlue)),
    };
  } else if (cuentaCorriente === "USD OFICIAL") {
    subTotal = {
      ars:
        signo *
        (monedaDePago === "ARS" ? monto : Math.round(subtotalSinDescuentoRedondeado * tcOficial)),
      usdOficial: signo * (monedaDePago === "USD" ? monto : subtotalSinDescuentoRedondeado),
      usdBlue: signo * (monedaDePago === "USD" ? monto : subtotalSinDescuentoRedondeado),
    };
  } else if (cuentaCorriente === "USD BLUE") {
    subTotal = {
      ars:
        signo *
        (monedaDePago === "ARS" ? monto : Math.round(subtotalSinDescuentoRedondeado * tcBlue)),
      usdOficial: signo * (monedaDePago === "USD" ? monto : subtotalSinDescuentoRedondeado),
      usdBlue: signo * (monedaDePago === "USD" ? monto : subtotalSinDescuentoRedondeado),
    };
  }

  let montoTotal = { ars: 0, usdOficial: 0, usdBlue: 0 };
  if (cuentaCorriente === "ARS") {
    montoTotal = {
      ars: signo * totalConDescuentoRedondeado,
      usdOficial: signo * Math.round(totalConDescuentoRedondeado / tcOficial),
      usdBlue: signo * Math.round(totalConDescuentoRedondeado / tcBlue),
    };
  } else if (cuentaCorriente === "USD OFICIAL") {
    montoTotal = {
      ars: signo * Math.round(totalConDescuentoRedondeado * tcOficial),
      usdOficial: signo * totalConDescuentoRedondeado,
      usdBlue: signo * totalConDescuentoRedondeado,
    };
  } else if (cuentaCorriente === "USD BLUE") {
    montoTotal = {
      ars: signo * Math.round(totalConDescuentoRedondeado * tcBlue),
      usdOficial: signo * totalConDescuentoRedondeado,
      usdBlue: signo * totalConDescuentoRedondeado,
    };
  }

  return {
    tc,
    factorDescuento,
    subtotalSinDescuento,
    subtotalSinDescuentoRedondeado,
    totalConDescuento,
    totalConDescuentoRedondeado,
    subTotal,
    montoTotal,
  };
};

export const useMovimientoFormV2 = (initialData = null, externalData = null) => {
  const { clientes = [], tipoDeCambio: externalTipoDeCambio = null } = externalData || {};

  const [formData, setFormData] = useState({
    cliente: initialData?.cliente?.nombre || "",
    cuentaDestino: initialData?.cuentaDestino || "ENSHOP SRL",
    monedaDePago: initialData?.moneda || "ARS",
    montoEnviado: initialData?.montoEnviado || "",
    CC: initialData?.cuentaCorriente || "ARS",
    estado: initialData?.estado || "CONFIRMADO",
    concepto: initialData?.concepto || "",
    usuario: initialData?.usuario || "",
  });

  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [tipoDeCambioManual, setTipoDeCambioManual] = useState(null);

  // Hidratar desde initialData cuando llegue (abre modal o cambia selección)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData({
        cliente: initialData?.cliente?.nombre || "",
        cuentaDestino: initialData?.cuentaDestino || "ENSHOP SRL",
        monedaDePago: initialData?.moneda || "ARS",
        montoEnviado: initialData?.montoEnviado || "",
        CC: initialData?.cuentaCorriente || "ARS",
        estado: initialData?.estado || "CONFIRMADO",
        concepto: initialData?.concepto || "",
        usuario: initialData?.usuario || "",
      });

      // Seleccionar cliente si está en lista
      if (initialData?.cliente?.nombre && Array.isArray(clientes) && clientes.length > 0) {
        const existente = clientes.find((c) => c?.nombre === initialData?.cliente?.nombre);
        if (existente) {
          setClienteSeleccionado(existente);
          if (!existente.ccActivas?.includes(initialData?.cuentaCorriente || "ARS")) {
            setFormData((prev) => ({ ...prev, CC: existente.ccActivas?.[0] || "ARS" }));
          }
        } else {
          setClienteSeleccionado(null);
        }
      }

      setTipoDeCambioManual(null);
    }
  }, [initialData, clientes]);

  const handleChange = useCallback(
    (field, value) => {
      if (field === "tipoDeCambioManual") {
        const n = Number(String(value).replace(/\./g, "").replace(",", "."));
        if (Number.isFinite(n) && n > 0) setTipoDeCambioManual(n);
        else setTipoDeCambioManual(null);
        return;
      }

      if (field === "cliente") {
        if (value && typeof value === "object") {
          setClienteSeleccionado(value);
          setFormData((prev) => ({ ...prev, cliente: value.nombre }));
          const ccOptions = value.ccActivas || ["ARS", "USD BLUE", "USD OFICIAL"];
          if (!ccOptions.includes(formData.CC)) {
            setFormData((prev) => ({ ...prev, CC: ccOptions[0] || "ARS" }));
          }
        } else {
          setClienteSeleccionado(null);
          setFormData((prev) => ({ ...prev, cliente: value || "", CC: "ARS" }));
        }
        return;
      }

      setFormData((prev) => {
        let nextValue = value;
        if (field === "montoEnviado") {
          nextValue = String(value || "").replace(/\./g, "");
        }
        const next = { ...prev, [field]: nextValue };
        if (field === "monedaDePago" || field === "CC") setTipoDeCambioManual(null);
        return next;
      });
    },
    [formData.CC]
  );

  const calculos = useMemo(
    () =>
      calcularMovimientoV2({
        montoEnviado: formData.montoEnviado,
        monedaDePago: formData.monedaDePago,
        cuentaCorriente: formData.CC,
        tipoDeCambioManual,
        tipoDeCambio: externalTipoDeCambio || { oficial: 1, blue: 1 },
        aplicarDescuento: false,
        descuentoPercent: 0,
        signo: 1,
      }),
    [
      formData.montoEnviado,
      formData.monedaDePago,
      formData.CC,
      tipoDeCambioManual,
      externalTipoDeCambio,
    ]
  );

  const getCCOptions = () => {
    if (clienteSeleccionado && clienteSeleccionado.ccActivas) return clienteSeleccionado.ccActivas;
    return ["ARS", "USD BLUE", "USD OFICIAL"];
  };

  return {
    formData,
    handleChange,
    getCCOptions,
    clienteSeleccionado,
    tipoDeCambioManual,
    calculos,
  };
};

export default useMovimientoFormV2;
