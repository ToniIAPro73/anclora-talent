'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { Check, Image as ImageIcon, Loader2, Sparkles } from 'lucide-react';
import { CoverCanvas } from './Canvas';
import { CoverToolbar } from './Toolbar';
import { CoverPropertyPanel } from './PropertyPanel';
import { renderCoverImageAction, saveProjectCoverAction } from '@/lib/projects/actions';
import { useCanvasStore } from '@/lib/canvas-store';
import { addTextToCanvas, addImageToCanvas, getFabric } from '@/lib/canvas-utils';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import type { ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';

export function AdvancedCoverEditor({
  project,
  copy,
}: {
  project: ProjectRecord;
  copy: AppMessages['project'];
}) {
  console.info('[AdvancedCoverEditor] Mounted with project:', {
    id: project.id,
    title: project.cover.title,
    subtitle: project.cover.subtitle,
  });

  const { canvas, addElement, clear, selectElement } = useCanvasStore();
  const [isRendering, startRenderTransition] = useTransition();
  const [rendered, setRendered] = useState(false);
  const [renderedImageUrl, setRenderedImageUrl] = useState<string | null>(project.cover.renderedImageUrl ?? null);
  const [canvasInitialized, setCanvasInitialized] = useState(false);
  const loadingRef = useRef(false);

  const loadProjectData = useCallback(async (fabricCanvas: any) => {
    if (!fabricCanvas || loadingRef.current) return;

    loadingRef.current = true;
    console.info('[AdvancedCoverEditor] Starting loadProjectData...');
    console.info('[AdvancedCoverEditor] Project data:', {
      title: project.cover.title,
      subtitle: project.cover.subtitle,
      palette: project.cover.palette,
      backgroundImageUrl: project.cover.backgroundImageUrl,
    });

    try {
      // Clear previous state to avoid duplicates
      clear();
      fabricCanvas.clear();
      selectElement(null);
      
      const fabric = await getFabric();
      const canvasWidth = fabricCanvas.width || 400;
      const canvasHeight = fabricCanvas.height || 600;

      // Set background color based on palette
      const bgColors: Record<string, string> = {
        obsidian: '#0b133f',
        teal: '#124a50',
        sand: '#f2e3b3',
      };
      fabricCanvas.set({ backgroundColor: bgColors[project.cover.palette] || '#0b133f' });

      // Load background image if exists
      if (project.cover.backgroundImageUrl) {
        console.info('[AdvancedCoverEditor] Loading background image:', project.cover.backgroundImageUrl);
        try {
          const fabricImg = (await addImageToCanvas(fabricCanvas, project.cover.backgroundImageUrl, {
            selectable: true,
            evented: true,
            id: 'background-image'
          })) as any;

          console.info('[AdvancedCoverEditor] Background image loaded, scaling...');

          // Scale to cover
          const scaleX = canvasWidth / fabricImg.width;
          const scaleY = canvasHeight / fabricImg.height;
          const scale = Math.max(scaleX, scaleY);

          fabricImg.set({
            scaleX: scale,
            scaleY: scale,
            left: canvasWidth / 2,
            top: canvasHeight / 2,
            originX: 'center',
            originY: 'center',
          });

          addElement({
            id: 'background-image',
            type: 'image',
            object: fabricImg,
            properties: { opacity: 1 }
          });

          console.info('[AdvancedCoverEditor] Background image added to canvas');
        } catch (e) {
          console.error('[AdvancedCoverEditor] Error loading background image', e);
        }
      }

      console.info('[AdvancedCoverEditor] Moving to text elements, title:', project.cover.title);

      // Add initial metadata as text objects
      const defaultTitleColor = project.cover.accentColor || (project.cover.palette === 'sand' ? '#0b313f' : '#f2e3b3');

      if (project.cover.title) {
        try {
          console.info('[AdvancedCoverEditor] Adding title:', project.cover.title);
          const titleObj = await addTextToCanvas(fabricCanvas, project.cover.title, {
            top: canvasHeight * 0.35,
            fontSize: 36,
            fontWeight: 900,
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fill: defaultTitleColor,
            textAlign: 'center',
            id: 'title-text',
            width: canvasWidth * 0.85,
            left: canvasWidth / 2,
            originX: 'center',
            selectable: true,
            evented: true
          });
          console.info('[AdvancedCoverEditor] Title object created:', titleObj);
          addElement({
            id: 'title-text',
            type: 'text',
            object: titleObj,
            properties: { fill: defaultTitleColor, fontSize: 36, opacity: 1, fontWeight: 900, textAlign: 'center' }
          });
          console.info('[AdvancedCoverEditor] Title added to canvas');
        } catch (titleError) {
          console.error('[AdvancedCoverEditor] Error adding title:', titleError);
        }
      }

      if (project.cover.subtitle) {
        console.info('[AdvancedCoverEditor] Adding subtitle:', project.cover.subtitle);
        const subtitleObj = await addTextToCanvas(fabricCanvas, project.cover.subtitle, {
          top: canvasHeight * 0.5,
          fontSize: 16,
          fontWeight: 500,
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fill: project.cover.palette === 'sand' ? 'rgba(11,49,63,0.7)' : 'rgba(242,227,179,0.8)',
          textAlign: 'center',
          id: 'subtitle-text',
          width: canvasWidth * 0.85,
          left: canvasWidth / 2,
          originX: 'center',
          selectable: true,
          evented: true
        });
        addElement({
          id: 'subtitle-text',
          type: 'text',
          object: subtitleObj,
          properties: { fill: project.cover.palette === 'sand' ? 'rgba(11,49,63,0.7)' : 'rgba(242,227,179,0.8)', fontSize: 16, opacity: 1, fontWeight: 500, textAlign: 'center' }
        });
      }

      // Setup canvas event listeners for object selection
      fabricCanvas.on('object:added', (e: any) => {
        console.info('[AdvancedCoverEditor] Object added:', e.target?.id);
      });

      fabricCanvas.on('selection:created', (e: any) => {
        console.info('[AdvancedCoverEditor] Selection created:', e.selected);
        if (e.selected && e.selected.length > 0) {
          const selectedObj = e.selected[0];
          selectElement(selectedObj.id || selectedObj.type);
        }
      });

      fabricCanvas.on('selection:updated', (e: any) => {
        console.info('[AdvancedCoverEditor] Selection updated:', e.selected);
        if (e.selected && e.selected.length > 0) {
          const selectedObj = e.selected[0];
          selectElement(selectedObj.id || selectedObj.type);
        }
      });

      fabricCanvas.on('selection:cleared', () => {
        console.info('[AdvancedCoverEditor] Selection cleared');
        selectElement(null);
      });

      fabricCanvas.requestRenderAll();
      useCanvasStore.getState().pushHistory();
      console.info('[AdvancedCoverEditor] loadProjectData completed');
    } catch (error) {
      console.error('[AdvancedCoverEditor] Error in loadProjectData:', error);
    } finally {
      loadingRef.current = false;
    }
  }, [project.cover.palette, project.cover.backgroundImageUrl, project.cover.title, project.cover.subtitle, project.cover.accentColor, addElement, clear, selectElement]);

  const handleCanvasReady = useCallback((fabricCanvas: any) => {
    console.info('[AdvancedCoverEditor] handleCanvasReady triggered');
    setCanvasInitialized(true);
    loadProjectData(fabricCanvas);
  }, [loadProjectData]);

  const handleSaveAndRender = () => {
    if (!canvas) return;
    
    startRenderTransition(async () => {
      // Export to PNG
      const dataUrl = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2,
      });

      const formData = new FormData();
      formData.set('projectId', project.id);
      formData.set('dataUrl', dataUrl);
      
      await renderCoverImageAction(formData);
      setRenderedImageUrl(dataUrl);
      setRendered(true);
      setTimeout(() => setRendered(false), 2500);
    });
  };

  return (
    <div className="space-y-6" data-testid="advanced-cover-editor">
      {/* Top Toolbar */}
      <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-4 shadow-[var(--shadow-strong)] flex items-center justify-between">
        <CoverToolbar />
        <div className="flex items-center gap-2">
           <button
            type="button"
            onClick={handleSaveAndRender}
            disabled={isRendering}
            className={`${premiumPrimaryDarkButton} px-4 py-2 text-xs`}
          >
            {isRendering ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-2 h-3.5 w-3.5" />}
            Guardar Diseño Final
          </button>
          {rendered && (
             <span className="flex items-center gap-1.5 text-xs text-[var(--accent-mint)]">
                <Check className="h-3 w-3" />
                Guardado
             </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        {/* Main Editor Area */}
        <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-8 shadow-[var(--shadow-strong)] flex flex-col items-center min-h-[700px]">
          <CoverCanvas 
            onCanvasReady={handleCanvasReady} 
            initialPalette={project.cover.palette} 
          />
          
          {renderedImageUrl && (
            <div className="mt-8 p-4 rounded-2xl bg-[var(--surface-soft)] border border-[var(--border-subtle)] w-full max-w-md">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">Última versión guardada</p>
              <img 
                src={renderedImageUrl} 
                alt="Rendered Cover" 
                className="w-24 rounded-lg shadow-lg border border-white/10" 
              />
            </div>
          )}
        </section>

        {/* Right Property Panel */}
        <aside className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 shadow-[var(--shadow-strong)] self-start sticky top-8">
          <CoverPropertyPanel />
        </aside>
      </div>
    </div>
  );
}
