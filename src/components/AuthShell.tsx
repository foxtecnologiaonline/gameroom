const BENEFICIOS = [
  "Entrega automática após pagamento",
  "Chaves, gift cards, cursos e assets",
  "Suporte a devoluções",
];

export function AuthShell({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 overflow-hidden rounded-2xl shadow-soft md:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-violet-600 p-8 text-white md:flex">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-xs font-bold">
              G
            </span>
            <p className="text-lg font-bold">Gameroom</p>
          </div>
          <h1 className="mt-6 text-2xl font-bold leading-snug">{titulo}</h1>
          <p className="mt-3 text-sm text-brand-100">{subtitulo}</p>
        </div>
        <ul className="relative space-y-2.5 text-sm text-brand-100">
          {BENEFICIOS.map((beneficio) => (
            <li key={beneficio} className="flex items-center gap-2">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 flex-none text-white">
                <path
                  fillRule="evenodd"
                  d="M16.7 5.3a1 1 0 010 1.4l-7.4 7.4a1 1 0 01-1.4 0L3.3 9.5a1 1 0 111.4-1.4l3.6 3.6 6.7-6.7a1 1 0 011.4 0z"
                  clipRule="evenodd"
                />
              </svg>
              {beneficio}
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-white p-6 sm:p-10">{children}</div>
    </div>
  );
}
