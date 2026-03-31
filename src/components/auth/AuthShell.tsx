type AuthShellProps = {
  mode: 'sign-in' | 'sign-up';
  children: React.ReactNode;
};

const authCopy = {
  'sign-in': {
    eyebrow: 'Acceso premium',
    title: 'Vuelve a tu workspace editorial con una experiencia a la altura del producto.',
    description:
      'Accede a tus proyectos, recupera contexto y continúa donde lo dejaste sin romper la continuidad visual ni operativa.',
    accent: 'Recupera ritmo, foco y consistencia en segundos.',
  },
  'sign-up': {
    eyebrow: 'Alta premium',
    title: 'Entra en Anclora Talent con una capa de acceso que ya transmite producto.',
    description:
      'Crea tu cuenta y empieza a trabajar sobre un flujo editorial real, persistente y visualmente coherente desde el primer minuto.',
    accent: 'Registro, proyecto, editor, preview y portada dentro del mismo sistema.',
  },
} satisfies Record<AuthShellProps['mode'], { eyebrow: string; title: string; description: string; accent: string }>;

export function AuthShell({ mode, children }: AuthShellProps) {
  const copy = authCopy[mode];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(13,148,136,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(180,83,9,0.12),_transparent_24%),linear-gradient(180deg,_#f8f4eb_0%,_#efe6d7_100%)] px-4 py-6 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden rounded-[40px] border border-black/8 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.18),_transparent_26%),linear-gradient(180deg,_#101827_0%,_#172236_100%)] p-8 text-white shadow-[0_28px_100px_rgba(15,23,42,0.22)] sm:p-10 lg:p-12">
          <div className="pointer-events-none absolute -right-20 top-8 h-64 w-64 rounded-full bg-teal-300/18 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/4 h-52 w-52 rounded-full bg-amber-200/10 blur-3xl" />

          <div className="relative flex h-full flex-col justify-between gap-10">
            <div>
              <div className="inline-flex items-center rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/72">
                {copy.eyebrow}
              </div>
              <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                {copy.title}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/74 sm:text-lg">
                {copy.description}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/7 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">01</p>
                <p className="mt-3 text-sm font-semibold text-white/92">Identidad protegida</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/7 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">02</p>
                <p className="mt-3 text-sm font-semibold text-white/92">Persistencia real</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/7 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">03</p>
                <p className="mt-3 text-sm font-semibold text-white/92">Acabado premium</p>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/7 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-200">Contrato de producto</p>
              <p className="mt-4 max-w-2xl text-lg font-semibold leading-8 text-white/92">
                {copy.accent}
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center rounded-[40px] border border-black/8 bg-[linear-gradient(180deg,_rgba(255,255,255,0.84)_0%,_rgba(255,252,247,0.94)_100%)] p-4 shadow-[0_28px_90px_rgba(17,24,39,0.08)] backdrop-blur sm:p-6">
          <div className="w-full max-w-[460px] rounded-[32px] border border-black/8 bg-white/88 p-3 shadow-[0_18px_60px_rgba(17,24,39,0.08)]">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
