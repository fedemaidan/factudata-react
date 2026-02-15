import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

const buildElegibles = (items) =>
  Array.isArray(items) ? items.filter(esElegible).map((row) => row?._id).filter(Boolean) : [];

const findRowById = (items, id) =>
  Array.isArray(items) ? items.find((row) => row?._id === id) : null;

const useCorreccionAsistida = (items = []) => {
  const [activa, setActiva] = useState(false);
  const [indiceActual, setIndiceActual] = useState(0);
  const [resueltos, setResueltos] = useState(0);
  const [elegibles, setElegibles] = useState([]);
  const [rowActual, setRowActual] = useState(null);
  const elegiblesRef = useRef([]);
  const indiceRef = useRef(0);
  const resueltosRef = useRef(0);
  const itemsRef = useRef(Array.isArray(items) ? items : []);

  useEffect(() => {
    if (activa && elegiblesRef.current.length > 0) {
      return;
    }
    itemsRef.current = Array.isArray(items) ? items : [];
  }, [activa, items]);

  const totalElegibles = elegibles.length;
  const textoProgreso = useMemo(() => {
    const current = totalElegibles ? Math.min(indiceActual + 1, totalElegibles) : 0;
    return `Caso ${current}/${totalElegibles} (resueltos ${resueltos})`;
  }, [resueltos, totalElegibles, indiceActual]);

  const resetState = useCallback(() => {
    setActiva(false);
    setIndiceActual(0);
    setResueltos(0);
    setElegibles([]);
    setRowActual(null);
    elegiblesRef.current = [];
    indiceRef.current = 0;
    resueltosRef.current = 0;
  }, []);

  const getRowByIndex = useCallback(
    (index) => {
      if (index < 0 || index >= elegiblesRef.current.length) return null;
      const id = elegiblesRef.current[index];
      const row = findRowById(itemsRef.current, id);
      return row && esElegible(row) ? row : null;
    },
    []
  );

  const iniciar = useCallback(
    (overrideItems) => {
      const targetItems = Array.isArray(overrideItems) ? overrideItems : itemsRef.current;
      itemsRef.current = Array.isArray(targetItems) ? targetItems : [];
      const lista = buildElegibles(itemsRef.current);
      if (lista.length === 0) {
        resetState();
        return null;
      }

      setActiva(true);
      setIndiceActual(0);
      setResueltos(0);
      setElegibles(lista);
      elegiblesRef.current = lista;
      indiceRef.current = 0;
      resueltosRef.current = 0;

      const firstRow = getRowByIndex(0);
      setRowActual(firstRow);
      return firstRow;
    },
    [getRowByIndex, resetState]
  );

  const detener = useCallback(() => {
    resetState();
  }, [resetState]);

  const confirmarActual = useCallback(() => {
    if (!activa) return;
    const nextResolved = resueltosRef.current + 1;
    setResueltos(nextResolved);
    resueltosRef.current = nextResolved;
  }, [activa]);

  const irAIndice = useCallback(
    (index) => {
      if (!activa) return null;
      const row = getRowByIndex(index);
      if (!row) return null;

      setIndiceActual(index);
      indiceRef.current = index;
      setRowActual(row);
      return row;
    },
    [activa, getRowByIndex]
  );

  const irSiguiente = useCallback(() => {
    const nextIndex = indiceRef.current + 1;
    return irAIndice(nextIndex);
  }, [irAIndice]);

  const irAnterior = useCallback(() => {
    const prevIndex = indiceRef.current - 1;
    return irAIndice(prevIndex);
  }, [irAIndice]);

  const confirmarYAvanzar = useCallback(() => {
    if (!activa) return null;
    confirmarActual();
    const nextRow = irSiguiente();
    if (!nextRow) {
      detener();
    }
    return nextRow;
  }, [activa, confirmarActual, irSiguiente, detener]);

  const avanzar = useCallback(() => confirmarYAvanzar(), [confirmarYAvanzar]);

  const hasPrev = activa && indiceActual > 0;
  const hasNext = activa && indiceActual < elegibles.length - 1;

  const determinarTipoModal = useCallback((row) => {
    if (esHorasExcel(row)) return null;
    if (esDuplicado(row)) return "duplicado";
    if (esLicenciaError(row)) return "licencia";
    if (esParteIncompleto(row)) return "parte_incompleto";
    if (esParteError(row)) return "parte_error";
    return null;
  }, []);

  return {
    activa,
    indiceActual,
    totalElegibles,
    textoProgreso,
    iniciar,
    avanzar,
    detener,
    determinarTipoModal,
    actualRow: rowActual,
    hasPrev,
    hasNext,
    irAnterior,
    irSiguiente,
    confirmarYAvanzar,
  };
};

export default useCorreccionAsistida;
