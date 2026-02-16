export const runtimeConfig = {
  useMockData: process.env.EXPO_PUBLIC_USE_MOCK !== 'false',
  defaultChatWsUrl: process.env.EXPO_PUBLIC_CHAT_WS_URL?.replace(/\/$/, ''),
};
