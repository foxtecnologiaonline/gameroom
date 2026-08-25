import { Card } from '@/components/ui';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Painel administrativo</h1>
      <Card>
        <p className="text-sm text-zinc-600">
          Use o menu ao lado para gerenciar produtos e estoque, acompanhar vendas, decidir devoluções e retenções por
          suspeita de fraude, e consultar os logs de reabastecimento e auditoria.
        </p>
      </Card>
    </div>
  );
}
