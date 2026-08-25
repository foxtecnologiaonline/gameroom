'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Paginado, Produto } from '@/lib/types';
import { Card, ErrorMessage, Pagination, formatarMoeda } from '@/components/ui';

export default function LojaPage() {
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState<Paginado<Produto> | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    api
      .get<Paginado<Produto>>(`/produtos?pagina=${pagina}&tamanho=12`)
      .then(setResultado)
      .catch((e) => setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar os produtos'))
      .finally(() => setCarregando(false));
  }, [pagina]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Catálogo</h1>
        <p className="text-sm text-zinc-500">Licenças, chaves e conteúdos digitais.</p>
      </div>

      <ErrorMessage>{erro}</ErrorMessage>

      {carregando && <p className="text-sm text-zinc-500">Carregando…</p>}

      {resultado && resultado.dados.length === 0 && !carregando && (
        <p className="text-sm text-zinc-500">Nenhum produto disponível no momento.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {resultado?.dados.map((produto) => (
          <Link key={produto.id} href={`/produtos/${produto.id}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <p className="text-xs uppercase tracking-wide text-zinc-400">{produto.categoria ?? 'geral'}</p>
              <h2 className="mt-1 font-medium text-zinc-900">{produto.nome}</h2>
              {produto.descricao && <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{produto.descricao}</p>}
              <p className="mt-3 text-lg font-semibold text-zinc-900">{formatarMoeda(produto.preco)}</p>
            </Card>
          </Link>
        ))}
      </div>

      {resultado && <Pagination pagina={resultado.pagina} totalPaginas={resultado.totalPaginas} onChange={setPagina} />}
    </div>
  );
}
