'use client';

import { useEffect, useState } from 'react';
import { useAuth, mensagemDeErro } from '@/lib/auth';
import { api } from '@/lib/api';
import { Paginado, RetencaoFraude } from '@/lib/types';
import { Button, Card, ErrorMessage, formatarData, formatarMoeda } from '@/components/ui';

export default function AdminFraudePage() {
  const { accessToken } = useAuth();
  const [resultado, setResultado] = useState<Paginado<RetencaoFraude> | null>(null);
  const [erro, setErro] = useState('');

  async function carregar() {
    try {
      const dados = await api.get<Paginado<RetencaoFraude>>('/admin/fraude/retencoes?tamanho=20', accessToken);
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
      <h1 className="text-2xl font-semibold">Antifraude — pedidos retidos</h1>
      <p className="text-sm text-zinc-500">
        Pedidos pagos que dispararam um sinal de risco (velocidade de compras ou devoluções recentes) e tiveram a
        emissão suspensa até esta decisão.
      </p>

      <ErrorMessage>{erro}</ErrorMessage>

      {resultado?.dados.length === 0 && <p className="text-sm text-zinc-500">Nenhum pedido retido no momento.</p>}

      <div className="space-y-3">
        {resultado?.dados.map((r) => (
          <LinhaRetencao key={r.id} retencao={r} onDecidido={carregar} />
        ))}
      </div>
    </div>
  );
}

function LinhaRetencao({ retencao, onDecidido }: { retencao: RetencaoFraude; onDecidido: () => void }) {
  const { accessToken } = useAuth();
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function decidir(liberar: boolean) {
    setErro('');
    setEnviando(true);
    try {
      await api.post(`/admin/fraude/retencoes/${retencao.id}/decisao`, { liberar }, accessToken);
      onDecidido();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card>
      <p className="font-medium">{retencao.pedido?.compradorEmail}</p>
      <p className="text-sm text-zinc-500">
        {retencao.pedido && formatarMoeda(retencao.pedido.valorTotal)} · {formatarData(retencao.criadoEm)}
      </p>
      <p className="mt-1 text-sm text-amber-700">{retencao.motivo}</p>

      <div className="mt-3 flex gap-2">
        <Button disabled={enviando} onClick={() => decidir(true)}>
          Liberar (emitir normalmente)
        </Button>
        <Button variant="danger" disabled={enviando} onClick={() => decidir(false)}>
          Bloquear e estornar
        </Button>
      </div>
      <ErrorMessage>{erro}</ErrorMessage>
    </Card>
  );
}
