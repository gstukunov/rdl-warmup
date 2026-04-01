import axios, { AxiosInstance, AxiosError } from 'axios';
import type { ApiResponse } from '../types';

class ApiClient {
  private client: AxiosInstance;
  private initData: string = '';

  constructor() {
    const baseURL = import.meta.env.VITE_API_URL || '/api';
    
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
        if (this.initData) {
          config.headers['X-Telegram-Init-Data'] = this.initData;
        } else {
          // Try to get initData synchronously
          const data = this.getInitData();
          if (data) {
            this.initData = data;
            config.headers['X-Telegram-Init-Data'] = data;
          }
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

    // Initialize initData
    this.init();
  }

  private init() {
    // Wait for Telegram WebApp to be ready
    if (typeof window !== 'undefined') {
      const tg = (window as any).Telegram?.WebApp;
      
      if (tg) {
        // If already ready, get data immediately
        if (tg.initData) {
          this.initData = tg.initData;
          console.log('[API] Got initData from Telegram WebApp');
        } else {
          // Wait for ready event
          tg.ready();
          // Try again after ready
          setTimeout(() => {
            if (tg.initData) {
              this.initData = tg.initData;
              console.log('[API] Got initData after ready');
            }
          }, 100);
        }
      } else {
        console.warn('[API] Telegram WebApp not available');
      }
    }
  }

  private getInitData(): string {
    // Direct access to window.Telegram
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initData) {
      return tg.initData;
    }
    
    // From URL params (for testing)
    const urlParams = new URLSearchParams(window.location.search);
    const tgWebAppData = urlParams.get('tgWebAppData');
    if (tgWebAppData) {
      return tgWebAppData;
    }
    
    // DEV fallback
    if (import.meta.env.DEV) {
      return this.getMockInitData();
    }
    
    return '';
  }

  // Method to set initData from outside (e.g., from useTelegram hook)
  setInitData(data: string) {
    this.initData = data;
    console.log('[API] initData set externally');
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
