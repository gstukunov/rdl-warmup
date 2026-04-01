import axios, { AxiosInstance, AxiosError } from 'axios';
import { initData } from '@telegram-apps/sdk';
import type { ApiResponse } from '../types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    const baseURL = import.meta.env.VITE_API_URL || '/api/webapp';
    
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    // Request interceptor to add auth header
    this.client.interceptors.request.use(
      (config) => {
        // Get initData from Telegram WebApp
        const initDataRaw = this.getInitData();
        if (initDataRaw) {
          config.headers['X-Telegram-Init-Data'] = initDataRaw;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiResponse<unknown>>) => {
        console.error('API Error:', error.response?.data?.error || error.message);
        return Promise.reject(error);
      }
    );
  }

  private getInitData(): string {
    // In development, use mock init data
    if (import.meta.env.DEV) {
      return this.getMockInitData();
    }

    // In production, get from Telegram SDK
    try {
      return initData.raw() || '';
    } catch {
      return '';
    }
  }

  private getMockInitData(): string {
    // Mock initData for development
    // Format: user={...}&auth_date=...&hash=...
    const mockUser = {
      id: 123456789,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
      language_code: 'en',
    };
    
    const params = new URLSearchParams();
    params.set('user', JSON.stringify(mockUser));
    params.set('auth_date', Math.floor(Date.now() / 1000).toString());
    params.set('hash', 'mock_hash_for_development');
    
    return params.toString();
  }

  async get<T>(url: string): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Request failed');
    }
    return response.data.data as T;
  }

  async post<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Request failed');
    }
    return response.data.data as T;
  }

  async patch<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.patch<ApiResponse<T>>(url, data);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Request failed');
    }
    return response.data.data as T;
  }
}

export const apiClient = new ApiClient();
