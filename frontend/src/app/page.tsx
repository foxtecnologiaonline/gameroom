'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Paginado, Produto } from '@/lib/types';
import { Card, ErrorMessage, Pagination, Select, formatarMoeda } from '@/components/ui';
import { ProductCover } from '@/components/ProductCover';

function CardSkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="aspect-[16/10] animate-pulse bg-zinc-200" />
      <div className="space-y-2 p-5">
        <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-200" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200" />
        <div className="h-5 w-1/2 animate-pulse rounded bg-zinc-200" />
      </div>
    </Card>
  );
}

export default function LojaPage() {
  const [pagina, setPagina] = useState(1);
  const [categoria, setCategoria] = useState('');
  const [resultado, setResultado] = useState<Paginado<Produto> | null>(null);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    const query = categoria ? `&categoria=${encodeURIComponent(categoria)}` : '';
    api
      .get<Paginado<Produto>>(`/produtos?pagina=${pagina}&tamanho=12${query}`)
      .then(setResultado)
      .catch((e) => setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar os produtos'))
      .finally(() => setCarregando(false));
  }, [pagina, categoria]);

  // lista ampla, só para popular as opções do filtro de categoria (a busca paginada acima usa tamanho=12)
  useEffect(() => {
    api
      .get<Paginado<Produto>>('/produtos?pagina=1&tamanho=100')
      .then((res) => setCategorias(Array.from(new Set(res.dados.map((p) => p.categoria).filter((c): c is string => !!c))).sort()))
      .catch(() => {});
  }, []);

  const semResultados = useMemo(() => resultado && resultado.dados.length === 0 && !carregando, [resultado, carregando]);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 px-6 py-12 text-white sm:px-10">
        <h1 className="max-w-xl text-3xl font-bold sm:text-4xl">Ativos digitais para acelerar o seu jogo</h1>
        <p className="mt-3 max-w-lg text-indigo-100">
          Chaves, licenças, cursos e conteúdos digitais com entrega automática assim que o pagamento é confirmado.
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Catálogo</h2>
          <p className="text-sm text-zinc-500">Licenças, chaves e conteúdos digitais.</p>
        </div>
        {categorias.length > 0 && (
          <Select
            className="sm:w-56"
            value={categoria}
            onChange={(e) => {
              setCategoria(e.target.value);
              setPagina(1);
            }}
          >
            <option value="">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        )}
      </div>

      <ErrorMessage>{erro}</ErrorMessage>

      {carregando && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {semResultados && <p className="text-sm text-zinc-500">Nenhum produto disponível para esse filtro.</p>}

      {!carregando && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {resultado?.dados.map((produto) => (
            <Link key={produto.id} href={`/produtos/${produto.id}`}>
              <Card className="group h-full overflow-hidden p-0 transition-shadow hover:shadow-md">
                <div className="aspect-[16/10] overflow-hidden">
                  <ProductCover
                    nome={produto.nome}
                    categoria={produto.categoria}
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">{produto.categoria ?? 'geral'}</p>
                  <h3 className="mt-1 font-medium text-zinc-900">{produto.nome}</h3>
                  {produto.descricao && <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{produto.descricao}</p>}
                  <p className="mt-3 text-lg font-semibold text-zinc-900">{formatarMoeda(produto.preco)}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {resultado && <Pagination pagina={resultado.pagina} totalPaginas={resultado.totalPaginas} onChange={setPagina} />}
    </div>
  );
}
