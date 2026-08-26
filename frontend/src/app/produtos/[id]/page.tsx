'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Produto } from '@/lib/types';
import { Card, ErrorMessage, formatarMoeda } from '@/components/ui';
import { ProductCover } from '@/components/ProductCover';

const NOMES_TIPO_CONTEUDO: Record<string, string> = {
  manual: 'Manual',
  cartilha: 'Cartilha',
  video: 'Vídeo',
};

const SELOS_CONFIANCA = [
  { titulo: 'Entrega automática', descricao: 'Liberado assim que o pagamento é confirmado' },
  { titulo: 'Pagamento seguro', descricao: 'Verificado por assinatura no webhook do gateway' },
  { titulo: 'Suporte pós-compra', descricao: 'Devolução disponível em caso de problema' },
];

function DetalheSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
      <div className="md:col-span-2 space-y-3">
        <div className="h-3 w-24 animate-pulse rounded bg-zinc-200" />
        <div className="h-7 w-3/4 animate-pulse rounded bg-zinc-200" />
        <div className="h-4 w-full animate-pulse rounded bg-zinc-200" />
      </div>
      <div className="aspect-square animate-pulse rounded-lg bg-zinc-200" />
    </div>
  );
}

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
    return <DetalheSkeleton />;
  }

  return (
    <div>
      <nav className="mb-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-900">
          Catálogo
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-700">{produto.nome}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">{produto.categoria ?? 'geral'}</p>
          <h1 className="text-2xl font-semibold">{produto.nome}</h1>
          {produto.descricao && <p className="text-zinc-600">{produto.descricao}</p>}

          <div className="aspect-video w-full max-w-md overflow-hidden rounded-lg md:hidden">
            <ProductCover nome={produto.nome} categoria={produto.categoria} />
          </div>

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

          <dl className="grid grid-cols-1 gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-3">
            {SELOS_CONFIANCA.map((selo) => (
              <div key={selo.titulo} className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-green-100 text-green-700">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 010 1.4l-7.4 7.4a1 1 0 01-1.4 0L3.3 9.5a1 1 0 111.4-1.4l3.6 3.6 6.7-6.7a1 1 0 011.4 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <div>
                  <dt className="text-sm font-medium text-zinc-800">{selo.titulo}</dt>
                  <dd className="text-xs text-zinc-500">{selo.descricao}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-4">
          <div className="hidden aspect-square overflow-hidden rounded-lg md:block">
            <ProductCover nome={produto.nome} categoria={produto.categoria} />
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
      </div>
    </div>
  );
}
