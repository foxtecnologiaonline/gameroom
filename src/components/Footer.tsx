import Link from "next/link";

const COLUNAS = [
  {
    titulo: "Marketplace",
    links: [
      { href: "/produtos", label: "Todos os produtos" },
      { href: "/produtos?categoria=Chave%20de%20Jogo", label: "Chaves de jogo" },
      { href: "/produtos?categoria=Gift%20Card", label: "Gift cards" },
      { href: "/produtos?categoria=Assinatura", label: "Assinaturas" },
    ],
  },
  {
    titulo: "Minha conta",
    links: [
      { href: "/login", label: "Entrar" },
      { href: "/registro", label: "Criar conta" },
      { href: "/minhas-compras", label: "Minhas compras" },
    ],
  },
  {
    titulo: "Suporte",
    links: [
      { href: "/minhas-compras", label: "Solicitar devolução" },
      { href: "/produtos", label: "Central de ajuda" },
    ],
  },
];

const SELOS = ["Entrega automática", "Pagamento seguro", "Devolução facilitada"];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-violet-600 text-xs font-bold text-white">
                G
              </span>
              <span className="text-base font-bold text-slate-900">Gameroom</span>
            </div>
            <p className="text-sm text-slate-500">
              Marketplace de ativos digitais com entrega automática assim que o pagamento é confirmado.
            </p>
          </div>
          {COLUNAS.map((coluna) => (
            <div key={coluna.titulo}>
              <p className="mb-3 text-sm font-semibold text-slate-900">{coluna.titulo}</p>
              <ul className="space-y-2">
                {coluna.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link href={link.href} className="text-sm text-slate-500 hover:text-brand-700">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-6">
          {SELOS.map((selo) => (
            <span key={selo} className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-green-600">
                <path
                  fillRule="evenodd"
                  d="M16.7 5.3a1 1 0 010 1.4l-7.4 7.4a1 1 0 01-1.4 0L3.3 9.5a1 1 0 111.4-1.4l3.6 3.6 6.7-6.7a1 1 0 011.4 0z"
                  clipRule="evenodd"
                />
              </svg>
              {selo}
            </span>
          ))}
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Gameroom &copy; {new Date().getFullYear()} — plataforma de ativos digitais
        </p>
      </div>
    </footer>
  );
}
