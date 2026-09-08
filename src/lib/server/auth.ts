import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, type Usuario } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export function usuarioPublico(u: Usuario) {
  return { id: u.id, nome: u.nome, email: u.email, tipo: u.tipo };
}

export function assinarToken(usuario: Usuario): string {
  return jwt.sign({ sub: usuario.id }, JWT_SECRET, { expiresIn: "7d" });
}

export async function registrar(nome: string, email: string, senha: string) {
  const emailNormalizado = email.trim().toLowerCase();
  if (db.data.usuarios.some((u) => u.email === emailNormalizado)) {
    const err = new ApiError(409, "Já existe uma conta cadastrada com esse e-mail");
    throw err;
  }
  const usuario: Usuario = {
    id: crypto.randomUUID(),
    nome,
    email: emailNormalizado,
    senhaHash: await bcrypt.hash(senha, 10),
    tipo: "cliente",
    createdAt: new Date().toISOString(),
  };
  db.data.usuarios.push(usuario);
  db.persist();
  return { access_token: assinarToken(usuario), usuario: usuarioPublico(usuario) };
}

export async function login(email: string, senha: string) {
  const emailNormalizado = email.trim().toLowerCase();
  const usuario = db.data.usuarios.find((u) => u.email === emailNormalizado);
  if (!usuario || !(await bcrypt.compare(senha, usuario.senhaHash))) {
    throw new ApiError(401, "E-mail ou senha inválidos");
  }
  return { access_token: assinarToken(usuario), usuario: usuarioPublico(usuario) };
}

export function resolveUsuario(req: Request): Usuario | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET) as { sub: string };
    return db.data.usuarios.find((u) => u.id === payload.sub) || null;
  } catch {
    return null;
  }
}

export function exigirUsuario(req: Request): Usuario {
  const usuario = resolveUsuario(req);
  if (!usuario) throw new ApiError(401, "Autenticação necessária");
  return usuario;
}

export function exigirAdmin(req: Request): Usuario {
  const usuario = exigirUsuario(req);
  if (usuario.tipo !== "admin") throw new ApiError(403, "Acesso restrito a administradores");
  return usuario;
}

export class ApiError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
