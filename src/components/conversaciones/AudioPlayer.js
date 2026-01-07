import { useState, useRef, useEffect, useMemo } from "react";
import { Box, IconButton, Slider, Typography } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import MicIcon from "@mui/icons-material/Mic";

// Helper to check if src is a valid audio URL (not an internal event identifier)
const isValidAudioUrl = (src) => {
  if (!src || typeof src !== "string") return false;
  // Internal event identifiers start with _event_
  if (src.startsWith("_event_")) return false;
  // Check if it looks like a URL (http, https, data:, blob:, or /)
  return src.startsWith("http") || src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("/");
};

export default function AudioPlayer({ src, duration, isMine }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [actualDuration, setActualDuration] = useState(duration || 0);
  const audioRef = useRef(null);

  // Check if src is a valid audio URL
  const isValidSrc = useMemo(() => isValidAudioUrl(src), [src]);

  // Reset state when src changes
  useEffect(() => {
    setError(false);
    setIsLoaded(false);
    setIsPlaying(false);
    setCurrentTime(0);
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setIsLoaded(true);
      setActualDuration(audio.duration);
      setError(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e) => {
      setError(true);
      setIsPlaying(false);
      console.error("Error loading audio:", src, e);
    };

    const handleCanPlay = () => {
      setError(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (event, newValue) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = (newValue / 100) * audio.duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = isLoaded && actualDuration > 0 ? (currentTime / actualDuration) * 100 : 0;

  // If src is not a valid audio URL (e.g., internal event identifier), show unavailable state
  if (!isValidSrc) {
    return (
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        p={1}
        minWidth={200}
        maxWidth={280}
        sx={{
          bgcolor: isMine ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
          borderRadius: 2,
        }}
      >
        <MicIcon sx={{ fontSize: 20, color: "text.secondary" }} />
        <Typography variant="caption" color="text.secondary">
          Nota de voz (no disponible)
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        p={1}
        minWidth={200}
        maxWidth={280}
        sx={{
          bgcolor: isMine ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
          borderRadius: 2,
        }}
      >
        <Typography variant="caption" color="error">
          Error al cargar audio
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      alignItems="center"
      gap={1}
      p={1}
      minWidth={200}
      maxWidth={280}
      sx={{
        bgcolor: isMine ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
        borderRadius: 2,
      }}
    >
      <audio ref={audioRef} src={src} preload="metadata" controls={false} />

      <IconButton
        onClick={togglePlayPause}
        size="small"
        sx={{
          color: isMine ? "#fff" : "primary.main",
          bgcolor: isMine ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
          "&:hover": {
            bgcolor: isMine ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.2)",
          },
        }}
      >
        {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
      </IconButton>

      <Box flex={1} minWidth={0}>
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <VolumeUpIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          <Typography variant="caption" color="text.secondary">
            {formatTime(currentTime)} / {formatTime(actualDuration)}
          </Typography>
        </Box>

        <Slider
          value={progress}
          onChange={handleSeek}
          size="small"
          sx={{
            color: isMine ? "#fff" : "primary.main",
            "& .MuiSlider-thumb": {
              width: 12,
              height: 12,
            },
            "& .MuiSlider-track": {
              height: 2,
            },
            "& .MuiSlider-rail": {
              height: 2,
              opacity: 0.3,
            },
          }}
        />
      </Box>
    </Box>
  );
}
