'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, mensagemDeErro } from '@/lib/auth';
import { api } from '@/lib/api';
import { Paginado, Produto, TipoEstoque } from '@/lib/types';
import {
  Badge,
  Button,
  Card,
  ErrorMessage,
  Input,
  Label,
  Pagination,
  Select,
  formatarMoeda,
} from '@/components/ui';

export default function AdminProdutosPage() {
  const { accessToken } = useAuth();
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState<Paginado<Produto> | null>(null);
  const [erro, setErro] = useState('');

  async function carregar() {
    try {
      const dados = await api.get<Paginado<Produto>>(`/produtos/admin/todos?pagina=${pagina}&tamanho=10`, accessToken);
      setResultado(dados);
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  useEffect(() => {
    if (accessToken) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, pagina]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Produtos</h1>

      <FormularioCriarProduto onCriado={carregar} />

      <ErrorMessage>{erro}</ErrorMessage>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Preço</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {resultado?.dados.map((p) => (
              <tr key={p.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-2">{p.nome}</td>
                <td className="px-4 py-2">{formatarMoeda(p.preco)}</td>
                <td className="px-4 py-2">{p.tipoEstoque}</td>
                <td className="px-4 py-2">
                  <Badge status={p.status} />
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/produtos/${p.id}`} className="text-zinc-900 underline">
                    Gerenciar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resultado && <Pagination pagina={resultado.pagina} totalPaginas={resultado.totalPaginas} onChange={setPagina} />}
    </div>
  );
}

function FormularioCriarProduto({ onCriado }: { onCriado: () => void }) {
  const { accessToken } = useAuth();
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [categoria, setCategoria] = useState('');
  const [tipoEstoque, setTipoEstoque] = useState<TipoEstoque>('serializado');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aberto, setAberto] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await api.post(
        '/produtos',
        { nome, preco: Number(preco), categoria: categoria || undefined, tipoEstoque },
        accessToken,
      );
      setNome('');
      setPreco('');
      setCategoria('');
      setAberto(false);
      onCriado();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  if (!aberto) {
    return (
      <Button onClick={() => setAberto(true)}>+ Novo produto</Button>
    );
  }

  return (
    <Card>
      <form onSubmit={criar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Nome</Label>
          <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div>
          <Label>Preço (R$)</Label>
          <Input type="number" step="0.01" min="0.01" required value={preco} onChange={(e) => setPreco(e.target.value)} />
        </div>
        <div>
          <Label>Categoria</Label>
          <Input value={categoria} onChange={(e) => setCategoria(e.target.value)} />
        </div>
        <div>
          <Label>Tipo de estoque</Label>
          <Select value={tipoEstoque} onChange={(e) => setTipoEstoque(e.target.value as TipoEstoque)}>
            <option value="serializado">Serializado (chaves/licenças)</option>
            <option value="sob_demanda">Sob demanda (acesso ilimitado)</option>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <ErrorMessage>{erro}</ErrorMessage>
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={enviando}>
            {enviando ? 'Criando…' : 'Criar produto'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
