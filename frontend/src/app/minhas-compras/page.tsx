'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth, mensagemDeErro } from '@/lib/auth';
import { api } from '@/lib/api';
import { ItemPedido, Pedido } from '@/lib/types';
import { Badge, Button, Card, ErrorMessage, SuccessMessage, Textarea, formatarData, formatarMoeda } from '@/components/ui';

export default function MinhasComprasPage() {
  return (
    <ProtectedRoute role="cliente">
      <ListaDeCompras />
    </ProtectedRoute>
  );
}

function ListaDeCompras() {
  const { accessToken } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [erro, setErro] = useState('');

  async function carregar() {
    try {
      const dados = await api.get<Pedido[]>('/minhas-compras', accessToken);
      setPedidos(dados);
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  useEffect(() => {
    if (accessToken) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Minhas compras</h1>
      <ErrorMessage>{erro}</ErrorMessage>

      {pedidos && pedidos.length === 0 && <p className="text-sm text-zinc-500">Você ainda não fez nenhum pedido.</p>}

      <div className="space-y-4">
        {pedidos?.map((pedido) => (
          <Card key={pedido.id}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-zinc-500">{formatarData(pedido.criadoEm)}</span>
              <Badge status={pedido.status} />
            </div>
            <div className="space-y-3">
              {pedido.itens.map((item) => (
                <ItemCard key={item.id} item={item} pedidoStatus={pedido.status} onAtualizar={carregar} />
              ))}
            </div>
            <div className="mt-3 border-t border-zinc-100 pt-3 text-right text-sm font-medium">
              Total: {formatarMoeda(pedido.valorTotal)}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ItemCard({
  item,
  pedidoStatus,
  onAtualizar,
}: {
  item: ItemPedido;
  pedidoStatus: string;
  onAtualizar: () => void;
}) {
  const { accessToken } = useAuth();
  const [codigo, setCodigo] = useState<string | null>(null);
  const [mostrarFormDevolucao, setMostrarFormDevolucao] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  const devolucao = item.devolucoes?.[0];
  const confirmado = pedidoStatus === 'confirmado';

  async function verCodigo() {
    setErro('');
    try {
      const resultado = await api.get<{ codigo: string | null; pronto: boolean }>(
        `/minhas-compras/itens/${item.id}/codigo`,
        accessToken,
      );
      setCodigo(resultado.pronto ? (resultado.codigo ?? 'sem código para este item') : 'Ainda processando a emissão…');
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  async function baixarConteudo(conteudoId: string) {
    setErro('');
    try {
      const resultado = await api.get<{ url: string }>(
        `/minhas-compras/itens/${item.id}/conteudos/${conteudoId}`,
        accessToken,
      );
      window.open(resultado.url, '_blank');
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  async function solicitarDevolucao(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setMensagem('');
    try {
      await api.post(`/itens-pedido/${item.id}/devolucoes`, { motivo: motivo || undefined }, accessToken);
      setMensagem('Solicitação enviada.');
      setMostrarFormDevolucao(false);
      onAtualizar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  return (
    <div className="rounded-md border border-zinc-100 p-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">{item.produto.nome}</span>
        <span className="text-sm text-zinc-500">{formatarMoeda(item.valorUnitario)}</span>
      </div>

      {confirmado && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {item.produto.conteudos?.map((c) => (
            <Button key={c.id} variant="secondary" onClick={() => baixarConteudo(c.id)}>
              Baixar: {c.titulo}
            </Button>
          ))}
          <Button variant="secondary" onClick={verCodigo}>
            Ver código
          </Button>
          {!devolucao && (
            <Button variant="ghost" onClick={() => setMostrarFormDevolucao((v) => !v)}>
              Solicitar devolução
            </Button>
          )}
          {devolucao && (
            <span className="text-sm text-zinc-500">
              Devolução: <Badge status={devolucao.status} />
            </span>
          )}
        </div>
      )}

      {codigo && <p className="mt-2 rounded-md bg-zinc-50 px-3 py-2 font-mono text-sm">{codigo}</p>}

      {mostrarFormDevolucao && (
        <form onSubmit={solicitarDevolucao} className="mt-3 space-y-2">
          <Textarea
            placeholder="Motivo (opcional)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
          />
          <Button type="submit">Enviar solicitação</Button>
        </form>
      )}

      <ErrorMessage>{erro}</ErrorMessage>
      <SuccessMessage>{mensagem}</SuccessMessage>
    </div>
  );
}
