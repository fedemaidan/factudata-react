/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { getUser } from "src/utils/celulandia/currentUser";

// Función para formatear número con separadores de miles
const formatNumberWithThousands = (value) => {
  if (!value) return "";
  const numericValue = value.replace(/[^\d.]/g, "");
  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Función para remover separadores de miles y obtener el valor numérico
const parseNumberFromFormatted = (formattedValue) => {
  if (!formattedValue) return "";
  return formattedValue.replace(/\./g, "");
};

export const useMovimientoForm = (initialData = null, externalData = null) => {
  const {
    clientes = [],
    tipoDeCambio: externalTipoDeCambio = null,
    cajas = [],
  } = externalData || {};

  const [tipoDeCambio, setTipoDeCambio] = useState({
    ultimaActualizacion: "",
    oficial: null,
    blue: null,
    current: 1,
  });
  const [tipoDeCambioManual, setTipoDeCambioManual] = useState(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [montoFormateado, setMontoFormateado] = useState("");

  const [formData, setFormData] = useState({
    cliente: initialData?.cliente?.nombre || "",
    cuentaDestino: initialData?.cuentaDestino || "ENSHOP SRL",
    monedaDePago: initialData?.moneda || "ARS",
    montoEnviado: initialData?.montoEnviado || "",
    CC: initialData?.cuentaCorriente || "ARS",
    montoCC: initialData?.montoCC || "",
    estado: initialData?.estado || "CONFIRMADO",
    concepto: initialData?.concepto || "",
    usuario: getUser(),
  });

  const getCCOptions = () => {
    if (clienteSeleccionado && clienteSeleccionado.ccActivas) {
      return clienteSeleccionado.ccActivas;
    }
    return ["ARS", "USD BLUE", "USD OFICIAL"];
  };

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData({
        cliente: initialData.cliente?.nombre || "",
        cuentaDestino: initialData.cuentaDestino || "ENSHOP SRL",
        monedaDePago: initialData.moneda || "ARS",
        montoEnviado: initialData.montoEnviado || "",
        CC: initialData.cuentaCorriente || "ARS",
        montoCC: initialData.montoCC || "",
        estado: initialData.estado || "CONFIRMADO",
        concepto: initialData.concepto || "",
        usuario: getUser(),
      });

      if (initialData.montoEnviado) {
        const formattedValue = formatNumberWithThousands(initialData.montoEnviado.toString());
        setMontoFormateado(formattedValue);
      }
    }
  }, [initialData?._id]);

  useEffect(() => {
    if (initialData?.cliente?.nombre && clientes.length > 0 && !clienteSeleccionado) {
      const clienteExistente = clientes.find(
        (c) =>
          c?.nombre?.trim()?.toUpperCase() === initialData?.cliente?.nombre?.trim()?.toUpperCase()
      );
      if (clienteExistente) {
        setClienteSeleccionado(clienteExistente);
        if (formData.CC === "ARS" || !clienteExistente.ccActivas?.includes(formData.CC)) {
          setFormData((prev) => ({
            ...prev,
            CC: clienteExistente.ccActivas?.[0] || "ARS",
          }));
        }
      }
    }
  }, [initialData, clientes, clienteSeleccionado, formData.CC]);

  useEffect(() => {
    if (externalTipoDeCambio) {
      setTipoDeCambio({
        ...externalTipoDeCambio,
        current: externalTipoDeCambio?.current || 1,
      });
    }
  }, [externalTipoDeCambio]);

  const getTipoDeCambio = (monedaDePago, CC) => {
    if (
      (monedaDePago === "ARS" && CC === "ARS") ||
      (monedaDePago === "USD" && CC === "USD BLUE") ||
      (monedaDePago === "USD" && CC === "USD OFICIAL")
    ) {
      return 1;
    }

    if (tipoDeCambioManual !== null) {
      return tipoDeCambioManual;
    }

    if (monedaDePago === "ARS" && CC === "USD OFICIAL") {
      const tc = tipoDeCambio.oficial || 1;
      return tc;
    }
    if (monedaDePago === "ARS" && CC === "USD BLUE") {
      const tc = tipoDeCambio.blue || 1;
      return tc;
    }
    if (monedaDePago === "USD" && CC === "ARS") {
      const tc = tipoDeCambio.blue || 1;
      return tc;
    }

    return 1;
  };

  const calcularMontoCC = (montoEnviado, monedaDePago, CC) => {
    const tc = getTipoDeCambio(monedaDePago, CC);

    if (
      (monedaDePago === "ARS" && CC === "ARS") ||
      (monedaDePago === "USD" && CC === "USD BLUE") ||
      (monedaDePago === "USD" && CC === "USD OFICIAL")
    ) {
      return montoEnviado;
    }

    if (monedaDePago === "ARS" && (CC === "USD OFICIAL" || CC === "USD BLUE")) {
      const resultado = montoEnviado / tc;
      return resultado;
    }

    if (monedaDePago === "USD" && CC === "ARS") {
      const resultado = montoEnviado * tc;
      return resultado;
    }

    return montoEnviado;
  };

  const handleTipoDeCambioChange = (value) => {
    if (value > 0) {
      const tipoDeCambioManual = parseFloat(value);
      setTipoDeCambioManual(tipoDeCambioManual);
    }

    if (formData.montoEnviado) {
      const tipoDeCambioActual =
        value > 0 ? parseFloat(value) : getTipoDeCambio(formData.monedaDePago, formData.CC);

      let newMontoCC;
      if (
        (formData.monedaDePago === "ARS" && formData.CC === "ARS") ||
        (formData.monedaDePago === "USD" && formData.CC === "USD BLUE") ||
        (formData.monedaDePago === "USD" && formData.CC === "USD OFICIAL")
      ) {
        newMontoCC = parseFloat(formData.montoEnviado) || 0;
      } else if (
        formData.monedaDePago === "ARS" &&
        (formData.CC === "USD OFICIAL" || formData.CC === "USD BLUE")
      ) {
        newMontoCC = (parseFloat(formData.montoEnviado) || 0) / tipoDeCambioActual;
      } else if (formData.monedaDePago === "USD" && formData.CC === "ARS") {
        newMontoCC = (parseFloat(formData.montoEnviado) || 0) * tipoDeCambioActual;
      } else {
        newMontoCC = parseFloat(formData.montoEnviado) || 0;
      }

      const newMontoCCRedondeado = Math.round(newMontoCC);

      setFormData((prev) => ({
        ...prev,
        montoCC: newMontoCCRedondeado,
      }));
    }
  };

  const handleMontoEnviado = (value) => {
    const monto = parseFloat(value) || 0;

    const montoCC = calcularMontoCC(monto, formData.monedaDePago, formData.CC);

    const montoCCRedondeado = Math.round(montoCC);

    setFormData((prev) => ({
      ...prev,
      montoEnviado: value,
      montoCC: montoCCRedondeado,
    }));
  };

  // Función para manejar el cambio del monto con formato
  const handleMontoChange = (value) => {
    const numericValue = parseNumberFromFormatted(value);
    const formattedValue = formatNumberWithThousands(numericValue);

    setMontoFormateado(formattedValue);
    handleMontoEnviado(numericValue);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const newFormData = {
        ...prev,
        [field]: value,
      };

      if (field === "monedaDePago" || field === "CC") {
        setTipoDeCambioManual(null);

        const newTipoDeCambio = getTipoDeCambio(
          value,
          field === "monedaDePago" ? newFormData.CC : newFormData.monedaDePago
        );

        setTipoDeCambio((prev) => ({
          ...prev,
          current: newTipoDeCambio,
        }));

        if (newFormData.montoEnviado) {
          const newMontoCC = calcularMontoCC(
            parseFloat(newFormData.montoEnviado) || 0,
            newFormData.monedaDePago,
            newFormData.CC
          );
          newFormData.montoCC = Math.round(newMontoCC);
        }
      }

      return newFormData;
    });
  };

  const handleClienteChange = (event, newValue) => {
    if (newValue && typeof newValue === "object") {
      setClienteSeleccionado(newValue);
      handleInputChange("cliente", newValue.nombre);
      const ccOptions = newValue.ccActivas || ["ARS", "USD BLUE", "USD OFICIAL"];
      if (!ccOptions.includes(formData.CC)) {
        setFormData((prev) => ({
          ...prev,
          CC: ccOptions[0] || "ARS",
        }));
      }
    } else {
      setClienteSeleccionado(null);
      handleInputChange("cliente", newValue || "");
      setFormData((prev) => ({
        ...prev,
        CC: "ARS",
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      cliente: "",
      cuentaDestino: "ENSHOP SRL",
      montoEnviado: "",
      monedaDePago: "ARS",
      CC: "ARS",
      montoCC: "",
      estado: "CONFIRMADO",
      usuario: getUser(),
    });
    setTipoDeCambioManual(null);
    setClienteSeleccionado(null);
    setMontoFormateado("");
  };

  return {
    formData,
    setFormData,
    clientes,
    cajas,
    tipoDeCambio,
    tipoDeCambioManual,
    clienteSeleccionado,
    montoFormateado,
    getCCOptions,
    getTipoDeCambio,
    handleTipoDeCambioChange,
    handleMontoEnviado,
    handleMontoChange,
    handleInputChange,
    handleClienteChange,
    resetForm,
  };
};
