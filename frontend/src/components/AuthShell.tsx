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
    <div className="mx-auto grid max-w-4xl grid-cols-1 overflow-hidden rounded-2xl shadow-sm md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-8 text-white md:flex">
        <div>
          <p className="text-lg font-semibold">GameRoom</p>
          <h1 className="mt-6 text-2xl font-bold leading-snug">{titulo}</h1>
          <p className="mt-3 text-sm text-indigo-100">{subtitulo}</p>
        </div>
        <ul className="space-y-2 text-sm text-indigo-100">
          <li>• Entrega automática após pagamento</li>
          <li>• Chaves, licenças, cursos e conteúdos</li>
          <li>• Suporte a devoluções</li>
        </ul>
      </div>
      <div className="bg-white p-6 sm:p-10">{children}</div>
    </div>
  );
}
