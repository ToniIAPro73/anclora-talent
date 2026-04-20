'use client';

import { useState } from 'react';
import { Sparkles, MessageSquare, Zap, Wand2, Check } from 'lucide-react';

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
      <div className="ac-section-heading place-items-center text-center">
        <h3 className="ac-section-heading__title max-w-none text-2xl">Inteligencia editorial</h3>
        <p className="ac-section-heading__summary mt-2 text-sm">
          Potencia tu contenido con sugerencias inteligentes basadas en el contexto de tu obra.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section className="space-y-6">
          <div className="ac-surface-panel">
            <div className="flex items-center gap-3 mb-6">
               <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-glow)] text-[var(--accent)]">
                  <Sparkles className="h-4 w-4" />
               </div>
               <h4 className="text-sm font-bold uppercase tracking-widest text-[var(--text-primary)]">Sugerencias Recientes</h4>
            </div>

            <div className="space-y-4">
              {mockSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="ac-card ac-card--subtle p-5 transition-all hover:border-[var(--accent)]">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="ac-button ac-button--ghost ac-button--sm pointer-events-none">
                      {suggestion.type}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-[var(--text-primary)] font-medium">&quot;{suggestion.content}&quot;</p>
                  <div className="mt-4 flex gap-3">
                    <button className="ac-button ac-button--primary ac-button--sm">Aplicar cambio</button>
                    <button className="ac-button ac-button--ghost ac-button--sm">Descartar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ac-empty-state">
             <MessageSquare className="mx-auto h-10 w-10 text-[var(--text-muted)] mb-4" />
             <p className="text-sm text-[var(--text-secondary)]">Interactúa con el asistente para refinar partes específicas del texto.</p>
             <button className="ac-button ac-button--secondary mt-6">
                Abrir Chat de Edición
             </button>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="ac-surface-panel ac-surface-panel--strong p-6">
            <Zap className="h-6 w-6 mb-4" />
            <h4 className="text-sm font-bold">Generación Rápida</h4>
            <p className="mt-2 text-xs leading-5 opacity-90">Analiza todo el proyecto para sugerir mejoras estructurales.</p>
            
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="ac-button ac-button--primary mt-6 w-full"
            >
              {isGenerating ? 'Analizando...' : 'Iniciar Análisis IA'}
            </button>
          </div>

          <div className="ac-surface-panel ac-surface-panel--subtle p-6">
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
