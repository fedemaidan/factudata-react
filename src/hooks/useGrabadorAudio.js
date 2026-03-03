import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook para grabar audio desde el micrófono del navegador.
 * Usa MediaRecorder API — compatible con Chrome, Safari, Firefox mobile.
 * Pensado para que el SDR grabe llamadas en manos libres desde el celular.
 * 
 * @returns {object} - { estado, duracion, iniciar, pausar, reanudar, detener, audioBlob, error, limpiar }
 * 
 * Estados: 'inactivo' | 'grabando' | 'pausado' | 'detenido'
 */
const useGrabadorAudio = () => {
    const [estado, setEstado] = useState('inactivo'); // inactivo | grabando | pausado | detenido
    const [duracion, setDuracion] = useState(0);      // segundos
    const [audioBlob, setAudioBlob] = useState(null);
    const [error, setError] = useState(null);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const streamRef = useRef(null);
    const timerRef = useRef(null);
    const startTimeRef = useRef(null);
    const pausedDurationRef = useRef(0);

    // Limpiar al desmontar
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const iniciarTimer = useCallback(() => {
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
            const elapsed = (Date.now() - startTimeRef.current) / 1000 + pausedDurationRef.current;
            setDuracion(Math.floor(elapsed));
        }, 500);
    }, []);

    const pausarTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        pausedDurationRef.current += (Date.now() - startTimeRef.current) / 1000;
    }, []);

    const iniciar = useCallback(async () => {
        try {
            setError(null);
            setAudioBlob(null);
            chunksRef.current = [];
            pausedDurationRef.current = 0;
            setDuracion(0);

            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });
            streamRef.current = stream;

            // Elegir el mejor formato soportado
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm') 
                    ? 'audio/webm'
                    : MediaRecorder.isTypeSupported('audio/mp4')
                        ? 'audio/mp4'
                        : '';

            const options = mimeType ? { mimeType } : {};
            const recorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { 
                    type: mimeType || 'audio/webm' 
                });
                setAudioBlob(blob);
                setEstado('detenido');

                // Liberar micrófono
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
            };

            recorder.onerror = (e) => {
                console.error('Error en MediaRecorder:', e);
                setError('Error durante la grabación');
                setEstado('inactivo');
            };

            // Grabar en chunks de 1 segundo para no perder data
            recorder.start(1000);
            setEstado('grabando');
            iniciarTimer();

        } catch (err) {
            console.error('Error accediendo al micrófono:', err);
            if (err.name === 'NotAllowedError') {
                setError('Permiso de micrófono denegado. Habilitalo en la configuración del navegador.');
            } else if (err.name === 'NotFoundError') {
                setError('No se encontró un micrófono disponible.');
            } else {
                setError(`Error: ${err.message}`);
            }
            setEstado('inactivo');
        }
    }, [iniciarTimer]);

    const pausar = useCallback(() => {
        if (mediaRecorderRef.current && estado === 'grabando') {
            mediaRecorderRef.current.pause();
            setEstado('pausado');
            pausarTimer();
        }
    }, [estado, pausarTimer]);

    const reanudar = useCallback(() => {
        if (mediaRecorderRef.current && estado === 'pausado') {
            mediaRecorderRef.current.resume();
            setEstado('grabando');
            iniciarTimer();
        }
    }, [estado, iniciarTimer]);

    const detener = useCallback(() => {
        if (mediaRecorderRef.current && (estado === 'grabando' || estado === 'pausado')) {
            mediaRecorderRef.current.stop();
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            // El estado se cambia en el handler onstop
        }
    }, [estado]);

    const limpiar = useCallback(() => {
        setEstado('inactivo');
        setDuracion(0);
        setAudioBlob(null);
        setError(null);
        chunksRef.current = [];
        pausedDurationRef.current = 0;
    }, []);

    const formatearDuracion = useCallback((secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }, []);

    return {
        estado,
        duracion,
        duracionFormateada: formatearDuracion(duracion),
        audioBlob,
        error,
        iniciar,
        pausar,
        reanudar,
        detener,
        limpiar
    };
};

export default useGrabadorAudio;
