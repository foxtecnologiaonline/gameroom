import Link from "next/link";

export default function CheckoutSucessoPage() {
  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="card p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-600">
          ✓
        </div>
        <h1 className="mb-2 text-xl font-semibold">Pagamento confirmado!</h1>
        <p className="mb-6 text-slate-600">
          Sua compra foi processada com sucesso. Você já pode acessar seus conteúdos.
        </p>
        <Link href="/minhas-compras" className="btn-primary">
          Ver minhas compras
        </Link>
      </div>
    </div>
  );
}
