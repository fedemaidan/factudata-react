import { useCallback, useEffect } from "react";

export function useMessageScroll({
  highlightedMessageId,
  onHighlightedMessageIdCleared,
}) {
  // Auto-clear highlight después de 5 segundos
  useEffect(() => {
    if (!highlightedMessageId) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      onHighlightedMessageIdCleared?.();
    }, 5000);

    return () => clearTimeout(timeout);
  }, [highlightedMessageId, onHighlightedMessageIdCleared]);
}

