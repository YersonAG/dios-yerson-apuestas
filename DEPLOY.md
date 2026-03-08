# 🚀 GUÍA DE DESPLIEGUE - EL DIOS YERSON

Esta guía te llevará paso a paso para desplegar el sistema en:
- **Frontend:** Vercel
- **Backend:** Render
- **Base de datos:** Railway (PostgreSQL)

---

## 📋 PRERREQUISITOS

1. Cuenta en [GitHub](https://github.com) ✅ (ya tienes)
2. Cuenta en [Vercel](https://vercel.com)
3. Cuenta en [Render](https://render.com)
4. Cuenta en [Railway](https://railway.app)

---

## 🗄️ PASO 1: BASE DE DATOS EN RAILWAY

### 1.1 Crear cuenta y proyecto
1. Ve a [railway.app](https://railway.app)
2. Inicia sesión con GitHub
3. Click en **"New Project"**
4. Selecciona **"Provision PostgreSQL"**

### 1.2 Obtener credenciales
1. Click en tu base de datos PostgreSQL
2. Ve a la pestaña **"Variables"**
3. Copia los siguientes valores:
   - `DATABASE_URL` (ya formateado para Prisma)
   - O individualmente: `POSTGRES_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, etc.

### 1.3 Crear URL directa (necesario para Prisma)
Railway provee una URL con pooler, pero Prisma necesita una directa:
```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]
```

**Variables a guardar:**
- `DATABASE_URL` - Para conexiones con pool (transacciones)
- `DIRECT_DATABASE_URL` - Para migraciones directas

---

## ⚙️ PASO 2: BACKEND EN RENDER

### 2.1 Crear cuenta
1. Ve a [render.com](https://render.com)
2. Inicia sesión con GitHub

### 2.2 Crear Web Service
1. Click en **"New"** → **"Web Service"**
2. Conecta tu repositorio: `YersonAG/dios-yerson-apuestas`
3. Configura:
   - **Name:** `dios-yerson-backend`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npx prisma generate && npx prisma migrate deploy`
   - **Start Command:** `npm run start`
   - **Plan:** Free

### 2.3 Variables de entorno en Render
En la sección "Environment Variables", agrega:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | (De Railway - URL con pooler) |
| `DIRECT_DATABASE_URL` | (De Railway - URL directa) |
| `JWT_SECRET` | (Genera uno seguro, ej: un string largo aleatorio) |
| `FRONTEND_URL` | `https://dios-yerson-apuestas.vercel.app` (o tu URL de Vercel) |
| `NODE_ENV` | `production` |

### 2.4 Guardar la URL del backend
Una vez desplegado, tu backend estará en:
```
https://dios-yerson-backend.onrender.com
```

---

## 🎨 PASO 3: FRONTEND EN VERCEL

### 3.1 Crear cuenta
1. Ve a [vercel.com](https://vercel.com)
2. Inicia sesión con GitHub

### 3.2 Importar proyecto
1. Click en **"Add New"** → **"Project"**
2. Selecciona `YersonAG/dios-yerson-apuestas`
3. Configura:
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend`
   - **Build Command:** `bun run build`
   - **Output Directory:** `.next`

### 3.3 Variables de entorno en Vercel
En "Environment Variables":

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://dios-yerson-backend.onrender.com` |

### 3.4 Deploy
1. Click en **"Deploy"**
2. Espera a que termine
3. Obtendrás una URL como: `https://dios-yerson-apuestas.vercel.app`

---

## 🔄 PASO 4: ACTUALIZAR URLs

### 4.1 Actualizar Backend (Render)
Si cambiaste el nombre del frontend, actualiza:
- `FRONTEND_URL` en Render

### 4.2 Actualizar Frontend (Vercel)
Si cambiaste el nombre del backend, actualiza:
- `NEXT_PUBLIC_API_URL` en Vercel

---

## ✅ PASO 5: VERIFICAR

### 5.1 Probar Backend
Ve a: `https://tu-backend.onrender.com/health`
Deberías ver:
```json
{
  "status": "ok",
  "message": "El Dios Yerson está funcionando correctamente",
  "database": "connected"
}
```

### 5.2 Probar Frontend
Ve a: `https://tu-frontend.vercel.app`
Deberías ver la página de login/registro.

---

## 🔧 COMANDOS ÚTILES

### Railway CLI
```bash
# Instalar CLI
npm i -g @railway/cli

# Login
railway login

# Link proyecto
railway link

# Ver variables
railway variables
```

### Prisma
```bash
# Generar cliente
npx prisma generate

# Ejecutar migraciones
npx prisma migrate deploy

# Ver base de datos
npx prisma studio
```

---

## 📊 RESUMEN DE URLs

| Servicio | URL |
|----------|-----|
| Frontend | `https://dios-yerson-apuestas.vercel.app` |
| Backend | `https://dios-yerson-backend.onrender.com` |
| Base de datos | Railway (PostgreSQL) |
| Repositorio | `https://github.com/YersonAG/dios-yerson-apuestas` |

---

## ⚠️ PROBLEMAS COMUNES

### Error de CORS
- Verifica que `FRONTEND_URL` en Render coincida con tu URL de Vercel
- Incluye `https://` sin trailing slash

### Error de Base de Datos
- Verifica que `DATABASE_URL` y `DIRECT_DATABASE_URL` estén correctos
- Railway a veces requiere el parámetro `?pgbouncer=true`

### Error de Prisma
- Ejecuta `npx prisma generate` en el build
- Verifica que el schema use `postgresql` no `sqlite`

---

## 🎰 ¡LISTO!

Si todo salió bien, tu sistema está en la nube.
**¡El Dios Yerson te bendice con este despliegue!** 🙏
