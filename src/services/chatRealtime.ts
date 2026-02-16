export interface RealtimeMessagePayload {
  id?: string;
  conversationId: string;
  senderType: 'visitor' | 'pm' | 'bot' | 'system';
  senderName: string;
  body: string;
  photoUri?: string;
  createdAt?: string;
}

export interface ChatRealtimeClient {
  close: () => void;
}

interface ConnectOptions {
  wsUrl: string;
  token: string;
  conversationId: string;
  onMessage: (payload: RealtimeMessagePayload) => void;
  onError?: (error: string) => void;
}

export const connectChatRealtime = ({
  wsUrl,
  token,
  conversationId,
  onMessage,
  onError,
}: ConnectOptions): ChatRealtimeClient => {
  const socket = new WebSocket(
    `${wsUrl.replace(/\/$/, '')}/chat?conversationId=${conversationId}&token=${token}`,
  );

  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data as string) as RealtimeMessagePayload;
      onMessage(payload);
    } catch {
      onError?.('Unable to parse incoming chat payload.');
    }
  };

  socket.onerror = () => {
    onError?.('Chat connection error.');
  };

  return {
    close: () => {
      socket.close();
    },
  };
};
