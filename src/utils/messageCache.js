const getMessageKey = (message) => {
  const id = message?._id || message?.id;
  if (id) {
    return String(id);
  }
  const conversationId = message?.conversationId || message?.id_conversacion;
  return `${conversationId}-${message?.createdAt || message?.fecha || ""}`;
};

const getMessageTimestamp = (message) => {
  const candidate = message?.createdAt || message?.fecha;
  if (!candidate) return null;
  return new Date(candidate).getTime();
};

const filterUniqueMessages = (existing = [], incoming = []) => {
  const seen = new Set(existing.map(getMessageKey));
  return incoming.filter((message) => {
    const key = getMessageKey(message);
    if (!key || !seen.has(key)) {
      seen.add(key);
      return true;
    }
    return false;
  });
};

const resolveLatestCursor = (items = []) => {
  if (!items.length) return null;
  const newest = items.reduce((selected, candidate) => {
    if (!selected) return candidate;
    const selectedTime = getMessageTimestamp(selected) ?? 0;
    const candidateTime = getMessageTimestamp(candidate) ?? 0;
    if (candidateTime > selectedTime) return candidate;
    if (
      candidateTime === selectedTime &&
      candidate &&
      selected &&
      (candidate._id || candidate.id) &&
      (selected._id || selected.id)
    ) {
      return String(candidate._id || candidate.id) > String(selected._id || selected.id)
        ? candidate
        : selected;
    }
    return selected;
  }, null);
  if (!newest) return null;
  return { createdAt: newest.createdAt || newest.fecha, _id: newest._id || newest.id };
};

export { getMessageKey, filterUniqueMessages, resolveLatestCursor };
