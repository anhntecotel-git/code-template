/**
 * Axios API Configuration
 * Centralized HTTP client setup with interceptors
 * Handles authentication, error handling, request/response transformation
 * 
 * Usage:
 * import apiClient from '@/common/config/api.config'
 * const response = await apiClient.get('/endpoint')
 */

import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { envConfig } from './env.config';
import { API_ENDPOINTS } from './routes.config';

/**
 * API Response Type (matches backend ApiResponse<T>)
 */
export interface ApiResponse<T = any> {
  success: boolean;
  code: string;
  message: string;
  data: T;
  errors?: Record<string, any>;
  timestamp: string;
}

/**
 * API Error Response Type
 */
export interface ApiErrorResponse {
  success: false;
  code: string;
  message: string;
  errors?: Record<string, string[]>;
  timestamp: string;
}

/**
 * Create Axios instance with default configuration
 */
const createApiClient = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: envConfig.API_URL,
    timeout: envConfig.API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  return instance;
};

/**
 * Initialize API client
 */
const apiClient = createApiClient();

/**
 * ============================================
 * REQUEST INTERCEPTORS
 * ============================================
 */

/**
 * Add authorization token to requests
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage
    const token = localStorage.getItem('authToken');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request in development mode
    if (envConfig.ENVIRONMENT === 'development') {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

/**
 * ============================================
 * RESPONSE INTERCEPTORS
 * ============================================
 */

/**
 * Handle successful responses
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    // Log response in development mode
    if (envConfig.ENVIRONMENT === 'development') {
      console.log(
        `[API Response] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`,
        response.data
      );
    }

    return response;
  },
  (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401) {
      // Prevent infinite loop
      if (!originalRequest._retry) {
        originalRequest._retry = true;

        // Try to refresh token
        const refreshToken = localStorage.getItem('refreshToken');

        if (refreshToken) {
          return refreshTokenAndRetry(originalRequest, refreshToken);
        } else {
          // No refresh token available, redirect to login
          handleUnauthorized();
          return Promise.reject(error);
        }
      }

      // Already retried once, reject
      handleUnauthorized();
      return Promise.reject(error);
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      handleForbidden();
      return Promise.reject(error);
    }

    // Handle 404 Not Found
    if (error.response?.status === 404) {
      console.warn('[API Error] Resource not found', {
        url: error.config?.url,
        status: error.response.status,
      });
    }

    // Handle network errors
    if (!error.response) {
      console.error('[API Network Error]', error.message);
      // Could show a global network error notification here
    }

    // Log error details
    if (envConfig.ENVIRONMENT === 'development') {
      console.error('[API Error Response]', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
      });
    }

    return Promise.reject(error);
  }
);

/**
 * ============================================
 * HELPER FUNCTIONS
 * ============================================
 */

/**
 * Refresh token and retry original request
 */
const refreshTokenAndRetry = async (
  originalRequest: InternalAxiosRequestConfig,
  refreshToken: string
) => {
  try {
    const response = await axios.post<ApiResponse<{ accessToken: string }>>(
      `${envConfig.API_URL}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`,
      { refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const newAccessToken = response.data.data.accessToken;

    // Save new token
    localStorage.setItem('authToken', newAccessToken);

    // Update original request with new token
    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

    // Retry original request
    return apiClient(originalRequest);
  } catch (refreshError) {
    console.error('[Token Refresh Error]', refreshError);
    handleUnauthorized();
    return Promise.reject(refreshError);
  }
};

/**
 * Handle unauthorized access (redirect to login)
 */
const handleUnauthorized = () => {
  // Clear auth data
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');

  // Dispatch event or redirect
  window.dispatchEvent(new CustomEvent('unauthorized'));

  // Redirect to login
  if (typeof window !== 'undefined') {
    window.location.href = '/auth/login';
  }
};

/**
 * Handle forbidden access
 */
const handleForbidden = () => {
  window.dispatchEvent(new CustomEvent('forbidden'));

  if (typeof window !== 'undefined') {
    window.location.href = '/403';
  }
};

/**
 * ============================================
 * API METHODS (Optional convenience methods)
 * ============================================
 */

/**
 * Typed GET request
 */
export const apiGet = async <T = any>(
  url: string,
  config?: any
): Promise<ApiResponse<T>> => {
  const response = await apiClient.get<ApiResponse<T>>(url, config);
  return response.data;
};

/**
 * Typed POST request
 */
export const apiPost = async <T = any>(
  url: string,
  data?: any,
  config?: any
): Promise<ApiResponse<T>> => {
  const response = await apiClient.post<ApiResponse<T>>(url, data, config);
  return response.data;
};

/**
 * Typed PUT request
 */
export const apiPut = async <T = any>(
  url: string,
  data?: any,
  config?: any
): Promise<ApiResponse<T>> => {
  const response = await apiClient.put<ApiResponse<T>>(url, data, config);
  return response.data;
};

/**
 * Typed DELETE request
 */
export const apiDelete = async <T = any>(
  url: string,
  config?: any
): Promise<ApiResponse<T>> => {
  const response = await apiClient.delete<ApiResponse<T>>(url, config);
  return response.data;
};

/**
 * Typed PATCH request
 */
export const apiPatch = async <T = any>(
  url: string,
  data?: any,
  config?: any
): Promise<ApiResponse<T>> => {
  const response = await apiClient.patch<ApiResponse<T>>(url, data, config);
  return response.data;
};

/**
 * ============================================
 * ERROR HANDLER UTILITY
 * ============================================
 */

/**
 * Extract error message from API response
 */
export const getErrorMessage = (error: any): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiErrorResponse;

    if (apiError?.message) {
      return apiError.message;
    }

    if (apiError?.errors) {
      const firstError = Object.values(apiError.errors)[0];
      return Array.isArray(firstError) ? firstError[0] : String(firstError);
    }

    return error.message || 'An error occurred';
  }

  return String(error);
};

/**
 * Get field-specific error messages
 */
export const getFieldErrors = (
  error: any
): Record<string, string | string[]> => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiErrorResponse;
    return apiError?.errors || {};
  }

  return {};
};

export default apiClient;
