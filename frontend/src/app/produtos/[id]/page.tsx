'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Produto } from '@/lib/types';
import { Card, ErrorMessage, formatarMoeda } from '@/components/ui';

const NOMES_TIPO_CONTEUDO: Record<string, string> = {
  manual: 'Manual',
  cartilha: 'Cartilha',
  video: 'Vídeo',
};

export default function ProdutoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [produto, setProduto] = useState<Produto | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api
      .get<Produto>(`/produtos/${id}`)
      .then(setProduto)
      .catch((e) => setErro(e instanceof ApiError ? e.message : 'Produto não encontrado'));
  }, [id]);

  if (erro) {
    return <ErrorMessage>{erro}</ErrorMessage>;
  }
  if (!produto) {
    return <p className="text-sm text-zinc-500">Carregando…</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
      <div className="md:col-span-2 space-y-4">
        <p className="text-xs uppercase tracking-wide text-zinc-400">{produto.categoria ?? 'geral'}</p>
        <h1 className="text-2xl font-semibold">{produto.nome}</h1>
        {produto.descricao && <p className="text-zinc-600">{produto.descricao}</p>}

        {produto.conteudos && produto.conteudos.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-medium text-zinc-700">Inclui</h2>
            <ul className="space-y-1 text-sm text-zinc-600">
              {produto.conteudos.map((c) => (
                <li key={c.id}>
                  <span className="text-zinc-400">[{NOMES_TIPO_CONTEUDO[c.tipo] ?? c.tipo}]</span> {c.titulo}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-zinc-400">Liberado para download após a confirmação da compra.</p>
          </div>
        )}
      </div>

      <Card className="h-fit space-y-4">
        <p className="text-2xl font-semibold">{formatarMoeda(produto.preco)}</p>
        <button
          onClick={() => router.push(`/checkout/${produto.id}`)}
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Comprar
        </button>
      </Card>
    </div>
  );
}
