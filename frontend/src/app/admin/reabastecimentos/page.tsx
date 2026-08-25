'use client';

import { useEffect, useState } from 'react';
import { useAuth, mensagemDeErro } from '@/lib/auth';
import { api } from '@/lib/api';
import { LogReabastecimento, Paginado } from '@/lib/types';
import { ErrorMessage, Pagination, formatarData } from '@/components/ui';

export default function AdminReabastecimentosPage() {
  const { accessToken } = useAuth();
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState<Paginado<LogReabastecimento> | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    api
      .get<Paginado<LogReabastecimento>>(`/admin/reabastecimentos?pagina=${pagina}&tamanho=20`, accessToken)
      .then(setResultado)
      .catch((e) => setErro(mensagemDeErro(e)));
  }, [accessToken, pagina]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Log de reabastecimentos</h1>
      <p className="text-sm text-zinc-500">
        Toda vez que o estoque de um produto serializado cai abaixo do limiar configurado, um novo lote é gerado
        automaticamente — sem ação manual.
      </p>

      <ErrorMessage>{erro}</ErrorMessage>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2">Produto</th>
              <th className="px-4 py-2">Quantidade gerada</th>
              <th className="px-4 py-2">Motivo</th>
              <th className="px-4 py-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {resultado?.dados.map((r) => (
              <tr key={r.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-2">{r.produto.nome}</td>
                <td className="px-4 py-2">{r.quantidadeGerada}</td>
                <td className="px-4 py-2">{r.motivo}</td>
                <td className="px-4 py-2">{formatarData(r.criadoEm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resultado && <Pagination pagina={resultado.pagina} totalPaginas={resultado.totalPaginas} onChange={setPagina} />}
    </div>
  );
}
