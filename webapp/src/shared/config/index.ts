// Shared configuration
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_URL || '/api',
  isDev: import.meta.env.DEV,
};
