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
  const textoProgreso = useMemo(
    () => `${resueltos}/${totalElegibles}`,
    [resueltos, totalElegibles]
  );

  const resetState = useCallback(() => {
    setActiva(false);
    setIndiceActual(0);
    setResueltos(0);
    setElegibles([]);
    elegiblesRef.current = [];
    indiceRef.current = 0;
    resueltosRef.current = 0;
  }, []);

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

    const firstId = lista[0];
    const firstRow = findRowById(itemsRef.current, firstId);
    return firstRow;
  },
    [resetState]
  );

  const detener = useCallback(() => {
    resetState();
  }, [resetState]);

  const avanzar = useCallback(() => {
    if (!activa) return null;

    const nextResolved = resueltosRef.current + 1;
    setResueltos(nextResolved);
    resueltosRef.current = nextResolved;

    let nextIndex = indiceRef.current + 1;
    let nextRow = null;

    while (nextIndex < elegiblesRef.current.length && !nextRow) {
      const id = elegiblesRef.current[nextIndex];
      const row = findRowById(itemsRef.current, id);
      if (row && esElegible(row)) {
        nextRow = row;
      } else {
        nextIndex += 1;
      }
    }

    if (!nextRow) {
      detener();
      return null;
    }

    setIndiceActual(nextIndex);
    indiceRef.current = nextIndex;
    return nextRow;
  }, [activa, detener, items]);

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
  };
};

export default useCorreccionAsistida;
