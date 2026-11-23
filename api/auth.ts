import apiClient from './client';
import { useAuthStore } from '../store/authStore';

export interface AuthResponse {
  access: string;
  refresh: string;
  user: {
    id: number | string;
    email: string;
    first_name: string;
    last_name: string;
    [key: string]: unknown;
  };
}

/** POST /api/auth/login/ */
export async function loginParent(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/api/auth/login/', {
    email,
    password,
  });
  return response.data;
}

/** POST /api/auth/logout/ — sends the refresh token in the body */
export async function logoutParent(): Promise<void> {
  const { refreshToken } = useAuthStore.getState();
  await apiClient.post('/api/auth/logout/', { refresh: refreshToken });
}

/** POST /api/auth/token/refresh/ */
export async function refreshAccessToken(
  refresh: string,
): Promise<{ access: string }> {
  const response = await apiClient.post<{ access: string }>(
    '/api/auth/token/refresh/',
    { refresh },
  );
  return response.data;
}
