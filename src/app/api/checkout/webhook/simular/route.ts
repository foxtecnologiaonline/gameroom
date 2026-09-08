import { ApiError } from "@/lib/server/auth";
import * as vendas from "@/lib/server/vendas";
import { ok, fail } from "@/lib/server/respond";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.vendaId || !["aprovado", "recusado"].includes(body?.status)) {
      throw new ApiError(400, "Payload inválido");
    }
    return ok(vendas.simularWebhook(body.vendaId, body.status));
  } catch (err) {
    return fail(err);
  }
}
