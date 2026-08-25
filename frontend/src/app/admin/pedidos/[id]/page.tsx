'use client';

import { use, useEffect, useState } from 'react';
import { useAuth, mensagemDeErro } from '@/lib/auth';
import { api } from '@/lib/api';
import { Pedido } from '@/lib/types';
import { Badge, Button, Card, ErrorMessage, SuccessMessage, formatarData, formatarMoeda } from '@/components/ui';

export default function AdminPedidoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { accessToken } = useAuth();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [simulando, setSimulando] = useState(false);

  async function carregar() {
    try {
      const dados = await api.get<Pedido>(`/pedidos/${id}`, accessToken);
      setPedido(dados);
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function simular(status: 'aprovado' | 'recusado') {
    setErro('');
    setMensagem('');
    setSimulando(true);
    try {
      await api.post(`/webhooks/pagamento/simular/${id}`, { status }, accessToken);
      setMensagem(`Pagamento simulado como "${status}".`);
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSimulando(false);
    }
  }

  if (erro && !pedido) return <ErrorMessage>{erro}</ErrorMessage>;
  if (!pedido) return <p className="text-sm text-zinc-500">Carregando…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pedido</h1>
        <Badge status={pedido.status} />
      </div>

      <Card className="space-y-2">
        <p>
          <span className="text-zinc-500">Comprador:</span> {pedido.compradorEmail}
        </p>
        <p>
          <span className="text-zinc-500">Total:</span> {formatarMoeda(pedido.valorTotal)}
        </p>
        <p>
          <span className="text-zinc-500">Transação (gateway):</span> {pedido.gatewayTransacaoId ?? '—'}
        </p>
        <p>
          <span className="text-zinc-500">Nota fiscal:</span> {pedido.notaFiscalId ?? 'ainda não emitida'}
        </p>
        <p>
          <span className="text-zinc-500">Criado em:</span> {formatarData(pedido.criadoEm)}
        </p>
        {pedido.confirmadoEm && (
          <p>
            <span className="text-zinc-500">Confirmado em:</span> {formatarData(pedido.confirmadoEm)}
          </p>
        )}
      </Card>

      {pedido.status === 'pendente' && (
        <Card>
          <h2 className="mb-2 font-medium">Simular pagamento</h2>
          <p className="mb-3 text-sm text-zinc-500">
            Não há gateway de pagamento real integrado neste ambiente — use estes botões para simular a confirmação
            (o mesmo caminho de código do webhook real é exercitado).
          </p>
          <div className="flex gap-2">
            <Button disabled={simulando} onClick={() => simular('aprovado')}>
              Simular aprovado
            </Button>
            <Button variant="secondary" disabled={simulando} onClick={() => simular('recusado')}>
              Simular recusado
            </Button>
          </div>
          <ErrorMessage>{erro}</ErrorMessage>
          <SuccessMessage>{mensagem}</SuccessMessage>
        </Card>
      )}

      <div className="space-y-2">
        {pedido.itens.map((item) => (
          <Card key={item.id} className="flex items-center justify-between">
            <div>
              <p>{item.produto.nome}</p>
              <p className="text-xs text-zinc-400">
                {item.emitidoEm ? `Emitido em ${formatarData(item.emitidoEm)}` : 'Ainda não emitido'}
              </p>
            </div>
            <span className="text-sm text-zinc-500">{formatarMoeda(item.valorUnitario)}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
