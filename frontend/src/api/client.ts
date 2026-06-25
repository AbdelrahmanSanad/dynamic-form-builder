import axios, { AxiosError } from 'axios';
import type { ApiErrorBody } from '../types';

/**
 * Shared axios instance. `withCredentials` ensures the httpOnly auth cookie is
 * sent with every request and stored from responses.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  withCredentials: true,
});

/** Normalised application error surfaced to the UI. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Converts any thrown axios/network error into a typed `ApiError`. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined;
    if (body?.error) {
      return new ApiError(body.error.message, body.error.statusCode, body.error.code, body.error.details);
    }
    return new ApiError(
      error.message || 'Network error',
      error.response?.status ?? 0,
      'NETWORK_ERROR',
    );
  }
  return new ApiError('Unexpected error', 0, 'UNKNOWN');
}

/** Small helper that unwraps `response.data` and rethrows typed errors. */
export async function request<T>(promise: Promise<{ data: T }>): Promise<T> {
  try {
    const { data } = await promise;
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}
