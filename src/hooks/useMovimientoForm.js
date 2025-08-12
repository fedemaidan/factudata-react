import { useState, useEffect } from "react";
import clientesService from "src/services/celulandia/clientesService";
import dolarService from "src/services/celulandia/dolarService";
import cajasService from "src/services/celulandia/cajasService";
import { getUser } from "src/utils/celulandia/currentUser";

export const useMovimientoForm = (initialData = null) => {
  const [clientes, setClientes] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [tipoDeCambio, setTipoDeCambio] = useState({
    ultimaActualizacion: "",
    oficial: null,
    blue: null,
    current: 1,
  });
  const [tipoDeCambioManual, setTipoDeCambioManual] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const [formData, setFormData] = useState({
    cliente: initialData?.cliente?.nombre || "",
    cuentaDestino: initialData?.cuentaDestino || "ENSHOP SRL",
    monedaDePago: initialData?.moneda || "ARS",
    montoEnviado: initialData?.montoEnviado || "",
    CC: initialData?.cuentaCorriente || "ARS",
    montoCC: initialData?.montoCC || "",
    estado: initialData?.estado || "CONFIRMADO",
    usuario: getUser(),
  });

  console.log("formData", formData);

  const getCCOptions = () => {
    if (clienteSeleccionado && clienteSeleccionado.ccActivas) {
      return clienteSeleccionado.ccActivas;
    }
    return ["ARS", "USD BLUE", "USD OFICIAL"];
  };

  useEffect(() => {
    setIsLoading(true);
    fetchData();
  }, []);

  // Efecto para establecer el cliente seleccionado cuando se inicializa con datos existentes
  useEffect(() => {
    if (initialData?.cliente?.nombre && clientes.length > 0) {
      const clienteExistente = clientes.find((c) => c.nombre === initialData.cliente.nombre);
      if (clienteExistente) {
        setClienteSeleccionado(clienteExistente);
        setFormData((prev) => ({
          ...prev,
          cliente: clienteExistente.nombre,
          CC: clienteExistente.ccActivas?.[0] || "ARS",
        }));
      }
    }
  }, [initialData, clientes]);

  const fetchData = async () => {
    Promise.all([
      clientesService.getAllClientes(),
      dolarService.getTipoDeCambio(),
      cajasService.getAllCajas(),
    ])
      .then(([clientes, tipoDeCambio, cajas]) => {
        const clientesArray = Array.isArray(clientes) ? clientes : clientes?.data || [];
        setClientes(clientesArray);
        setTipoDeCambio({
          ...tipoDeCambio,
          current: tipoDeCambio?.current || 1,
        });
        setCajas(cajas.data);
      })
      .catch((error) => {
        console.error("Error al obtener datos:", error);
        setClientes([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const getTipoDeCambio = (monedaDePago, CC) => {
    // Si moneda y CC son iguales, tipo de cambio es 1
    if (
      (monedaDePago === "ARS" && CC === "ARS") ||
      (monedaDePago === "USD" && CC === "USD BLUE") ||
      (monedaDePago === "USD" && CC === "USD OFICIAL")
    ) {
      return 1;
    }

    // Si hay un valor manual, usarlo
    if (tipoDeCambioManual !== null) {
      return tipoDeCambioManual;
    }

    // Casos donde moneda y CC son diferentes
    if (monedaDePago === "ARS" && CC === "USD OFICIAL") {
      return tipoDeCambio.oficial || 1;
    }
    if (monedaDePago === "ARS" && CC === "USD BLUE") {
      return tipoDeCambio.blue || 1;
    }
    if (monedaDePago === "USD" && CC === "ARS") {
      return tipoDeCambio.blue || 1;
    }

    return 1; // Valor por defecto
  };

  const calcularMontoCC = (montoEnviado, monedaDePago, CC) => {
    const tc = getTipoDeCambio(monedaDePago, CC);

    // Si moneda y CC son iguales, montoCC = montoEnviado
    if (
      (monedaDePago === "ARS" && CC === "ARS") ||
      (monedaDePago === "USD" && CC === "USD BLUE") ||
      (monedaDePago === "USD" && CC === "USD OFICIAL")
    ) {
      return montoEnviado;
    }

    // Si moneda es ARS y CC es USD, dividir montoEnviado por tipo de cambio
    if (monedaDePago === "ARS" && (CC === "USD OFICIAL" || CC === "USD BLUE")) {
      return montoEnviado / tc;
    }

    // Si moneda es USD y CC es ARS, multiplicar montoEnviado por tipo de cambio
    if (monedaDePago === "USD" && CC === "ARS") {
      return montoEnviado * tc;
    }

    return montoEnviado;
  };

  const handleTipoDeCambioChange = (value) => {
    if (value > 0) {
      setTipoDeCambioManual(parseFloat(value));
    }

    // Recalcular montoCC cuando cambia el tipo de cambio
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

      // Si cambia moneda de pago o CC, recalcular montoCC y tipo de cambio
      if (field === "monedaDePago" || field === "CC") {
        // Resetear valor manual cuando cambian las monedas
        setTipoDeCambioManual(null);

        const newTipoDeCambio = getTipoDeCambio(
          value,
          field === "monedaDePago" ? newFormData.CC : newFormData.monedaDePago
        );

        // Actualizar tipo de cambio
        setTipoDeCambio((prev) => ({
          ...prev,
          current: newTipoDeCambio,
        }));

        // Recalcular montoCC si hay un monto enviado
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
    isLoading,
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
