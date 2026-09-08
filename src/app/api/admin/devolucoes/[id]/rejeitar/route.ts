import { exigirAdmin } from "@/lib/server/auth";
import * as devolucoes from "@/lib/server/devolucoes";
import { ok, fail } from "@/lib/server/respond";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    exigirAdmin(req);
    return ok(devolucoes.rejeitar(params.id));
  } catch (err) {
    return fail(err);
  }
}
