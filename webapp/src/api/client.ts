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
        console.log('[API Client] initData:', initDataRaw ? 'PRESENT' : 'EMPTY');
        
        if (initDataRaw) {
          config.headers['X-Telegram-Init-Data'] = initDataRaw;
        } else {
          console.warn('[API Client] No initData available!');
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
    // Try multiple methods to get initData
    
    // Method 1: From URL params (for testing)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tgWebAppData = urlParams.get('tgWebAppData');
      if (tgWebAppData) {
        console.log('[API Client] Got initData from URL');
        return tgWebAppData;
      }
    }
    
    // Method 2: From Telegram SDK
    try {
      const raw = initData.raw();
      if (raw) {
        console.log('[API Client] Got initData from SDK');
        return raw;
      }
    } catch (e) {
      console.warn('[API Client] SDK initData failed:', e);
    }
    
    // Method 3: From window.Telegram.WebApp (fallback)
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.initData) {
        console.log('[API Client] Got initData from window.Telegram');
        return tg.initData;
      }
    } catch (e) {
      console.warn('[API Client] Window Telegram failed:', e);
    }
    
    // DEV fallback
    if (import.meta.env.DEV) {
      console.log('[API Client] Using DEV mock data');
      return this.getMockInitData();
    }
    
    return '';
  }

  private getMockInitData(): string {
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
