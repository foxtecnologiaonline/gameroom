'use client';

import { use, useEffect, useState } from 'react';
import { useAuth, mensagemDeErro } from '@/lib/auth';
import { api } from '@/lib/api';
import { Paginado, Produto, StatusUnidade, TipoConteudo, UnidadeEstoque } from '@/lib/types';
import {
  Badge,
  Button,
  Card,
  ErrorMessage,
  Input,
  Label,
  Pagination,
  Select,
  SuccessMessage,
  Textarea,
  formatarData,
  formatarMoeda,
} from '@/components/ui';

export default function AdminProdutoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { accessToken } = useAuth();
  const [produto, setProduto] = useState<Produto | null>(null);
  const [erro, setErro] = useState('');

  async function carregar() {
    try {
      const dados = await api.get<Produto>(`/produtos/${id}`, accessToken);
      setProduto(dados);
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  useEffect(() => {
    if (accessToken) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, id]);

  if (erro) return <ErrorMessage>{erro}</ErrorMessage>;
  if (!produto) return <p className="text-sm text-zinc-500">Carregando…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{produto.nome}</h1>
          <p className="text-sm text-zinc-500">{formatarMoeda(produto.preco)}</p>
        </div>
        <Badge status={produto.status} />
      </div>

      <SecaoStatus produto={produto} onAtualizado={carregar} />

      <SecaoConteudos produto={produto} onAtualizado={carregar} />

      {produto.tipoEstoque === 'serializado' && <SecaoEstoque produtoId={produto.id} />}
    </div>
  );
}

function SecaoStatus({ produto, onAtualizado }: { produto: Produto; onAtualizado: () => void }) {
  const { accessToken } = useAuth();
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  async function mudarStatus(status: Produto['status']) {
    setErro('');
    setMensagem('');
    try {
      await api.patch(`/produtos/${produto.id}`, { status }, accessToken);
      setMensagem(`Produto atualizado para "${status}".`);
      onAtualizado();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  return (
    <Card>
      <h2 className="mb-2 font-medium">Status</h2>
      <p className="mb-3 text-sm text-zinc-500">
        Tipo de estoque: <strong>{produto.tipoEstoque}</strong>
        {produto.tipoEstoque === 'serializado' && (
          <>
            {' '}
            · Lote padrão: {produto.estoqueLotePadrao} · Limiar de reabastecimento: {produto.limiarReabastecimento}
          </>
        )}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={produto.status === 'ativo'} onClick={() => mudarStatus('ativo')}>
          Ativar
        </Button>
        <Button variant="secondary" disabled={produto.status === 'inativo'} onClick={() => mudarStatus('inativo')}>
          Inativar
        </Button>
      </div>
      <ErrorMessage>{erro}</ErrorMessage>
      <SuccessMessage>{mensagem}</SuccessMessage>
    </Card>
  );
}

function SecaoConteudos({ produto, onAtualizado }: { produto: Produto; onAtualizado: () => void }) {
  const { accessToken } = useAuth();
  const [tipo, setTipo] = useState<TipoConteudo>('manual');
  const [titulo, setTitulo] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo) return;
    setErro('');
    setEnviando(true);
    try {
      const form = new FormData();
      form.append('tipo', tipo);
      form.append('titulo', titulo);
      form.append('arquivo', arquivo);
      await api.postForm(`/produtos/${produto.id}/conteudos`, form, accessToken);
      setTitulo('');
      setArquivo(null);
      onAtualizado();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-2 font-medium">Conteúdo de apoio</h2>
      <ul className="mb-4 space-y-1 text-sm text-zinc-600">
        {produto.conteudos?.map((c) => (
          <li key={c.id}>
            [{c.tipo}] {c.titulo}
          </li>
        ))}
        {(!produto.conteudos || produto.conteudos.length === 0) && (
          <li className="text-zinc-400">Nenhum conteúdo cadastrado ainda.</li>
        )}
      </ul>

      <form onSubmit={enviar} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoConteudo)}>
          <option value="manual">Manual</option>
          <option value="cartilha">Cartilha</option>
          <option value="video">Vídeo</option>
        </Select>
        <Input
          className="sm:col-span-2"
          placeholder="Título"
          required
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <input
          type="file"
          required
          onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <div className="sm:col-span-4">
          <Button type="submit" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Adicionar conteúdo'}
          </Button>
        </div>
      </form>
      <ErrorMessage>{erro}</ErrorMessage>
    </Card>
  );
}

const OPCOES_STATUS_UNIDADE: StatusUnidade[] = [
  'aguardando_codigo',
  'disponivel',
  'reservado',
  'vendido',
  'devolvido',
  'bloqueado',
];

function SecaoEstoque({ produtoId }: { produtoId: string }) {
  const { accessToken } = useAuth();
  const [codigos, setCodigos] = useState('');
  const [resultadoImportacao, setResultadoImportacao] = useState('');
  const [erroImportacao, setErroImportacao] = useState('');
  const [importando, setImportando] = useState(false);

  const [filtroStatus, setFiltroStatus] = useState('');
  const [pagina, setPagina] = useState(1);
  const [unidades, setUnidades] = useState<Paginado<UnidadeEstoque> | null>(null);
  const [erroLista, setErroLista] = useState('');

  async function carregarUnidades() {
    try {
      const filtro = filtroStatus ? `&status=${filtroStatus}` : '';
      const dados = await api.get<Paginado<UnidadeEstoque>>(
        `/admin/estoque/${produtoId}?pagina=${pagina}&tamanho=10${filtro}`,
        accessToken,
      );
      setUnidades(dados);
    } catch (e) {
      setErroLista(mensagemDeErro(e));
    }
  }

  useEffect(() => {
    if (accessToken) carregarUnidades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, pagina, filtroStatus]);

  async function importar(e: React.FormEvent) {
    e.preventDefault();
    setErroImportacao('');
    setResultadoImportacao('');
    setImportando(true);
    try {
      const lista = codigos
        .split('\n')
        .map((c) => c.trim())
        .filter(Boolean);
      const resultado = await api.post<{ importados: number; duplicados: number; ignoradosSemVaga: number }>(
        `/admin/estoque/${produtoId}/importar-codigos`,
        { codigos: lista },
        accessToken,
      );
      setResultadoImportacao(
        `Importados: ${resultado.importados} · Duplicados: ${resultado.duplicados} · Sem vaga: ${resultado.ignoradosSemVaga}`,
      );
      setCodigos('');
      carregarUnidades();
    } catch (e) {
      setErroImportacao(mensagemDeErro(e));
    } finally {
      setImportando(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-2 font-medium">Estoque</h2>

      <form onSubmit={importar} className="mb-6 space-y-2">
        <Label>Importar códigos (um por linha)</Label>
        <Textarea rows={4} value={codigos} onChange={(e) => setCodigos(e.target.value)} placeholder={'XXXXX-XXXXX-XXXXX\nYYYYY-YYYYY-YYYYY'} />
        <Button type="submit" disabled={importando || !codigos.trim()}>
          {importando ? 'Importando…' : 'Importar códigos'}
        </Button>
        <ErrorMessage>{erroImportacao}</ErrorMessage>
        <SuccessMessage>{resultadoImportacao}</SuccessMessage>
      </form>

      <div className="mb-3 flex items-center gap-2">
        <Label>Filtrar por status</Label>
        <Select
          className="w-auto"
          value={filtroStatus}
          onChange={(e) => {
            setPagina(1);
            setFiltroStatus(e.target.value);
          }}
        >
          <option value="">Todos</option>
          {OPCOES_STATUS_UNIDADE.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      <ErrorMessage>{erroLista}</ErrorMessage>

      <div className="overflow-x-auto rounded-md border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Código importado?</th>
              <th className="px-3 py-2">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {unidades?.dados.map((u) => (
              <tr key={u.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-3 py-2 font-mono text-xs">{u.id.slice(0, 8)}</td>
                <td className="px-3 py-2">
                  <Badge status={u.status} />
                </td>
                <td className="px-3 py-2">{u.temCodigo ? 'sim' : 'não'}</td>
                <td className="px-3 py-2">{formatarData(u.criadoEm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {unidades && <Pagination pagina={unidades.pagina} totalPaginas={unidades.totalPaginas} onChange={setPagina} />}
    </Card>
  );
}
