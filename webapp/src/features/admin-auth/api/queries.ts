import { useMutation } from '@tanstack/react-query';
import { adminApi } from '@/entities/admin';

// Admin login mutation
export const useAdminLogin = () => {
  return useMutation({
    mutationFn: (password: string) => adminApi.login(password),
  });
};

// Admin logout (just clears token, no API call needed)
export const useAdminLogout = () => {
  return () => adminApi.clearToken();
};
