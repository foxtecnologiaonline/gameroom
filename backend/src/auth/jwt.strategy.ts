import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { DbService } from "../db/db.service";
import { usuarioPublico } from "./auth.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly db: DbService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "dev-secret-change-me",
    });
  }

  async validate(payload: { sub: string }) {
    const usuario = this.db.data.usuarios.find((u) => u.id === payload.sub);
    if (!usuario) return null;
    return usuarioPublico(usuario);
  }
}
