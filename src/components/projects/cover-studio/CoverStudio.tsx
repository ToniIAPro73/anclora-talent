'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { toPng } from 'html-to-image';
import {
  renderBackCoverImageAction,
  renderCoverImageAction,
  saveBackCoverAction,
  saveProjectCoverAction,
} from '@/lib/projects/actions';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import { Slider } from '@/components/ui/slider';
import { useGoogleFonts } from '@/hooks/use-google-fonts';
import { resizeImage } from '@/lib/ui/images';
import {
  applySurfaceTemplate,
  mergePartialSurfaceUpdate,
  type SurfaceFieldKey,
  type SurfaceKind,
  type SurfaceLayer,
  type SurfaceState,
} from '@/lib/projects/cover-surface';
import { createSurfaceSnapshotFromProject } from '@/lib/projects/surface-snapshot';
import { BACK_COVER_TEMPLATES, COVER_TEMPLATES } from '@/lib/projects/cover-templates';
import { COVER_SURFACE_CANVAS } from '@/lib/projects/cover-layout';
import { findSurfaceTextLayer } from '@/lib/projects/cover-layer-style';
import type { CoverDesign, ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';
import { SurfaceCanvas } from './SurfaceCanvas';
import { SurfaceInspector, SurfaceInspectorEmpty, type LayerStylePatch } from './SurfaceInspector';
import { computeLayerStyle } from './surface-layer-style';

type CoverStudioProps = {
  surface: SurfaceKind;
  project: ProjectRecord;
  copy: AppMessages['project'];
};

type StudioMode = 'simple' | 'advanced';

const ACCENT_PRESETS = ['#d4af37', '#4fd1c5', '#f6a35c', '#a78bfa', '#f87171', '#34d399'];

const TEMPLATE_TONE_TO_PALETTE: Record<string, CoverDesign['palette']> = {
  obsidian: 'obsidian',
  teal: 'teal',
  sand: 'sand',
};

function inferTemplateId(templates: readonly { id: string; layout: { kind: string } }[], layoutKind: string) {
  return templates.find((template) => template.layout.kind === layoutKind)?.id ?? templates[0]?.id ?? '';
}

function upsertLayer(
  layers: SurfaceLayer[] | undefined,
  surface: SurfaceKind,
  fieldKey: SurfaceFieldKey,
  patch: Partial<SurfaceLayer>,
): SurfaceLayer[] {
  const current = layers ?? [];
  const index = current.findIndex((layer) => layer.type === 'text' && layer.fieldKey === fieldKey);

  if (index >= 0) {
    return current.map((layer, position) =>
      position === index ? { ...layer, ...patch, fieldKey } : layer,
    );
  }

  return [
    ...current,
    { id: `${surface}-${fieldKey}`, type: 'text', fieldKey, ...patch },
  ];
}

/**
 * Unified cover/back-cover studio. A single editor with two modes sharing the
 * exact same SurfaceState:
 * - simple: guided template + field editing.
 * - advanced: free layer positioning/typography directly on the DOM canvas.
 * Text renders 100% as DOM (no Fabric), so what the user sees is literally
 * the node that `html-to-image` exports.
 */
export function CoverStudio({ surface, project, copy }: CoverStudioProps) {
  const router = useRouter();
  const { loadFont } = useGoogleFonts();
  const design = surface === 'cover' ? project.cover : project.backCover;
  const templates = surface === 'cover' ? COVER_TEMPLATES : BACK_COVER_TEMPLATES;
  const fieldKeys: SurfaceFieldKey[] =
    surface === 'cover' ? ['title', 'subtitle', 'author'] : ['title', 'body', 'authorBio'];
  const fieldLabels: Record<SurfaceFieldKey, string> = {
    title: surface === 'cover' ? copy.coverTitleLabel : copy.backCoverTitleLabel,
    subtitle: copy.coverSubtitleLabel,
    author: copy.coverAuthorLabel,
    body: copy.backCoverBodyLabel,
    authorBio: copy.backCoverAuthorBioLabel,
  };

  const [state, setState] = useState<SurfaceState>(() =>
    createSurfaceSnapshotFromProject(surface, project),
  );
  const [palette, setPalette] = useState<CoverDesign['palette']>(project.cover.palette);
  const [accentColor, setAccentColor] = useState<string>(
    project.backCover.accentColor ?? ACCENT_PRESETS[0],
  );
  const [mode, setMode] = useState<StudioMode>(() =>
    (design.surfaceState?.layers ?? []).some((layer) => layer.type === 'text' && layer.fieldKey)
      ? 'advanced'
      : 'simple',
  );
  const [selectedFieldKey, setSelectedFieldKey] = useState<SurfaceFieldKey | null>(null);
  const [editingFieldKey, setEditingFieldKey] = useState<SurfaceFieldKey | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(() =>
    inferTemplateId(templates, state.layout.kind),
  );
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(
    design.backgroundImageUrl,
  );
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [renderedImageUrl, setRenderedImageUrl] = useState<string | null>(
    design.renderedImageUrl ?? null,
  );
  const [rendered, setRendered] = useState(false);
  const [isRendering, startRenderTransition] = useTransition();
  const surfaceNodeRef = useRef<HTMLDivElement>(null);

  // Load every Google Font referenced by the layers so the canvas (and the
  // exported image, which captures this same node) uses the real typeface.
  const layerFontFamilies = useMemo(
    () =>
      (state.layers ?? [])
        .map((layer) => layer.fontFamily)
        .filter((family): family is string => Boolean(family?.trim())),
    [state.layers],
  );
  useEffect(() => {
    for (const family of new Set(layerFontFamilies)) {
      loadFont(family);
    }
  }, [layerFontFamilies, loadFont]);

  const updateFieldValue = useCallback(
    (fieldKey: SurfaceFieldKey, value: string) => {
      setState((current) =>
        mergePartialSurfaceUpdate(current, {
          fields: { [fieldKey]: { value, visible: Boolean(value.trim()) } },
        }),
      );
    },
    [],
  );

  const toggleFieldVisibility = useCallback((fieldKey: SurfaceFieldKey) => {
    setState((current) => {
      const field = current.fields[fieldKey];
      if (!field?.value.trim()) return current;
      return mergePartialSurfaceUpdate(current, {
        fields: { [fieldKey]: { value: field.value, visible: !field.visible } },
      });
    });
  }, []);

  const patchLayer = useCallback(
    (fieldKey: SurfaceFieldKey, patch: Partial<SurfaceLayer>) => {
      setState((current) => ({
        ...current,
        layers: upsertLayer(current.layers, surface, fieldKey, patch),
      }));
    },
    [surface],
  );

  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      const template = templates.find((item) => item.id === templateId);
      if (!template) return;
      setSelectedTemplateId(templateId);
      setState((current) => applySurfaceTemplate(current, template));
      if (surface === 'cover') {
        setPalette(TEMPLATE_TONE_TO_PALETTE[template.previewTone] ?? palette);
      }
      for (const style of Object.values(template.layerStyles ?? {})) {
        if (style?.fontFamily) loadFont(style.fontFamily);
      }
    },
    [templates, surface, palette, loadFont],
  );

  const handleBackgroundFileChange = (file: File | null) => {
    setBackgroundFile(file);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setBackgroundImageUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAndRender = () => {
    startRenderTransition(async () => {
      const normalizedState = mergePartialSurfaceUpdate(state, {});

      const persistenceData = new FormData();
      persistenceData.set('projectId', project.id);
      persistenceData.set('surfaceState', JSON.stringify(normalizedState));

      if (backgroundFile) {
        const file =
          backgroundFile.size > 4 * 1024 * 1024
            ? await resizeImage(backgroundFile)
            : backgroundFile;
        persistenceData.set('backgroundImage', file, `${surface}.jpg`);
      }

      if (surface === 'cover') {
        persistenceData.set('title', normalizedState.fields.title?.value ?? project.cover.title);
        persistenceData.set(
          'subtitle',
          normalizedState.fields.subtitle?.value ?? project.cover.subtitle,
        );
        persistenceData.set('palette', palette);
        persistenceData.set('currentBackgroundImageUrl', project.cover.backgroundImageUrl ?? '');
        persistenceData.set('currentThumbnailUrl', project.cover.thumbnailUrl ?? '');
        persistenceData.set(
          'showSubtitle',
          String(normalizedState.fields.subtitle?.visible ?? false),
        );
        persistenceData.set('layout', project.cover.layout ?? 'centered');
        persistenceData.set('fontFamily', project.cover.fontFamily ?? '');
        persistenceData.set('accentColor', project.cover.accentColor ?? '');
        await saveProjectCoverAction(persistenceData);
      } else {
        persistenceData.set('title', normalizedState.fields.title?.value ?? project.backCover.title);
        persistenceData.set('body', normalizedState.fields.body?.value ?? project.backCover.body);
        persistenceData.set(
          'authorBio',
          normalizedState.fields.authorBio?.value ?? project.backCover.authorBio,
        );
        persistenceData.set('accentColor', project.backCover.accentColor ?? accentColor);
        persistenceData.set(
          'currentBackgroundImageUrl',
          project.backCover.backgroundImageUrl ?? '',
        );
        await saveBackCoverAction(persistenceData);
      }

      if (surfaceNodeRef.current) {
        const dataUrl = await toPng(surfaceNodeRef.current, {
          cacheBust: true,
          pixelRatio: 2,
          width: COVER_SURFACE_CANVAS.width,
          height: COVER_SURFACE_CANVAS.height,
        });

        const formData = new FormData();
        formData.set('projectId', project.id);
        formData.set('dataUrl', dataUrl);

        if (surface === 'cover') {
          await renderCoverImageAction(formData);
        } else {
          await renderBackCoverImageAction(formData);
        }

        setRenderedImageUrl(dataUrl);
      }

      setRendered(true);
      setTimeout(() => setRendered(false), 2500);
      router.refresh();
    });
  };

  const selectedComputed = selectedFieldKey
    ? computeLayerStyle(
        selectedFieldKey,
        findSurfaceTextLayer(state.layers, selectedFieldKey),
        { surface, palette, accentColor },
      )
    : null;

  const backgroundControls = (
    <div className="space-y-4">
      <label className="ac-form-field">
        <span className="ac-form-field__label">{copy.coverBackgroundLabel}</span>
        <input
          type="file"
          accept="image/*"
          aria-label={copy.coverBackgroundLabel}
          onChange={(event) => handleBackgroundFileChange(event.target.files?.[0] ?? null)}
          className="block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--button-highlight-bg)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--button-highlight-fg)]"
        />
      </label>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {copy.coverOpacityLabel}
          </span>
          <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
            {Math.round((state.opacity ?? 1) * 100)}%
          </span>
        </div>
        <Slider
          value={[Math.round((state.opacity ?? 1) * 100)]}
          min={0}
          max={100}
          step={1}
          onValueChange={(val) =>
            setState((current) => ({ ...current, opacity: val[0] / 100 }))
          }
        />
      </div>
    </div>
  );

  return (
    <div className="ac-editor-studio" data-testid={`cover-studio-${surface}`}>
      <div className="ac-editor-studio__topbar">
        <div className="ac-editor-studio__headline">
          <p className="ac-editor-studio__eyebrow">{copy.coverStudioEyebrow}</p>
          <h3 className="ac-editor-studio__title">
            {surface === 'cover' ? copy.stepCover : copy.stepBackCover}
          </h3>
          <p className="ac-editor-studio__summary">
            {mode === 'simple' ? copy.coverStudioSimpleSummary : copy.coverStudioAdvancedSummary}
          </p>
        </div>

        <div className="ac-editor-studio__actions">
          <button
            type="button"
            onClick={() => setMode(mode === 'simple' ? 'advanced' : 'simple')}
            className={`${premiumSecondaryLightButton} px-4 py-2 text-xs`}
            data-testid={`cover-studio-mode-toggle-${surface}`}
          >
            {mode === 'simple' ? copy.coverSwitchToAdvanced : copy.coverSwitchToBasic}
          </button>
          <button
            type="button"
            onClick={handleSaveAndRender}
            disabled={isRendering}
            className={`${premiumPrimaryDarkButton} px-5 disabled:opacity-60`}
          >
            {isRendering ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-3.5 w-3.5" />
            )}
            {copy.coverStudioSaveDesign}
          </button>
          {rendered && (
            <span className="ac-editor-studio__status">
              <Check className="h-3 w-3" />
              {copy.coverStudioSaved}
            </span>
          )}
        </div>
      </div>

      <div className="ac-editor-studio__layout">
        <section className="ac-editor-canvas-stage min-w-0">
          <div className="ac-editor-canvas-stage__header">
            <p className="ac-editor-studio__eyebrow">{copy.coverStudioCanvasLabel}</p>
          </div>

          <div className="ac-editor-canvas-stage__viewport min-w-0">
            <SurfaceCanvas
              ref={surfaceNodeRef}
              surface={surface}
              state={state}
              palette={palette}
              accentColor={surface === 'back-cover' ? accentColor : null}
              backgroundImageUrl={backgroundImageUrl}
              interactive={mode === 'advanced'}
              selectedFieldKey={selectedFieldKey}
              editingFieldKey={editingFieldKey}
              onSelectField={setSelectedFieldKey}
              onEditField={setEditingFieldKey}
              onLayerGeometryChange={(fieldKey, geometry) => patchLayer(fieldKey, geometry)}
              onFieldTextChange={updateFieldValue}
            />
          </div>

          {renderedImageUrl && (
            <div className="ac-editor-canvas-stage__preview">
              <p className="ac-editor-canvas-stage__preview-label">
                {copy.coverRenderedImageLabel}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={renderedImageUrl}
                alt={copy.coverRenderedImageLabel}
                className="ac-editor-canvas-stage__preview-image"
              />
            </div>
          )}
        </section>

        <aside className="ac-editor-inspector space-y-6">
          {mode === 'simple' ? (
            <>
              <div className="ac-editor-inspector__section space-y-4">
                <h3 className="ac-editor-inspector__title">{copy.coverStudioTemplateLabel}</h3>
                <select
                  aria-label={copy.coverStudioTemplateLabel}
                  value={selectedTemplateId}
                  onChange={(event) => handleTemplateSelect(event.target.value)}
                  className="field-select"
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ac-editor-inspector__section space-y-4">
                <h3 className="ac-editor-inspector__title">{copy.coverStudioFieldsLegend}</h3>
                {fieldKeys.map((fieldKey) => (
                  <label key={fieldKey} className="ac-form-field">
                    <span className="ac-form-field__label">{fieldLabels[fieldKey]}</span>
                    {fieldKey === 'subtitle' || fieldKey === 'body' || fieldKey === 'authorBio' ? (
                      <textarea
                        aria-label={fieldLabels[fieldKey]}
                        value={state.fields[fieldKey]?.value ?? ''}
                        onChange={(event) => updateFieldValue(fieldKey, event.target.value)}
                        rows={fieldKey === 'subtitle' ? 2 : 4}
                        className="field-textarea"
                      />
                    ) : (
                      <input
                        aria-label={fieldLabels[fieldKey]}
                        value={state.fields[fieldKey]?.value ?? ''}
                        onChange={(event) => updateFieldValue(fieldKey, event.target.value)}
                        className="field-input"
                      />
                    )}
                  </label>
                ))}
              </div>

              <div className="ac-editor-inspector__section space-y-4">
                {surface === 'cover' ? (
                  <label className="ac-form-field">
                    <span className="ac-form-field__label">{copy.coverPaletteLabel}</span>
                    <select
                      aria-label={copy.coverPaletteLabel}
                      value={palette}
                      onChange={(event) =>
                        setPalette(event.target.value as CoverDesign['palette'])
                      }
                      className="field-select"
                    >
                      <option value="obsidian">{copy.paletteObsidian}</option>
                      <option value="teal">{copy.paletteTeal}</option>
                      <option value="sand">{copy.paletteSand}</option>
                    </select>
                  </label>
                ) : (
                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {copy.advancedCoverAccentLabel}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {ACCENT_PRESETS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          aria-label={color}
                          onClick={() => setAccentColor(color)}
                          className={`block h-7 w-7 rounded-full transition hover:scale-110 ${
                            accentColor === color
                              ? 'scale-110 border-2 border-[var(--text-primary)]'
                              : 'border-2 border-transparent'
                          }`}
                          style={{ background: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {backgroundControls}
              </div>
            </>
          ) : (
            <>
              <div className="ac-editor-inspector__section space-y-3">
                <h3 className="ac-editor-inspector__title">{copy.coverStudioVisibilityLabel}</h3>
                <div className="flex flex-wrap gap-2">
                  {fieldKeys.map((fieldKey) => {
                    const field = state.fields[fieldKey];
                    const hasValue = Boolean(field?.value.trim());
                    return (
                      <button
                        key={fieldKey}
                        type="button"
                        disabled={!hasValue}
                        onClick={() => toggleFieldVisibility(fieldKey)}
                        data-active={field?.visible ? 'true' : 'false'}
                        className="ac-button ac-button--ghost ac-button--sm disabled:opacity-30"
                      >
                        {fieldLabels[fieldKey]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="ac-editor-inspector__section">
                {selectedFieldKey && selectedComputed ? (
                  <SurfaceInspector
                    fieldKey={selectedFieldKey}
                    computed={selectedComputed}
                    value={state.fields[selectedFieldKey]?.value ?? ''}
                    copy={copy}
                    onTextChange={(value) => updateFieldValue(selectedFieldKey, value)}
                    onStyleChange={(patch: LayerStylePatch) => patchLayer(selectedFieldKey, patch)}
                  />
                ) : (
                  <SurfaceInspectorEmpty copy={copy} />
                )}
              </div>

              <div className="ac-editor-inspector__section">{backgroundControls}</div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
