'use client';

import { useState } from 'react';
import { Shield, UserPlus, MoreHorizontal } from 'lucide-react';

interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  avatar?: string;
}

const mockCollaborators: Collaborator[] = [
  { id: '1', name: 'Antonio Ballesteros', email: 'antonio@anclora.com', role: 'owner' },
  { id: '2', name: 'Editor Premium', email: 'editor@anclora.com', role: 'editor' },
];

export function CollaborationPanel() {
  const [email, setEmail] = useState('');

  return (
    <div className="space-y-8">
      <div className="ac-section-heading place-items-center text-center">
        <h3 className="ac-section-heading__title max-w-none text-2xl">Colaboracion editorial</h3>
        <p className="ac-section-heading__summary mt-2 text-sm">
          Gestiona quien tiene acceso a este proyecto y sus permisos.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section className="ac-surface-panel">
          <div className="flex items-center justify-between mb-6">
             <h4 className="text-sm font-bold uppercase tracking-widest text-[var(--text-primary)]">Equipo con acceso</h4>
             <span className="ac-button ac-button--ghost ac-button--sm pointer-events-none">
                {mockCollaborators.length} Miembros
             </span>
          </div>

          <div className="divide-y divide-[var(--border-subtle)]">
            {mockCollaborators.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-soft)] border border-[var(--border-subtle)] text-[var(--accent)] font-bold">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{member.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="ac-button ac-button--ghost ac-button--sm pointer-events-none">
                    {member.role}
                  </span>
                  <button className="ac-button ac-button--ghost ac-button--sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="ac-surface-panel ac-surface-panel--subtle p-6">
            <UserPlus className="h-6 w-6 text-[var(--accent)] mb-4" />
            <h4 className="text-sm font-bold text-[var(--text-primary)]">Invitar colaborador</h4>
            <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">Añade nuevos miembros mediante su correo electrónico.</p>
            
            <div className="mt-4 space-y-3">
              <input
                type="email"
                placeholder="email@anclora.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field-input"
              />
              <button className="ac-button ac-button--primary w-full">
                Enviar Invitación
              </button>
            </div>
          </div>

          <div className="ac-empty-state min-h-0 p-6">
             <Shield className="h-5 w-5 text-[var(--text-muted)] mb-3" />
             <p className="text-[10px] leading-4 text-[var(--text-muted)]">
                Como propietario, puedes revocar el acceso en cualquier momento. Los cambios son instantáneos.
             </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
