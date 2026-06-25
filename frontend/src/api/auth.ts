import type { User } from '../types';
import { api, request } from './client';

interface AuthResponse {
  user: User;
}

export const authApi = {
  register: (input: { name: string; email: string; password: string }) =>
    request<AuthResponse>(api.post('/auth/register', input)).then((r) => r.user),

  login: (input: { email: string; password: string }) =>
    request<AuthResponse>(api.post('/auth/login', input)).then((r) => r.user),

  logout: () => request<{ message: string }>(api.post('/auth/logout')),

  me: () => request<AuthResponse>(api.get('/auth/me')).then((r) => r.user),
};
