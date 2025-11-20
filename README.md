# Split Bill Backend - Authentication System

Backend service untuk aplikasi Split Bill dengan fitur authentication menggunakan JWT tokens.

## 🚀 Features

- ✅ User Registration
- ✅ User Login
- ✅ JWT Authentication (Access Token + Refresh Token)
- ✅ Password Hashing dengan bcrypt
- ✅ Input Validation
- ✅ CORS Support
- ✅ MongoDB Integration
- ✅ Netlify Serverless Functions

## 📁 Project Structure

```
api/
├── auth/
│   ├── register.js         # POST /api/auth/register
│   ├── login.js            # POST /api/auth/login
│   ├── logout.js           # POST /api/auth/logout
│   └── me.js               # GET /api/auth/me
├── participants/
│   ├── index.js            # GET/POST /api/participants
│   └── [participantId].js  # DELETE /api/participants/:id
├── split-bills/
│   ├── index.js            # GET/POST /api/split-bills
│   └── [recordId].js       # GET /api/split-bills/:id
├── reviews.js              # POST/GET /api/reviews
├── users.js                # GET /api/users
└── gemini-scan.js          # Existing Gemini API

lib/
├── models/
│   ├── User.js
│   ├── Participant.js
│   ├── Review.js
│   └── SplitBillRecord.js
├── middleware/
│   └── auth.js
├── db.js
├── errors.js
├── http.js
├── parsers.js
└── init-middleware.js
```

## 🔧 Setup & Installation

### 1. Clone Repository

```bash
git clone https://github.com/agusbudbudi/split-bill-backend-vercel.git
cd split-bill-backend-vercel
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Buat file `.env` berdasarkan `.env.example`:

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/split-bill-db
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
```

### 4. Deploy ke Netlify (Netlify CLI)

```bash
# Install Netlify CLI (once)
npm i -g netlify-cli

# Link project to a Netlify site (or create a new one)
netlify init
# or if the site already exists in the dashboard:
# netlify link

# (Optional) Set environment variables via CLI
netlify env:set MONGO_URI "your-mongodb-uri"
netlify env:set JWT_SECRET "your-jwt-secret"
netlify env:set JWT_REFRESH_SECRET "your-jwt-refresh-secret"

# Deploy using netlify.toml (build + functions)
netlify deploy --build --prod
```

## 📚 API Documentation

### Base URL

```
https://splitbillbe.netlify.app
```

### Authentication Endpoints

#### 1. Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

#### 2. Login User

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

#### 3. Get Current User

```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 4. Logout User

```http
POST /api/auth/logout
Content-Type: application/json

{
  "refreshToken": "jwt_refresh_token"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Logout successful"
}
```

## 🔐 Security Features

- **Password Hashing**: bcrypt dengan salt rounds 12
- **JWT Tokens**:
  - Access Token: 15 menit expiry
  - Refresh Token: 7 hari expiry
- **Input Validation**: Email format, password length, required fields
- **Error Handling**: Consistent error responses
- **CORS**: Configured untuk cross-origin requests

## 🗄️ Database Schema

### User Model

```javascript
{
  name: String (required, 2-50 characters),
  email: String (required, unique, valid email),
  password: String (required, min 6 characters, hashed),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-updated)
}
```

## 🚨 Error Responses

Semua error menggunakan format yang konsisten:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Common Error Codes:

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid credentials/token)
- `405` - Method Not Allowed
- `500` - Internal Server Error

## 🧪 Testing

### Manual Testing dengan curl:

#### Register:

```bash
curl -X POST https://splitbillbe.netlify.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

#### Login:

```bash
curl -X POST https://splitbillbe.netlify.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

#### Get Current User:

```bash
curl -X GET https://splitbillbe.netlify.app/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🔗 Frontend Integration

Frontend sudah dikonfigurasi untuk menggunakan backend ini:

- Base URL: `https://splitbillbe.netlify.app`
- Authentication service sudah siap di `js/login.js`
- Token management dengan localStorage

## 📝 Development Notes

- Menggunakan ES Modules (`type: "module"`)
- Netlify Serverless Functions
- MongoDB dengan Mongoose ODM
- CORS middleware untuk semua endpoints
- Environment variables untuk konfigurasi

## 🚀 Deployment

Project ini sudah dikonfigurasi untuk deployment di Netlify:

1. Push ke GitHub repository
2. Connect repository ke Netlify
3. Set environment variables di Netlify dashboard (MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET)
4. Netlify akan build & deploy otomatis setiap push ke main branch (menggunakan pengaturan di netlify.toml: functions = "netlify/functions", publish = "public")

## 📞 Support

Jika ada pertanyaan atau issue, silakan buat issue di GitHub repository.
