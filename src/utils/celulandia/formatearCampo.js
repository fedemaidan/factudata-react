import React from "react";
import { Chip } from "@mui/material";
import { formatCurrency } from "src/utils/formatters"; // Comentado para usar función propia

export const formatearCampo = (campo, valor) => {
  if (valor === undefined || valor === null) return "-";

  switch (campo) {
    case "fecha":
      return new Date(valor).toLocaleDateString("es-AR");

    case "hora":
      if (valor && typeof valor === "string") {
        const horaParts = valor.split(":");
        if (horaParts.length >= 2) {
          return `${horaParts[0]}:${horaParts[1]}`;
        }
      }
      return valor;

    case "montoEnviado":
      return formatCurrency(valor);

    case "montoCC":
      return formatCurrency(valor);

    case "tipoDeCambio":
      return formatCurrency(valor);

    case "cuentaDestino": {
      const cuentaStyles = {
        "ENSHOP SRL": {
          backgroundColor: "#E8EAF6",
          color: "#3F51B5",
        },
        "ASOCIACION CULTURA MUTUAL": {
          backgroundColor: "#F3E5F5",
          color: "#7B1FA2",
        },
      };
      const cuentaStyle = cuentaStyles[valor] || {
        backgroundColor: "#F3E5F5",
        color: "#7B1FA2",
      };
      return (
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
      return (
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
      return (
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
        return (
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
      }
      return valor;
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
      return (
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
    }

    case "imagen":
      return valor ? "Ver imagen" : "-";

    default:
      return valor;
  }
};
