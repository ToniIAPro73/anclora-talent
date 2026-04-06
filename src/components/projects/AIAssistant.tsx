'use client';

import React, { useState } from 'react';
import { Sparkles, Zap, Wand2, FileText, Check, MessageSquare } from 'lucide-react';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';

interface AISuggestion {
  id: string;
  type: 'title' | 'summary' | 'refinement';
  content: string;
  original?: string;
}

const mockSuggestions: AISuggestion[] = [
  { id: '1', type: 'title', content: 'Estrategias Editoriales para el Talento Moderno' },
  { id: '2', type: 'refinement', content: 'Mejorar la coherencia del segundo párrafo del capítulo introductorio.', original: 'El segundo párrafo es algo confuso.' },
];

export function AIAssistant() {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">Inteligencia Editorial</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Potencia tu contenido con sugerencias inteligentes basadas en el contexto de tu obra.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section className="space-y-6">
          <div className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-8 shadow-[var(--shadow-strong)]">
            <div className="flex items-center gap-3 mb-6">
               <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-glow)] text-[var(--accent)]">
                  <Sparkles className="h-4 w-4" />
               </div>
               <h4 className="text-sm font-bold uppercase tracking-widest text-[var(--text-primary)]">Sugerencias Recientes</h4>
            </div>

            <div className="space-y-4">
              {mockSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-5 transition-all hover:border-[var(--accent)]">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="rounded-full bg-[var(--surface-highlight)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                      {suggestion.type}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-[var(--text-primary)] font-medium">"{suggestion.content}"</p>
                  <div className="mt-4 flex gap-3">
                    <button className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] hover:underline">Aplicar cambio</button>
                    <button className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] hover:underline">Descartar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-soft)] p-12 text-center">
             <MessageSquare className="mx-auto h-10 w-10 text-[var(--text-muted)] mb-4" />
             <p className="text-sm text-[var(--text-secondary)]">Interactúa con el asistente para refinar partes específicas del texto.</p>
             <button className="mt-6 rounded-full border border-[var(--border-subtle)] px-6 py-2.5 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-highlight)] transition-colors">
                Abrir Chat de Edición
             </button>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[28px] bg-[var(--accent)] p-6 text-white shadow-[0_20px_40px_rgba(74,159,216,0.3)]">
            <Zap className="h-6 w-6 mb-4" />
            <h4 className="text-sm font-bold">Generación Rápida</h4>
            <p className="mt-2 text-xs leading-5 opacity-90">Analiza todo el proyecto para sugerir mejoras estructurales.</p>
            
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="mt-6 w-full rounded-xl bg-white px-4 py-3 text-xs font-bold text-[var(--accent)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isGenerating ? 'Analizando...' : 'Iniciar Análisis IA'}
            </button>
          </div>

          <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-6">
            <Wand2 className="h-5 w-5 text-[var(--text-muted)] mb-3" />
            <h5 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Capacidades</h5>
            <ul className="mt-4 space-y-3">
              {['Resumen Ejecutivo', 'Corrección de Estilo', 'SEO Metadata', 'Títulos Alternativos'].map(cap => (
                <li key={cap} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <Check className="h-3 w-3 text-[var(--accent)]" />
                  {cap}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
