// Sistema de Autenticación - "El Dios Yerson protege tu cuenta"
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { db } from './db';

const SECRET_KEY = process.env.JWT_SECRET || 'el-dios-yerson-secret-key-muy-segura';
const key = new TextEncoder().encode(SECRET_KEY);

// Duración de la sesión en segundos (7 días)
const SESSION_DURATION = 7 * 24 * 60 * 60;

export interface SessionUser {
  id: string;
  username: string;
  email: string;
}

// Hashear contraseña
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verificar contraseña
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Crear token JWT
export async function createSession(userId: string): Promise<string> {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);

  // Guardar sesión en base de datos
  const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000);
  await db.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return token;
}

// Verificar sesión
export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, key);
    const userId = payload.userId as string;

    // Verificar en base de datos
    const session = await db.session.findFirst({
      where: {
        token,
        userId,
        expiresAt: { gt: new Date() },
      },
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
}

// Obtener usuario actual desde token
export async function getCurrentUser(authHeader: string | undefined): Promise<SessionUser | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  return verifySession(token);
}

// Eliminar sesión (logout)
export async function deleteSession(token: string): Promise<void> {
  try {
    await db.session.deleteMany({
      where: { token },
    });
  } catch {
    // Ignorar errores
  }
}

// Registrar nuevo usuario
export async function registerUser(
  username: string,
  email: string,
  password: string
): Promise<{ success: boolean; user?: SessionUser; error?: string }> {
  try {
    // Verificar si ya existe
    const existingUser = await db.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return { success: false, error: 'Ese usuario ya existe, mi socio' };
      }
      return { success: false, error: 'Ese email ya está registrado' };
    }

    // Crear usuario
    const hashedPassword = await hashPassword(password);
    const user = await db.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  } catch (error) {
    console.error('Error registering user:', error);
    return { success: false, error: 'Error al registrar. El Dios Yerson está confundido.' };
  }
}

// Login
export async function loginUser(
  usernameOrEmail: string,
  password: string
): Promise<{ success: boolean; user?: SessionUser; token?: string; error?: string }> {
  try {
    // Buscar usuario
    const user = await db.user.findFirst({
      where: {
        OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
      },
    });

    if (!user) {
      return { success: false, error: 'Usuario no encontrado, mi socio' };
    }

    // Verificar contraseña
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return { success: false, error: 'Contraseña incorrecta. El Dios Yerson no te reconoce.' };
    }

    // Actualizar último login
    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Crear sesión
    const token = await createSession(user.id);

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      token,
    };
  } catch (error) {
    console.error('Error logging in:', error);
    return { success: false, error: 'Error al iniciar sesión' };
  }
}
