import { adminApi } from '@/entities/admin';

export const adminAuthApi = {
  login: adminApi.login,
  logout: adminApi.clearToken,
  getToken: adminApi.getToken,
  isAuthenticated: adminApi.isAuthenticated,
};
