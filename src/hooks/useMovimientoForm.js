/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { getUser } from "src/utils/celulandia/currentUser";

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
    }
  }, [initialData?._id]);

  useEffect(() => {
    if (initialData?.cliente?.nombre && clientes.length > 0 && !clienteSeleccionado) {
      const clienteExistente = clientes.find((c) => c.nombre === initialData.cliente.nombre);
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
      return tipoDeCambio.oficial || 1;
    }
    if (monedaDePago === "ARS" && CC === "USD BLUE") {
      return tipoDeCambio.blue || 1;
    }
    if (monedaDePago === "USD" && CC === "ARS") {
      return tipoDeCambio.blue || 1;
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
      return montoEnviado / tc;
    }

    if (monedaDePago === "USD" && CC === "ARS") {
      return montoEnviado * tc;
    }

    return montoEnviado;
  };

  const handleTipoDeCambioChange = (value) => {
    if (value > 0) {
      setTipoDeCambioManual(parseFloat(value));
    }

    if (formData.montoEnviado) {
      const newMontoCC = calcularMontoCC(
        parseFloat(formData.montoEnviado) || 0,
        formData.monedaDePago,
        formData.CC
      );
      setFormData((prev) => ({
        ...prev,
        montoCC: Math.round(newMontoCC),
      }));
    }
  };

  const handleMontoEnviado = (value) => {
    const monto = parseFloat(value) || 0;
    const montoCC = calcularMontoCC(monto, formData.monedaDePago, formData.CC);

    setFormData((prev) => ({
      ...prev,
      montoEnviado: value,
      montoCC: Math.round(montoCC),
    }));
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
  };

  return {
    formData,
    setFormData,
    clientes,
    cajas,
    tipoDeCambio,
    tipoDeCambioManual,
    clienteSeleccionado,
    getCCOptions,
    getTipoDeCambio,
    handleTipoDeCambioChange,
    handleMontoEnviado,
    handleInputChange,
    handleClienteChange,
    resetForm,
  };
};
