import React, { useState } from 'react';
import { cities, getCitiesByCountry } from '../data/cities';
import { FormData } from '../types';
import { useTelegram } from './TelegramProvider';
import { CustomSelect } from './CustomSelect';
import { DatePicker } from './DatePicker';

interface ParcelFormProps {
  onSubmit: (data: FormData) => void;
  loading?: boolean;
}

export const ParcelForm: React.FC<ParcelFormProps> = ({ onSubmit, loading = false }) => {
  const { user } = useTelegram();
  const [formData, setFormData] = useState<FormData>({
    type: 'send',
    fromCity: '',
    toCity: '',
    description: '',
    weight: 0,
    tripDate: '',
  });

  const [direction, setDirection] = useState<'from-russia' | 'from-thailand'>('from-russia');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = formData.fromCity && formData.toCity && formData.description;
    const isReceiveValid = formData.type === 'receive' ? formData.tripDate : true;
    
    if (isValid && isReceiveValid) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDirectionChange = (newDirection: 'from-russia' | 'from-thailand') => {
    setDirection(newDirection);
    // Очищаем выбранные города при смене направления
    setFormData(prev => ({ 
      ...prev, 
      fromCity: '', 
      toCity: '' 
    }));
  };

  // Определяем страны на основе выбранного направления
  const fromCountry = direction === 'from-russia' ? 'russia' : 'thailand';
  const toCountry = direction === 'from-russia' ? 'thailand' : 'russia';

  // Получаем города для каждой страны отдельно
  const russianCities = getCitiesByCountry('russia');
  const thaiCities = getCitiesByCountry('thailand');

  // Выбираем города в зависимости от выбранного направления
  const fromCities = fromCountry === 'russia' ? russianCities : thaiCities;
  const toCities = toCountry === 'russia' ? russianCities : thaiCities;

  // Формируем отображаемое имя пользователя
  const getUserDisplayName = () => {
    if (!user) return 'Пользователь';
    
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const username = user.username ? `@${user.username}` : '';
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}${username ? ` (${username})` : ''}`;
    } else if (firstName) {
      return `${firstName}${username ? ` (${username})` : ''}`;
    } else if (username) {
      return username;
    }
    
    return 'Пользователь';
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="form-group">
        <label className="form-label">Тип заявки</label>
        <div className="tabs">
          <div 
            className={`tab ${formData.type === 'send' ? 'active' : ''}`}
            onClick={() => handleInputChange('type', 'send')}
          >
            Отправить посылку
          </div>
          <div 
            className={`tab ${formData.type === 'receive' ? 'active' : ''}`}
            onClick={() => handleInputChange('type', 'receive')}
          >
            Доставить посылку
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Направление</label>
        <div className="tabs">
          <div 
            className={`tab ${direction === 'from-russia' ? 'active' : ''}`}
            onClick={() => handleDirectionChange('from-russia')}
          >
            Из России
          </div>
          <div 
            className={`tab ${direction === 'from-thailand' ? 'active' : ''}`}
            onClick={() => handleDirectionChange('from-thailand')}
          >
            Из Таиланда
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          {formData.type === 'send' ? 'Откуда отправить' : 'Откуда доставить'}
        </label>
        <CustomSelect
          options={[
            { value: '', label: `Выберите город в ${fromCountry === 'russia' ? 'России' : 'Таиланде'}` },
            ...fromCities.map(city => ({
              value: city.id,
              label: city.name
            }))
          ]}
          value={formData.fromCity}
          onChange={(value) => handleInputChange('fromCity', value)}
          placeholder={`Выберите город в ${fromCountry === 'russia' ? 'России' : 'Таиланде'}`}
        />
      </div>

      <div className="form-group">
        <label className="form-label">
          {formData.type === 'send' ? 'Куда отправить' : 'Куда доставить'}
        </label>
        <CustomSelect
          options={[
            { value: '', label: `Выберите город в ${toCountry === 'russia' ? 'России' : 'Таиланде'}` },
            ...toCities.map(city => ({
              value: city.id,
              label: city.name
            }))
          ]}
          value={formData.toCity}
          onChange={(value) => handleInputChange('toCity', value)}
          placeholder={`Выберите город в ${toCountry === 'russia' ? 'России' : 'Таиланде'}`}
        />
      </div>

      <div className="form-group">
        <label className="form-label">
          {formData.type === 'send' ? 'Описание посылки' : 'Описание'}
        </label>
        <textarea
          className="form-input"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder={
            formData.type === 'send' 
              ? "Опишите содержимое посылки, размеры, особенности..." 
              : "Какие посылки вы можете принять? Опишите ваши возможности..."
          }
          rows={3}
          required
        />
      </div>

      {formData.type === 'receive' && (
        <div className="form-group">
          <label className="form-label">Дата вылета</label>
          <DatePicker
            value={formData.tripDate || ''}
            onChange={(date) => handleInputChange('tripDate', date)}
            min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
            placeholder="Выберите дату вылета"
            className="w-full"
          />
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Вес (кг)</label>
        <input
          type="number"
          className="form-input"
          value={formData.weight}
          onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || 0)}
          min="0"
          step="0.1"
          required
        />
      </div>



      <div className="form-group">
        <label className="form-label">Пользователь</label>
        <div className="form-input bg-tg-secondary-bg text-tg-hint cursor-not-allowed">
          {getUserDisplayName()}
        </div>
      </div>

      <button 
        type="submit" 
        className="btn" 
        disabled={
          loading || 
          !formData.fromCity || 
          !formData.toCity || 
          !formData.description ||
          (formData.type === 'receive' && !formData.tripDate)
        }
      >
        {loading ? 'Отправка...' : 'Создать заявку'}
      </button>
    </form>
  );
}; 