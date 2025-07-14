import { ParcelRequest } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number | null;
  last_page: number;
  last_page_url: string;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
}

export interface AuthResponse {
  user: any;
  token: string;
  message: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  telegram_id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  credits: number;
}

class ApiService {
  private token: string | null = null;
  public onRequest?: (info: any) => void;

  // Метод для установки токена
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  // Метод для получения токена
  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  // Метод для удаления токена
  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  // Метод для проверки аутентификации
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    // Добавляем Content-Type только если body не FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Добавляем токен аутентификации если есть
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const defaultOptions: RequestInit = {
      headers,
      ...options,
    };

    // Перед отправкой запроса логируем содержимое FormData
    if (options.body instanceof FormData) {
      const entries = [];
      for (let pair of options.body.entries()) {
        entries.push([pair[0], pair[1]]);
      }
      console.log('FormData отправляется:', entries);
    }

    // Вызовем коллбек, если он есть
    if (this.onRequest) {
      this.onRequest({
        url,
        options: defaultOptions
      });
    }

    try {
      const response = await fetch(url, defaultOptions);
      
      if (!response.ok) {
        // Пытаемся получить детали ошибки из ответа
        const errorData = await response.json().catch(() => ({}));
        
        // Если есть ошибки валидации, создаем специальную ошибку
        if (errorData.errors) {
          const validationError = new Error('Validation failed');
          (validationError as any).validationErrors = errorData.errors;
          (validationError as any).message = errorData.message;
          throw validationError;
        }
        
        // Для других ошибок
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth API
  async login(telegramUser?: any, initData?: string): Promise<AuthResponse> {
    let user = telegramUser;
    let init_data = initData;
    if (!user || !init_data) {
      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        user = tg.initDataUnsafe?.user;
        init_data = tg.initData;
      }
    }
    if (!user || !init_data) {
      throw new Error('Данные Telegram не найдены. Авторизация невозможна без Telegram WebApp.');
    }
    // Формируем FormData
    const formData = new FormData();
    formData.append('telegram_user', JSON.stringify(user));
    formData.append('init_data', init_data);
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: formData
    });
  }

  async logout(): Promise<void> {
    await this.request<void>('/auth/logout', {
      method: 'POST',
    });
    this.clearToken();
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // User API
  async getUsers(): Promise<PaginatedResponse<User>> {
    return this.request<PaginatedResponse<User>>('/users');
  }

  async createUser(userData: any): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getUserById(id: string): Promise<User> {
    return this.request<User>(`/users/${id}`);
  }

  async updateUser(id: string, userData: any): Promise<User> {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string): Promise<void> {
    return this.request<void>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  async getUserByTelegramId(telegramId: string): Promise<User> {
    return this.request<User>(`/users/telegram/${telegramId}`);
  }

  // ParcelRequest API
  async getParcelRequests(page: number = 1, perPage: number = 20, excludeCancelled: boolean = true): Promise<PaginatedResponse<any>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: perPage.toString()
    });
    
    // Исключаем отмененные и завершенные заявки по умолчанию
    if (excludeCancelled) {
      params.append('status', 'pending,accepted');
    }
    
    return this.request<PaginatedResponse<any>>(`/parcel-requests?${params}`);
  }

  async createParcelRequest(requestData: any): Promise<any> {
    return this.request<any>('/parcel-requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  async getParcelRequestById(id: string): Promise<any> {
    return this.request<any>(`/parcel-requests/${id}`);
  }

  async updateParcelRequest(id: string, requestData: any): Promise<any> {
    return this.request<any>(`/parcel-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(requestData),
    });
  }

  async deleteParcelRequest(id: string): Promise<void> {
    return this.request<void>(`/parcel-requests/${id}`, {
      method: 'DELETE',
    });
  }

  async getParcelRequestsByUserId(userId: string): Promise<ParcelRequest[]> {
    return this.request<ParcelRequest[]>(`/parcel-requests/user/${userId}`);
  }

  async getParcelRequestsByStatus(status: string): Promise<PaginatedResponse<any>> {
    return this.request<PaginatedResponse<any>>(`/parcel-requests/status/${status}`);
  }

  // Credits API
  async getUserCreditsBalance(userId: string): Promise<{ userId: number; credits: number }> {
    return this.request<{ userId: number; credits: number }>(`/credits/balance/${userId}`);
  }

  async addCredits(userId: string, amount: number): Promise<{
    message: string;
    userId: number;
    addedAmount: number;
    newBalance: number;
  }> {
    return this.request<{
      message: string;
      userId: number;
      addedAmount: number;
      newBalance: number;
    }>('/credits/add', {
      method: 'POST',
      body: JSON.stringify({ userId, amount }),
    });
  }

  async deductCredits(userId: string, amount: number): Promise<{
    message: string;
    userId: number;
    deductedAmount: number;
    newBalance: number;
  }> {
    return this.request<{
      message: string;
      userId: number;
      deductedAmount: number;
      newBalance: number;
    }>('/credits/deduct', {
      method: 'POST',
      body: JSON.stringify({ userId, amount }),
    });
  }
}

export const apiService = new ApiService(); 