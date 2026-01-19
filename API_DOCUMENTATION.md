# Check Calculator API Documentation

Base URL: `http://localhost:9000`

All endpoints except `/auth/*` require a Bearer Token in the `Authorization` header.

## Authentication (`/auth`)

### Register
**POST** `/auth/register`

Creates a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2026-01-19T10:00:00.000Z",
  "updatedAt": "2026-01-19T10:00:00.000Z"
}
```

### Login
**POST** `/auth/login`

Authenticates a user and returns a JWT access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1Ni..."
}
```

---

## Users (`/users`)

### Get Profile
**GET** `/users/profile`

Retrieves the authenticated user's profile, including spending statistics and history. Supports optional filtering by month/year.

**Query Parameters:**
- `year` (optional): Filter stats by year (e.g., `2026`)
- `month` (optional): Filter stats by month (1-12)

**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "stats": {
    "totalSpent": 150.50,
    "totalPaid": 100.00,
    "balance": 50.50
  },
  "history": {
    "payments": [
      {
        "id": "uuid",
        "amount": 50.00,
        "receiptName": "Dinner",
        "date": "2026-01-19T10:00:00.000Z"
      }
    ],
    "items": [
      {
        "itemId": "uuid",
        "itemName": "Pizza",
        "basePrice": 20.00,
        "finalPrice": 23.50, // Includes tax/tip share
        "assignedAt": "2026-01-19T10:00:00.000Z"
      }
    ]
  }
}
```

---

## Friends (`/friends`)

### List Friends
**GET** `/friends`

Returns a list of friends added by the user.

**Response (200 OK):**
```json
[
  {
    "id": "uuid",
    "name": "Alice",
    "userId": "user-uuid"
  }
]
```

### Add Friend
**POST** `/friends`

Adds a new friend to the user's list.

**Request Body:**
```json
{
  "name": "Alice"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "name": "Alice",
  "userId": "user-uuid"
}
```

---

## Receipts (`/receipts`)

### Create Receipt
**POST** `/receipts`

Manually creates a receipt with items.

**Request Body:**
```json
{
  "name": "Dinner at Luigi's",
  "subtotal": 100.00,
  "delivery": 5.00,
  "tax": 10.00,
  "service": 15.00,
  "total": 130.00,
  "items": [
    { "name": "Pizza", "price": 20.00, "quantity": 1 },
    { "name": "Pasta", "price": 15.00, "quantity": 1 }
  ]
}
```

### Scan Receipt (AI)
**POST** `/receipts/scan`

Uploads a base64 image to be analyzed by Gemini AI. Returns extracted receipt data.

**Request Body:**
```json
{
  "image": "base64_encoded_string...",
  "mimeType": "image/jpeg"
}
```

**Response (200 OK):**
```json
{
  "items": [
    { "name": "Pizza", "price": 20.00, "quantity": 1 }
  ],
  "subtotal": 20.00,
  "tax": 2.00,
  "total": 22.00
}
```

### Assign Item
**POST** `/receipts/items/:itemId/assign`

Assigns a specific item to a user (self) or a friend. Splitting an item among multiple people requires calling this endpoint multiple times for the same `itemId`.

**Request Body:**
- To assign to self: `{ "userId": "your-user-id" }`
- To assign to friend: `{ "friendId": "friend-uuid" }`

### Add Payment
**POST** `/receipts/:id/payments`

Records a payment made towards a receipt.

**Request Body:**
```json
{
  "amount": 50.00,
  "userId": "your-user-id" // OR "friendId": "friend-uuid"
}
```

### Get Split Report
**GET** `/receipts/:id/split`

Calculates the final split for a receipt, including who owes what based on assigned items and shared fees (tax/tip/delivery).

**Response (200 OK):**
```json
{
  "receiptId": "uuid",
  "total": 130.00,
  "participants": [
    {
      "id": "uuid",
      "name": "Alice",
      "type": "friend",
      "spent": 45.00, // Includes share of fees
      "paid": 0.00,
      "owes": 45.00
    },
    {
      "id": "uuid",
      "name": "John Doe",
      "type": "user",
      "spent": 85.00,
      "paid": 130.00,
      "owes": -45.00 // Negative means they are owed money
    }
  ]
}
```
