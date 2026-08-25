export interface JwtPayload {
  sub: string;
  email: string;
  tipo: 'admin' | 'cliente';
}
