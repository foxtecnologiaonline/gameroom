import { exigirAdmin } from "@/lib/server/auth";
import * as estoque from "@/lib/server/estoque";
import { ok, fail } from "@/lib/server/respond";

export async function GET(req: Request) {
  try {
    exigirAdmin(req);
    return ok(estoque.listarReabastecimentos());
  } catch (err) {
    return fail(err);
  }
}
