# API Кредитов

Система кредитов позволяет пользователям создавать заявки на доставку посылок, тратя кредиты. Каждая заявка стоит 10 кредитов.

## Особые роли

### Администраторы (role = "admin")

Пользователи с ролью "admin" имеют **бесплатный доступ** к созданию заявок. Для администраторов:

- Не списываются кредиты при создании заявок
- В истории транзакций записываются записи с amount = 0
- Описание транзакции указывает на бесплатное создание для админа

## Эндпоинты

### 1. Получение баланса кредитов

**GET** `/api/credits/balance/:userId`

Получает текущий баланс кредитов пользователя.

**Параметры:**

- `userId` (path) - ID пользователя

**Заголовки:**

- `Authorization: Bearer <token>` - JWT токен

**Ответ:**

```json
{
  "userId": 1,
  "credits": 150
}
```

**Коды ответов:**

- `200` - Успешно
- `403` - Недостаточно прав
- `404` - Пользователь не найден

### 2. Пополнение кредитов (только для админов)

**POST** `/api/credits/add`

Пополняет баланс кредитов пользователя.

**Тело запроса:**

```json
{
  "userId": 1,
  "amount": 50
}
```

**Заголовки:**

- `Authorization: Bearer <token>` - JWT токен (требуются права админа)

**Ответ:**

```json
{
  "message": "Кредиты успешно пополнены",
  "userId": 1,
  "addedAmount": 50,
  "newBalance": 200
}
```

**Коды ответов:**

- `200` - Успешно
- `400` - Ошибка валидации
- `403` - Недостаточно прав
- `404` - Пользователь не найден

### 3. Списание кредитов

**POST** `/api/credits/deduct`

Списывает кредиты с баланса пользователя.

**Тело запроса:**

```json
{
  "userId": 1,
  "amount": 10
}
```

**Заголовки:**

- `Authorization: Bearer <token>` - JWT токен

**Ответ:**

```json
{
  "message": "Кредиты успешно списаны",
  "userId": 1,
  "deductedAmount": 10,
  "newBalance": 140
}
```

**Коды ответов:**

- `200` - Успешно
- `400` - Недостаточно кредитов или ошибка валидации
- `403` - Недостаточно прав
- `404` - Пользователь не найден

### 4. История транзакций (только для админов)

**GET** `/api/credits/history/:userId`

Получает историю операций с кредитами пользователя.

**Параметры:**

- `userId` (path) - ID пользователя
- `page` (query) - Номер страницы (по умолчанию 1)
- `limit` (query) - Количество записей на странице (по умолчанию 20)

**Заголовки:**

- `Authorization: Bearer <token>` - JWT токен (требуются права админа)

**Ответ:**

```json
{
  "current_page": 1,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "amount": 10,
      "type": "deduct",
      "description": "Создание заявки на отправку",
      "related_request_id": 1,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 5,
  "per_page": 20,
  "last_page": 1
}
```

## Интеграция с заявками

При создании заявки на доставку автоматически:

1. Проверяется роль пользователя
2. Если пользователь не админ, проверяется баланс кредитов
3. Если кредитов достаточно (≥ 10) или пользователь админ, создается заявка
4. Для обычных пользователей списываются кредиты, для админов - нет
5. Создается запись в истории транзакций
6. Создается заявка на доставку

**Пример создания заявки с проверкой кредитов:**

```javascript
// Сначала проверяем баланс
const balanceResponse = await fetch("/api/credits/balance/1", {
  headers: { Authorization: "Bearer " + token },
});

const balance = await balanceResponse.json();

if (balance.credits < 10) {
  alert("Недостаточно кредитов для создания заявки");
  return;
}

// Создаем заявку (кредиты спишутся автоматически)
const requestResponse = await fetch("/api/parcel-requests", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token,
  },
  body: JSON.stringify({
    type: "send",
    fromCity: "Москва",
    toCity: "Бангкок",
    description: "Электроника",
    weight: 2.5,
    dimensions: "30x20x15 см",
    contactName: "Иван Иванов",
    userId: 1,
  }),
});
```

## Стоимость операций

- **Создание заявки на отправку**: 10 кредитов
- **Создание заявки на получение**: 10 кредитов
- **Пополнение кредитов**: бесплатно (только для админов)

## Начальный баланс

Новые пользователи получают 100 кредитов при регистрации.
