# 🎰 EL DIOS YERSON - Sistema de Apuestas Deportivas

Sistema Premium de Apuestas Deportivas con personalidad costeña colombiana.

## 📁 Estructura del Proyecto

```
/home/z/my-project/
├── frontend/          # Next.js App (Puerto 3000)
│   ├── src/
│   │   ├── app/       # Páginas
│   │   ├── components/ # Componentes React
│   │   └── lib/       # Utilidades
│   ├── package.json
│   └── ...
│
├── backend/           # Express API (Puerto 3001)
│   ├── src/
│   │   ├── routes/    # Rutas de la API
│   │   ├── lib/       # Librerías (auth, db, etc.)
│   │   └── index.ts   # Punto de entrada
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   └── ...
│
└── README.md
```

## 🚀 Cómo Ejecutar

### 1. Configurar Backend

```bash
cd /home/z/my-project/backend

# Instalar dependencias
bun install

# Configurar base de datos
bunx prisma generate
bunx prisma db push

# Iniciar servidor (Puerto 3001)
bun run dev
```

### 2. Configurar Frontend

```bash
cd /home/z/my-project/frontend

# Instalar dependencias
bun install

# Iniciar servidor (Puerto 3000)
bun run dev
```

### 3. Acceder a la App

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/health

## 🛠️ Tecnologías

### Frontend
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion
- shadcn/ui

### Backend
- Express.js
- TypeScript
- Prisma ORM
- SQLite
- bcryptjs (autenticación)
- jose (JWT)

## 🔐 Autenticación

El sistema usa JWT con cookies httpOnly para autenticación segura.

- **Registro:** POST /api/auth/register
- **Login:** POST /api/auth/login
- **Logout:** POST /api/auth/logout
- **Verificar:** GET /api/auth/me

## 📡 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Obtener usuario actual

### Chat
- `POST /api/chat` - Enviar mensaje al agente

### Apuestas
- `GET /api/bets` - Obtener apuestas
- `POST /api/bets` - Crear apuesta
- `PUT /api/bets/:id` - Actualizar apuesta
- `DELETE /api/bets/:id` - Eliminar apuesta

### Estadísticas
- `GET /api/stats` - Obtener estadísticas del usuario

### Historial
- `GET /api/history` - Obtener historial de apuestas

## 🎯 Comandos del Chat

- `"quiero 3 combinadas"` - Generar combinadas
- `"apuesta del día"` - La pick del Dios Yerson
- `"mis estadísticas"` - Ver tus stats
- `"mi historial"` - Ver historial
- `"apuestas activas"` - Ver apuestas en vivo
- `"ayuda"` - Ver comandos disponibles

## 📍 Ligas Disponibles

- Premier League (Inglaterra)
- La Liga (España)
- Serie A (Italia)
- Bundesliga (Alemania)
- Ligue 1 (Francia)
- Liga BetPlay (Colombia) 🇨🇴

---

**El Dios Yerson protege tu cuenta con encriptación de alto nivel** 🎰
