// Rutas de Autenticación - El Dios Yerson
import { Router, Request, Response } from 'express';
import { db } from '../lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const router = Router();

const SECRET_KEY = process.env.JWT_SECRET || 'el-dios-yerson-secret-key-muy-segura';
const key = new TextEncoder().encode(SECRET_KEY);

// Middleware para obtener usuario actual
export const getCurrentUser = async (authHeader: string | undefined) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  
  try {
    const { payload } = await jwtVerify(token, key);
    const userId = payload.userId as string;

    const session = await db.session.findFirst({
      where: { token, userId, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!session) return null;

    return {
      id: session.user.id,
      username: session.user.username,
      email: session.user.email,
    };
  } catch {
    return null;
  }
};

// POST /api/auth/register - Registrar nuevo usuario
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Faltan datos, mi socio. Usuario, email y contraseña son requeridos.',
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        error: 'El usuario debe tener al menos 3 caracteres',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 6 caracteres. No seas gonoche.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Ese email no se ve bien, mi socio',
      });
    }

    const existingUser = await db.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ error: 'Ese usuario ya existe, mi socio' });
      }
      return res.status(400).json({ error: 'Ese email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await db.user.create({
      data: { username, email, password: hashedPassword },
    });

    return res.json({
      success: true,
      message: '¡Bienvenido al club! El Dios Yerson te está esperando.',
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.error('Error in register:', error);
    return res.status(500).json({
      error: 'Error al registrar. Algo salió mal en el servidor.',
    });
  }
});

// POST /api/auth/login - Iniciar sesión
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Dime tu usuario y contraseña, mi socio',
      });
    }

    const user = await db.user.findFirst({
      where: { OR: [{ username }, { email: username }] },
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado, mi socio' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Contraseña incorrecta. El Dios Yerson no te reconoce.' });
    }

    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Crear token JWT
    const token = await new SignJWT({ userId: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(key);

    // Crear sesión en DB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.session.create({
      data: { userId: user.id, token, expiresAt },
    });

    return res.json({
      success: true,
      message: `¡Bienvenido de vuelta, ${user.username}! El Dios Yerson te extrañaba.`,
      user: { id: user.id, username: user.username, email: user.email },
      token,
    });
  } catch (error) {
    console.error('Error in login:', error);
    return res.status(500).json({
      error: 'Error al iniciar sesión. El servidor está fallando.',
    });
  }
});

// POST /api/auth/logout - Cerrar sesión
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await db.session.deleteMany({ where: { token } });
    }

    return res.json({
      success: true,
      message: '¡Hasta luego! El Dios Yerson te esperará con más picks.',
    });
  } catch (error) {
    console.error('Error in logout:', error);
    return res.status(500).json({
      error: 'Error al cerrar sesión',
    });
  }
});

// GET /api/auth/me - Obtener usuario actual
router.get('/me', async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req.headers.authorization);

    if (!user) {
      return res.status(401).json({
        authenticated: false,
        user: null,
      });
    }

    return res.json({
      authenticated: true,
      user,
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    return res.status(500).json({
      authenticated: false,
      user: null,
    });
  }
});

export default router;
