// Servicio de conversaciones (mock)
// Centraliza todas las llamadas al backend relacionadas a conversaciones y mensajes

const artificialDelay = (ms = 300) => new Promise((res) => setTimeout(res, ms));

// Datos mockeados
let mockConversations = [
  {
    id: "c1",
    userId: "@5491111111111@whatsapp.com",
    displayName: "Juan Perez",
    lastMessage: "Hola! ¿Cómo va?",
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "c2",
    userId: "@5492222222222@whatsapp.com",
    displayName: "María",
    lastMessage: "Te mandé el comprobante",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: "c3",
    userId: "@Lid",
    displayName: "Cliente Lid",
    lastMessage: "¿Tienen stock?",
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
];

let mockMessagesByConversation = {
  c1: [
    {
      id: "m1",
      conversationId: "c1",
      emisor: "@5491111111111@whatsapp.com",
      receptor: "X",
      flowData: {},
      mensaje: "Hola! ¿Cómo va?",
      urlImagen:
        "https://storage.googleapis.com/factudata-3afdf.appspot.com/comprobantes-prueba/5493424421565%40s.whatsapp.net/2025-06-06/817151.jpeg?GoogleAccessId=firebase-adminsdk-xts1d%40factudata-3afdf.iam.gserviceaccount.com&Expires=16447017600&Signature=vwqFrH6l%2BtLVaGOQY1Iiaz2ZkoenjurAgs1dTsybTsuC0SoaFez6O4bJz69qWW4JJr7QxZKmQRlMoPu6GZoeKl0nPjvBllHZmwFqqyfq4o1emEQP2va7P6svlKvyXm1b5PbuSkzx37xjfEa1b%2FluvxhZNLA6%2BAdroIM9%2BY2vHKFXFnAo9vOFB16C2WkIpef516adkWfPOaKGu4rCcX3qrXgvVU1s2CvENhx4mluICF0yJJky8sOC7YSyq2flaMfW3f91TA5UG7UD1vVkFS%2FS7GiG7CLCNEeOBoG4Rle8Ayw03Qq7XnhKSRf%2BZWBnSEYHah8tUkS5MXsa0MzXt3r7sA%3D%3D",
      fechaMensaje: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    },
    {
      id: "m2",
      conversationId: "c1",
      emisor: "X",
      receptor: "@5491111111111@whatsapp.com",
      flowData: {},
      mensaje: "Todo bien, ¿y vos?",
      fechaMensaje: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
  ],
  c2: [
    {
      id: "m3",
      conversationId: "c2",
      emisor: "@5492222222222@whatsapp.com",
      receptor: "X",
      flowData: {},
      mensaje: "Te mandé el comprobante",
      fechaMensaje: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
    },
  ],
  c3: [
    {
      id: "m4",
      conversationId: "c3",
      emisor: "@Lid",
      receptor: "X",
      flowData: {},
      mensaje: "¿Tienen stock?",
      fechaMensaje: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    },
  ],
};

function getTextFromMessage(message) {
  if (!message) return "";
  if (typeof message.mensaje === "string") return message.mensaje;
  return "";
}

export async function fetchConversations() {
  await artificialDelay(250);
  // Orden por updatedAt desc
  const sorted = [...mockConversations].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );
  return sorted;
}

export async function fetchMessages(conversationId) {
  await artificialDelay(200);
  const list = mockMessagesByConversation[conversationId] || [];
  return [...list].sort((a, b) => new Date(a.fechaMensaje) - new Date(b.fechaMensaje));
}

export async function sendMessage({ conversationId, text, myNumber = "X" }) {
  await artificialDelay(150);
  if (!conversationId || !text) return;
  const newMessage = {
    id: `m_${Date.now()}`,
    conversationId,
    emisor: myNumber,
    receptor: (mockConversations.find((c) => c.id === conversationId) || {}).userId,
    flowData: {},
    mensaje: text,
    fechaMensaje: new Date().toISOString(),
  };

  if (!mockMessagesByConversation[conversationId]) {
    mockMessagesByConversation[conversationId] = [];
  }
  mockMessagesByConversation[conversationId].push(newMessage);

  // Actualiza la conversación
  const convIndex = mockConversations.findIndex((c) => c.id === conversationId);
  if (convIndex >= 0) {
    mockConversations[convIndex] = {
      ...mockConversations[convIndex],
      lastMessage: text,
      updatedAt: newMessage.fechaMensaje,
    };
  }

  return newMessage;
}

export async function searchConversations(query) {
  await artificialDelay(150);
  const q = (query || "").toLowerCase();
  if (!q) return fetchConversations();
  return mockConversations.filter((c) => {
    return (
      c.displayName.toLowerCase().includes(q) ||
      c.userId.toLowerCase().includes(q) ||
      (c.lastMessage || "").toLowerCase().includes(q)
    );
  });
}

export function getMessagePreview(message) {
  return getTextFromMessage(message);
}

export function getConversationTitle(conversation) {
  return conversation.displayName || conversation.userId || "";
}
