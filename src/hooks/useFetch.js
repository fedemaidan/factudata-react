import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Hook genérico para fetch/async con estados estándar.
 *
 * @param {Function} fetcher - async () => any
 * @param {Array} deps - dependencias que disparan el fetch automático
 * @param {Object} options
 * @param {boolean} [options.enabled=true] - si false, no auto-ejecuta
 * @param {any} [options.initialData=null] - data inicial
 * @param {Function} [options.select] - (result) => selectedData
 * @param {Function} [options.onSuccess] - (result) => void
 * @param {Function} [options.onError] - (error) => void
 * @param {boolean} [options.keepPreviousData=true] - si false, limpia data al iniciar
 */
export default function useFetch(fetcher, deps = [], options = {}) {
  const {
    enabled = true,
    initialData = null,
    select,
    onSuccess,
    onError,
    keepPreviousData = true,
  } = options || {};

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const selectRef = useRef(select);
  selectRef.current = select;

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const isError = useMemo(() => Boolean(error), [error]);

  const lastRequestIdRef = useRef(0);

  const run = useCallback(async () => {
    const requestId = ++lastRequestIdRef.current;
    setIsLoading(true);
    setError(null);
    if (!keepPreviousData) setData(initialData);

    try {
      const result = await fetcherRef.current();
      if (requestId !== lastRequestIdRef.current) return null;

      const nextData = typeof selectRef.current === "function"
        ? selectRef.current(result)
        : result;

      setData(nextData);
      if (typeof onSuccessRef.current === "function") onSuccessRef.current(result);
      return result;
    } catch (e) {
      if (requestId !== lastRequestIdRef.current) return null;
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      if (typeof onErrorRef.current === "function") onErrorRef.current(err);
      return null;
    } finally {
      if (requestId !== lastRequestIdRef.current) return;
      setIsLoading(false);
    }
  }, [initialData, keepPreviousData]);

  useEffect(() => {
    if (!enabled) return;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run, ...deps]);

  const refetch = useCallback(() => run(), [run]);

  return {
    data,
    setData,
    error,
    isError,
    isLoading,
    refetch,
  };
}

