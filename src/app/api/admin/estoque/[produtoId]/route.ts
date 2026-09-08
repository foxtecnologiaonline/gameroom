import { exigirAdmin } from "@/lib/server/auth";
import * as estoque from "@/lib/server/estoque";
import { ok, fail } from "@/lib/server/respond";

export async function GET(req: Request, { params }: { params: { produtoId: string } }) {
  try {
    exigirAdmin(req);
    return ok(estoque.resumoEUnidades(params.produtoId));
  } catch (err) {
    return fail(err);
  }
}
