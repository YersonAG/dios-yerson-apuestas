// Backend API - El Dios Yerson
// Servidor Express con TypeScript para producción

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

// Importar rutas
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import betsRoutes from './routes/bets';
import statsRoutes from './routes/stats';
import historyRoutes from './routes/history';

// Importar DB
import { db } from './lib/db';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());

// CORS configurado para producción
const allowedOrigins = [
  'http://localhost:3000',
  'https://dios-yerson-apuestas.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    // Verificar si el origin está permitido o es un subdominio de vercel
    const isAllowed = allowedOrigins.some(allowed => {
      if (!allowed) return false;
      if (allowed === origin) return true;
      // Permitir subdominios de vercel
      if (origin.includes('.vercel.app') && allowed.includes('.vercel.app')) return true;
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(null, true); // En desarrollo, permitir todos
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/bets', betsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/history', historyRoutes);

// Health check endpoint (importante para Render)
app.get('/health', async (req, res) => {
  try {
    // Verificar conexión a la base de datos
    await db.$queryRaw`SELECT 1 as health`;
    
    res.status(200).json({ 
      status: 'healthy',
      message: 'El Dios Yerson está funcionando correctamente',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      version: '4.7.0',
      motor: 'Motor v4.7 PRO - Soñadoras 12/20'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({ 
      status: 'unhealthy',
      message: 'Error de conexión a la base de datos',
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    });
  }
});

// Health check simple (para algunos load balancers)
app.head('/health', (req, res) => {
  res.status(200).end();
});

// Ruta raíz - Información de la API
app.get('/', (req, res) => {
  res.json({
    name: '🎰 El Dios Yerson API',
    version: '1.0.0',
    description: 'Sistema de Apuestas Deportivas con IA - Personalidad Costeña',
    author: 'El Dios Yerson',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me'
      },
      chat: 'POST /api/chat',
      bets: {
        list: 'GET /api/bets',
        create: 'POST /api/bets',
        get: 'GET /api/bets/:id',
        update: 'PUT /api/bets/:id',
        delete: 'DELETE /api/bets/:id'
      },
      stats: 'GET /api/stats',
      history: 'GET /api/history',
      health: 'GET /health'
    }
  });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: 'El Dios Yerson no conoce esa ruta',
    path: req.path
  });
});

// Manejo de errores global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Error interno del servidor' 
    : err.message || 'Error desconocido';
  
  res.status(statusCode).json({ 
    error: 'Error interno del servidor',
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🎰 Recibida señal ${signal}. El Dios Yerson se está desconectando...`);
  
  try {
    await db.$disconnect();
    console.log('✅ Base de datos desconectada correctamente');
  } catch (error) {
    console.error('❌ Error al desconectar la base de datos:', error);
  }
  
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║                                                          ║
  ║     🎰 EL DIOS YERSON - BACKEND API 🎰                  ║
  ║                                                          ║
  ║     Puerto: ${PORT}                                       ║
  ║     Ambiente: ${process.env.NODE_ENV || 'development'}                      ║
  ║                                                          ║
  ╚══════════════════════════════════════════════════════════╝
  `);
});

// Exportar para testing
export default server;
export { app };
