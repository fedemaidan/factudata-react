import useAssistedCorrectionFlow from "src/hooks/common/useAssistedCorrectionFlow";

const normalizarTexto = (value) => String(value || "").toLowerCase().trim();

const esDuplicado = (row) => row?.status === "duplicado";

const esHorasExcel = (row) => normalizarTexto(row?.tipo) === "horas";

const esLicenciaError = (row) => {
  const tipo = normalizarTexto(row?.tipo);
  return tipo === "licencia" && row?.status === "error" && Boolean(row?.url_storage);
};

const esParteIncompleto = (row) => {
  const tipo = normalizarTexto(row?.tipo);
  return tipo === "parte" && row?.status === "incompleto" && Boolean(row?.url_storage);
};

const esParteError = (row) => {
  const tipo = normalizarTexto(row?.tipo);
  return tipo === "parte" && row?.status === "error" && Boolean(row?.url_storage);
};

const esElegible = (row) =>
  Boolean(row) &&
  !esHorasExcel(row) &&
  (esDuplicado(row) || esLicenciaError(row) || esParteIncompleto(row) || esParteError(row));

const getRowId = (row) => row?._id ?? null;

const getModalType = (row) => {
  if (esHorasExcel(row)) return null;
  if (esDuplicado(row)) return "duplicado";
  if (esLicenciaError(row)) return "licencia";
  if (esParteIncompleto(row)) return "parte_incompleto";
  if (esParteError(row)) return "parte_error";
  return null;
};

const dhnStrategies = {
  getRowId,
  isEligible: esElegible,
  getModalType,
};

const useCorreccionAsistida = (items = []) => {
  return useAssistedCorrectionFlow(items, dhnStrategies);
};

export default useCorreccionAsistida;
