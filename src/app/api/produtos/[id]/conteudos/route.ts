import { exigirAdmin, ApiError } from "@/lib/server/auth";
import * as produtos from "@/lib/server/produtos";
import { ok, fail } from "@/lib/server/respond";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    exigirAdmin(req);
    const formData = await req.formData();
    const arquivo = formData.get("arquivo");
    const tipo = String(formData.get("tipo") || "");
    const titulo = String(formData.get("titulo") || "");
    const ordem = Number(formData.get("ordem")) || 0;
    if (!(arquivo instanceof File)) throw new ApiError(400, "Selecione um arquivo");
    if (!tipo || !titulo) throw new ApiError(400, "Informe tipo e título");

    // MVP: sem storage externo (S3) configurado — guarda só a referência do nome,
    // já que o filesystem serverless é efêmero. Ver README sobre próximos passos.
    const url = `#arquivo-${encodeURIComponent(arquivo.name)}`;
    return ok(produtos.adicionarConteudo(params.id, tipo, titulo, ordem, url), 201);
  } catch (err) {
    return fail(err);
  }
}
