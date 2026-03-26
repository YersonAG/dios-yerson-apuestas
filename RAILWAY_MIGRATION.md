# Migración a Railway

## Pasos para migrar el backend de Render a Railway

### 1. Crear proyecto en Railway

1. Ve a [railway.app](https://railway.app) e inicia sesión
2. Click en **"New Project"**
3. Selecciona **"Deploy from GitHub repo"**
4. Autoriza Railway para acceder a tu repositorio `YersonAG/dios-yerson-apuestas`
5. Selecciona el repositorio

### 2. Configurar el servicio

Railway detectará automáticamente que es un proyecto Node.js. Configura:

- **Root Directory**: `backend`
- **Start Command**: `npx tsx src/index.ts`

### 3. Variables de entorno necesarias

En Railway, ve a **Variables** y agrega:

```env
NODE_ENV=production
DATABASE_URL=<tu-database-url-de-railway>
DIRECT_DATABASE_URL=<tu-direct-database-url-de-railway>
JWT_SECRET=<genera-un-secreto-aleatorio>
FRONTEND_URL=https://dios-yerson-apuestas.vercel.app
```

**Importante**: La base de datos PostgreSQL ya está en Railway, así que solo necesitas copiar las URLs de conexión desde tu base de datos existente.

### 4. Obtener la URL de Railway

Una vez desplegado, Railway te dará una URL como:
- `https://dios-yerson-backend-production-abc123.up.railway.app`

Puedes generar un dominio personalizado en **Settings** → **Generate Domain**

### 5. Actualizar el Frontend

Después de obtener la URL de Railway:

#### Opción A: Actualizar vercel.json
Cambia en `/vercel.json`:
```json
"NEXT_PUBLIC_API_URL": "https://tu-url-de-railway.up.railway.app"
```

#### Opción B: Variable de entorno en Vercel
1. Ve a tu proyecto en Vercel
2. **Settings** → **Environment Variables**
3. Actualiza `NEXT_PUBLIC_API_URL` con la URL de Railway
4. Redespliega el frontend

### 6. Verificar el despliegue

Una vez desplegado, verifica:
- `https://tu-url-railway/health` - Debe retornar status healthy
- `https://tu-url-railway/` - Debe mostrar la info de la API

### Ventajas de Railway sobre Render

| Característica | Render (Free) | Railway |
|---------------|---------------|---------|
| Cold starts | ~30 segundos | No tiene |
| Estabilidad | Se duerme | Siempre activo |
| Velocidad | Lento | Rápido |
| Base de datos | Separada | Integrada |

### Notas adicionales

- Railway tiene un plan gratuito de $5/mes de crédito
- Si tu base de datos ya está en Railway, la latencia será menor
- Puedes configurar dominio personalizado en Railway

## Archivos modificados para Railway

1. `/backend/railway.json` - Configuración de Railway
2. `/backend/src/index.ts` - CORS actualizado para Railway
3. `/src/lib/config.ts` - Configuración centralizada de API URL
4. Todos los componentes actualizados para usar la config centralizada
