import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { DbService, Usuario } from "../db/db.service";

export function usuarioPublico(u: Usuario) {
  return { id: u.id, nome: u.nome, email: u.email, tipo: u.tipo };
}

@Injectable()
export class AuthService {
  constructor(private readonly db: DbService, private readonly jwt: JwtService) {}

  private assinar(usuario: Usuario) {
    return this.jwt.sign({ sub: usuario.id });
  }

  async registrar(nome: string, email: string, senha: string) {
    const emailNormalizado = email.trim().toLowerCase();
    if (this.db.data.usuarios.some((u) => u.email === emailNormalizado)) {
      throw new ConflictException("Já existe uma conta cadastrada com esse e-mail");
    }
    const usuario: Usuario = {
      id: crypto.randomUUID(),
      nome,
      email: emailNormalizado,
      senhaHash: await bcrypt.hash(senha, 10),
      tipo: "cliente",
      createdAt: new Date().toISOString(),
    };
    this.db.data.usuarios.push(usuario);
    this.db.persist();
    return { access_token: this.assinar(usuario), usuario: usuarioPublico(usuario) };
  }

  async login(email: string, senha: string) {
    const emailNormalizado = email.trim().toLowerCase();
    const usuario = this.db.data.usuarios.find((u) => u.email === emailNormalizado);
    if (!usuario || !(await bcrypt.compare(senha, usuario.senhaHash))) {
      throw new UnauthorizedException("E-mail ou senha inválidos");
    }
    return { access_token: this.assinar(usuario), usuario: usuarioPublico(usuario) };
  }

  async resolveUsuarioFromAuthHeader(authHeader?: string): Promise<Usuario | null> {
    if (!authHeader?.startsWith("Bearer ")) return null;
    try {
      const payload = this.jwt.verify(authHeader.slice(7));
      return this.db.data.usuarios.find((u) => u.id === payload.sub) || null;
    } catch {
      return null;
    }
  }
}
