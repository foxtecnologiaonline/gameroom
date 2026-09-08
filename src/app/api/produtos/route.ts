import { exigirAdmin, resolveUsuario, ApiError } from "@/lib/server/auth";
import * as produtos from "@/lib/server/produtos";
import { ok, fail } from "@/lib/server/respond";

export async function GET(req: Request) {
  try {
    const admin = new URL(req.url).searchParams.get("admin");
    if (admin === "true") {
      const usuario = resolveUsuario(req);
      if (!usuario) throw new ApiError(401, "Autenticação necessária");
      if (usuario.tipo !== "admin") throw new ApiError(403, "Acesso restrito a administradores");
      return ok(produtos.listarTodos());
    }
    return ok(produtos.listarAtivos());
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request) {
  try {
    exigirAdmin(req);
    const dto = await req.json();
    return ok(produtos.criar(dto), 201);
  } catch (err) {
    return fail(err);
  }
}
