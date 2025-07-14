import React from 'react';

interface ValidationErrorsProps {
  errors: Record<string, string[]>;
  className?: string;
}

export const ValidationErrors: React.FC<ValidationErrorsProps> = ({ errors, className = '' }) => {
  if (!errors || Object.keys(errors).length === 0) {
    return null;
  }

  return (
    <div className={`validation-errors ${className}`}>
      <div className="error-title">Пожалуйста, исправьте следующие ошибки:</div>
      <ul className="error-list">
        {Object.entries(errors).map(([field, fieldErrors]) => (
          <li key={field} className="error-item">
            <strong>{getFieldDisplayName(field)}:</strong> {fieldErrors.join(', ')}
          </li>
        ))}
      </ul>
    </div>
  );
};

// Функция для перевода названий полей на русский язык
const getFieldDisplayName = (field: string): string => {
  const fieldNames: Record<string, string> = {
    'type': 'Тип заявки',
    'fromCity': 'Город отправления',
    'toCity': 'Город назначения',
    'description': 'Описание',
    'weight': 'Вес',
  
    'contactName': 'Имя контакта',
    'userId': 'Пользователь',
    'tripDate': 'Дата поездки',
    'from_city': 'Город отправления',
    'to_city': 'Город назначения',
    'contact_name': 'Имя контакта',
    'user_id': 'Пользователь',
    'trip_date': 'Дата поездки',
  };

  return fieldNames[field] || field;
}; 