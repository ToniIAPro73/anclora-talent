'use client';

import React, { useState } from 'react';
import { Shield, UserPlus, MoreHorizontal } from 'lucide-react';
import { premiumPrimaryDarkButton } from '@/components/ui/button-styles';

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
      <div className="text-center">
        <h3 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">Colaboración Editorial</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Gestiona quién tiene acceso a este proyecto y sus permisos.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-8 shadow-[var(--shadow-strong)]">
          <div className="flex items-center justify-between mb-6">
             <h4 className="text-sm font-bold uppercase tracking-widest text-[var(--text-primary)]">Equipo con acceso</h4>
             <span className="rounded-full bg-[var(--accent-glow)] px-3 py-1 text-[10px] font-bold text-[var(--accent)]">
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
                  <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {member.role}
                  </span>
                  <button className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-6">
            <UserPlus className="h-6 w-6 text-[var(--accent)] mb-4" />
            <h4 className="text-sm font-bold text-[var(--text-primary)]">Invitar colaborador</h4>
            <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">Añade nuevos miembros mediante su correo electrónico.</p>
            
            <div className="mt-4 space-y-3">
              <input
                type="email"
                placeholder="email@anclora.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-[14px] border border-[var(--border-subtle)] bg-[var(--page-surface)] px-4 py-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
              <button className={`${premiumPrimaryDarkButton} w-full py-2.5 text-xs`}>
                Enviar Invitación
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-dashed border-[var(--border-subtle)] p-6">
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
