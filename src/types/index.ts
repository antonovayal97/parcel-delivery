export interface ParcelRequest {
  id: string;
  type: 'send' | 'receive';
  fromCity: string;
  toCity: string;
  description: string;
  weight: number;
  contactName: string;
  userId: string;
  createdAt: Date;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  username?: string;
}

export interface User {
  id: string;
  telegramId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  credits: number;
}

export interface FormData {
  type: 'send' | 'receive';
  fromCity: string;
  toCity: string;
  description: string;
  weight: number;
  tripDate?: string;
} 