'use client';

import React, { useState } from 'react';
import { Book, Check, Eye, Palette } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';

interface Template {
  id: string;
  name: string;
  description: string;
  previewColor: string;
  features: string[];
}

const templates: Template[] = [
  {
    id: 'obsidian',
    name: 'Obsidian Premium',
    description: 'Elegancia profunda con contrastes dorados. Ideal para informes ejecutivos y libros de marca.',
    previewColor: 'bg-[#0b133f]',
    features: ['Tipografía Serif', 'Acentos Dorados', 'Espaciado Ejecutivo'],
  },
  {
    id: 'teal',
    name: 'Teal Modern',
    description: 'Equilibrio perfecto entre profesionalidad y frescura. Para manuales técnicos y guías creativas.',
    previewColor: 'bg-[#124a50]',
    features: ['Tipografía Sans', 'Acentos Mint', 'Diseño Limpio'],
  },
  {
    id: 'sand',
    name: 'Sand Classic',
    description: 'Estilo atemporal inspirado en el papel premium. Perfecto para biografías y catálogos.',
    previewColor: 'bg-[#f2e3b3]',
    features: ['Fondo Crema', 'Contraste Suave', 'Legibilidad Máxima'],
  },
];

export function TemplateSelector({
  selectedTemplateId,
  onSelect,
  copy,
}: {
  selectedTemplateId: string;
  onSelect: (id: string) => void;
  copy: AppMessages['project'];
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">Selecciona una Plantilla</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Elige el estilo visual que mejor defina tu publicación.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {templates.map((template) => {
          const isSelected = selectedTemplateId === template.id;
          return (
            <button
              key={template.id}
              onClick={() => onSelect(template.id)}
              className={`group relative flex flex-col overflow-hidden rounded-[32px] border transition-all duration-300 text-left ${
                isSelected
                  ? 'border-[var(--accent)] bg-[var(--surface-soft)] ring-4 ring-[var(--accent-glow)]'
                  : 'border-[var(--border-subtle)] bg-[var(--page-surface)] hover:border-[var(--border-strong)]'
              }`}
            >
              {/* Preview Area */}
              <div className={`aspect-[4/3] w-full ${template.previewColor} relative flex items-center justify-center transition-transform duration-500 group-hover:scale-105`}>
                 <Book className={`h-12 w-12 ${template.id === 'sand' ? 'text-[#0b313f]' : 'text-[#f2e3b3]'}`} />
                 {isSelected && (
                   <div className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg">
                     <Check className="h-4 w-4" />
                   </div>
                 )}
              </div>

              {/* Content Area */}
              <div className="flex flex-1 flex-col p-6">
                <h4 className="text-lg font-black tracking-tight text-[var(--text-primary)]">{template.name}</h4>
                <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">{template.description}</p>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  {template.features.map((feature) => (
                    <span key={feature} className="rounded-full bg-[var(--surface-soft)] border border-[var(--border-subtle)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {feature}
                    </span>
                  ))}
                </div>

                <div className="mt-auto pt-6 flex items-center justify-between">
                   <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'}`}>
                      {isSelected ? 'Seleccionada' : 'Seleccionar'}
                   </span>
                   <Eye className="h-4 w-4 text-[var(--text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-[28px] bg-[var(--surface-highlight)] border border-[var(--border-subtle)] p-6 text-center">
         <Palette className="mx-auto h-6 w-6 text-[var(--accent)] mb-3" />
         <p className="text-sm font-semibold text-[var(--text-primary)]">¿Buscas algo más personalizado?</p>
         <p className="text-xs text-[var(--text-secondary)] mt-1">Próximamente podrás crear tus propias plantillas corporativas.</p>
      </div>
    </div>
  );
}
