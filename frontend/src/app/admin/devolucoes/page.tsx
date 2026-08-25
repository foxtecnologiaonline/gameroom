'use client';

import { useEffect, useState } from 'react';
import { useAuth, mensagemDeErro } from '@/lib/auth';
import { api } from '@/lib/api';
import { Devolucao, Paginado } from '@/lib/types';
import { Button, Card, ErrorMessage, formatarData, formatarMoeda } from '@/components/ui';

export default function AdminDevolucoesPage() {
  const { accessToken } = useAuth();
  const [resultado, setResultado] = useState<Paginado<Devolucao> | null>(null);
  const [erro, setErro] = useState('');

  async function carregar() {
    try {
      const dados = await api.get<Paginado<Devolucao>>('/admin/devolucoes/revisao-manual?tamanho=20', accessToken);
      setResultado(dados);
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
      <h1 className="text-2xl font-semibold">Devoluções — revisão manual</h1>
      <p className="text-sm text-zinc-500">
        Solicitações que não se encaixaram na regra automática (fora do prazo de 7 dias ou com conteúdo/código já
        acessado).
      </p>

      <ErrorMessage>{erro}</ErrorMessage>

      {resultado?.dados.length === 0 && <p className="text-sm text-zinc-500">Nenhuma devolução pendente de revisão.</p>}

      <div className="space-y-3">
        {resultado?.dados.map((d) => (
          <LinhaDevolucao key={d.id} devolucao={d} onDecidido={carregar} />
        ))}
      </div>
    </div>
  );
}

function LinhaDevolucao({ devolucao, onDecidido }: { devolucao: Devolucao; onDecidido: () => void }) {
  const { accessToken } = useAuth();
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const item = devolucao.itemPedido;

  async function decidir(aprovar: boolean) {
    setErro('');
    setEnviando(true);
    try {
      await api.post(`/admin/devolucoes/${devolucao.id}/decisao`, { aprovar, motivoRejeicao }, accessToken);
      onDecidido();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{item?.produto.nome ?? 'produto'}</p>
          <p className="text-sm text-zinc-500">
            Pedido: {item?.pedido?.compradorEmail} · Valor: {item && formatarMoeda(item.valorUnitario)}
          </p>
          <p className="text-sm text-zinc-500">Solicitado em: {formatarData(devolucao.criadoEm)}</p>
          {devolucao.motivo && <p className="mt-1 text-sm text-zinc-700">&ldquo;{devolucao.motivo}&rdquo;</p>}
        </div>
      </div>

      <input
        placeholder="Motivo da rejeição (se aplicável)"
        value={motivoRejeicao}
        onChange={(e) => setMotivoRejeicao(e.target.value)}
        className="mt-3 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
      />
      <div className="mt-3 flex gap-2">
        <Button disabled={enviando} onClick={() => decidir(true)}>
          Aprovar
        </Button>
        <Button variant="danger" disabled={enviando} onClick={() => decidir(false)}>
          Rejeitar
        </Button>
      </div>
      <ErrorMessage>{erro}</ErrorMessage>
    </Card>
  );
}
