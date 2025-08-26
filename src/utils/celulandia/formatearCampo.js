import React from "react";
import { Chip } from "@mui/material";
import { formatCurrency } from "src/utils/formatters"; // Comentado para usar función propia

// Función auxiliar para aplicar estilo tachado si el item no está activo
const aplicarEstiloTachado = (valor, item) => {
  if (item && item.active === false) {
    return <span style={{ textDecoration: "line-through" }}>{valor}</span>;
  }
  return valor;
};

export const formatearCampo = (campo, valor, item = null) => {
  if (valor === undefined || valor === null) return "-";

  switch (campo) {
    case "fecha":
      const fechaFormateada = new Date(valor).toLocaleDateString("es-AR");
      return aplicarEstiloTachado(fechaFormateada, item);

    case "hora":
      let horaFormateada;
      if (valor && typeof valor === "string") {
        const horaParts = valor.split(":");
        if (horaParts.length >= 2) {
          horaFormateada = `${horaParts[0]}:${horaParts[1]}`;
        } else {
          horaFormateada = valor;
        }
      } else {
        horaFormateada = valor;
      }
      return aplicarEstiloTachado(horaFormateada, item);

    case "montoEnviado":
      const montoEnviadoFormateado = formatCurrency(valor);
      return aplicarEstiloTachado(montoEnviadoFormateado, item);

    case "montoCC":
      const montoCCFormateado = formatCurrency(valor);
      return aplicarEstiloTachado(montoCCFormateado, item);

    case "tipoDeCambio":
      const tipoCambioFormateado = formatCurrency(valor);
      return aplicarEstiloTachado(tipoCambioFormateado, item);

    case "cuentaDestino": {
      const cuentaStyles = {
        "ENSHOP SRL": {
          backgroundColor: "#E8EAF6",
          color: "#3F51B5",
        },
        "ASOCIACION CONSULTORA MUTUAL": {
          backgroundColor: "#F3E5F5",
          color: "#7B1FA2",
        },
        EZE: {
          backgroundColor: "#E0F7FA",
          color: "#006064",
        },
        NICO: {
          backgroundColor: "#FFF8E1",
          color: "#FF6F00",
        },
        CHEQUE: {
          backgroundColor: "#FFFDE7",
          color: "#F57F17",
        },
        ECHEQ: {
          backgroundColor: "#F1F8E9",
          color: "#2E7D32",
        },
        EFECTIVO: {
          backgroundColor: "#E8F5E9",
          color: "#1B5E20",
        },
      };
      const cuentaStyle = cuentaStyles[valor] || {
        backgroundColor: "#F3E5F5",
        color: "#7B1FA2",
      };
      const chip = (
        <Chip
          label={valor}
          size="small"
          sx={{
            backgroundColor: cuentaStyle.backgroundColor,
            color: cuentaStyle.color,
            fontWeight: "bold",
            fontSize: "0.75rem",
            height: "24px",
            "& .MuiChip-label": {
              fontWeight: "bold",
            },
          }}
        />
      );
      return aplicarEstiloTachado(chip, item);
    }

    case "monedaDePago": {
      const monedaStyles = {
        ARS: {
          backgroundColor: "#E3F2FD",
          color: "#1565C0",
        },
        USD: {
          backgroundColor: "#C8E6C9",
          color: "#33691E",
        },
      };
      const monedaStyle = monedaStyles[valor] || {
        backgroundColor: "#F5F5F5",
        color: "#424242",
      };
      const chip = (
        <Chip
          label={valor}
          size="small"
          sx={{
            backgroundColor: monedaStyle.backgroundColor,
            color: monedaStyle.color,
            fontWeight: "bold",
            fontSize: "0.75rem",
            height: "24px",
            "& .MuiChip-label": {
              fontWeight: "bold",
            },
          }}
        />
      );
      return aplicarEstiloTachado(chip, item);
    }

    case "CC": {
      const ccStyles = {
        ARS: {
          backgroundColor: "#E3F2FD",
          color: "#1565C0",
        },
        "USD BLUE": {
          backgroundColor: "#aadcac",
          color: "#1B5E20",
        },
        "USD OFICIAL": {
          backgroundColor: "#C8E6C9",
          color: "#33691E",
        },
      };
      const ccStyle = ccStyles[valor] || {
        backgroundColor: "#F5F5F5",
        color: "#424242",
      };
      const chip = (
        <Chip
          label={valor}
          size="small"
          sx={{
            backgroundColor: ccStyle.backgroundColor,
            color: ccStyle.color,
            fontWeight: "bold",
            fontSize: "0.75rem",
            height: "24px",
            "& .MuiChip-label": {
              fontWeight: "bold",
            },
          }}
        />
      );
      return aplicarEstiloTachado(chip, item);
    }

    case "ccActivas": {
      const ccStyles = {
        ARS: {
          backgroundColor: "#E3F2FD",
          color: "#1565C0",
        },
        "USD BLUE": {
          backgroundColor: "#aadcac",
          color: "#1B5E20",
        },
        "USD OFICIAL": {
          backgroundColor: "#C8E6C9",
          color: "#33691E",
        },
      };

      if (Array.isArray(valor)) {
        const ccOrdenadas = [...valor].sort();
        const chips = (
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {ccOrdenadas.map((cc, index) => {
              const ccStyle = ccStyles[cc] || {
                backgroundColor: "#F5F5F5",
                color: "#424242",
              };
              return (
                <Chip
                  key={index}
                  label={cc}
                  size="small"
                  sx={{
                    backgroundColor: ccStyle.backgroundColor,
                    color: ccStyle.color,
                    fontWeight: "bold",
                    fontSize: "0.7rem",
                    height: "20px",
                    "& .MuiChip-label": {
                      fontWeight: "bold",
                    },
                  }}
                />
              );
            })}
          </div>
        );
        return aplicarEstiloTachado(chips, item);
      }
      return aplicarEstiloTachado(valor, item);
    }

    case "estado": {
      const estadoStyles = {
        CONFIRMADO: {
          backgroundColor: "#E8F5E8",
          color: "#2E7D32",
        },
      };
      const estadoStyle = estadoStyles[valor] || {
        backgroundColor: "#FFF3E0",
        color: "#E65100",
      };
      const chip = (
        <Chip
          label={valor}
          size="small"
          sx={{
            backgroundColor: estadoStyle.backgroundColor,
            color: estadoStyle.color,
            fontWeight: "bold",
            fontSize: "0.75rem",
            height: "24px",
            "& .MuiChip-label": {
              fontWeight: "bold",
            },
          }}
        />
      );
      return aplicarEstiloTachado(chip, item);
    }

    case "imagen":
      const imagenFormateada = valor ? "Ver imagen" : "-";
      return aplicarEstiloTachado(imagenFormateada, item);

    default:
      return aplicarEstiloTachado(valor, item);
  }
};
