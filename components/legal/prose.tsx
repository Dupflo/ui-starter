// Primitives de mise en forme pour les pages légales. Contenu via i18n (fr/en).

export function LegalTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-display text-3xl font-semibold tracking-tight text-pine">
      {children}
    </h1>
  )
}

export function LegalUpdated({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 font-mono text-2xs uppercase tracking-caps text-muted">
      {children}
    </p>
  )
}

export function LegalH2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 font-display text-lg font-semibold text-ink-strong">
      {children}
    </h2>
  )
}

export function LegalP({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm leading-relaxed text-muted">{children}</p>
}

export function LegalList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
      {children}
    </ul>
  )
}

/** Champ à compléter par l'exploitant (identité société, hébergeur…). */
export function Fill({ children }: { children: React.ReactNode }) {
  return (
    <mark className="rounded bg-warning/15 px-1 py-0.5 text-warning">
      [{children}]
    </mark>
  )
}

/** Bandeau « texte indicatif — à remplacer avant production ». */
export function LegalNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-6 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm leading-relaxed text-warning">
      {children}
    </p>
  )
}
