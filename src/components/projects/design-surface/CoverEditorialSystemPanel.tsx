'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DesignSurface } from '@/lib/projects/design-surface';
import {
  appendCoverProofCheckpoint, applyCollectionLayoutProfile, checkpointStorageKey,
  createCollectionLayoutProfile, createCoverProofCheckpoint, findDesignSurfaceOverflows, profileStorageKey,
  resizeDesignSurface, type CollectionLayoutProfile, type CoverProofCheckpoint,
} from '@/lib/projects/cover-editor-artifacts';
import { DesignSurfaceStaticPreview } from './DesignSurfaceStaticPreview';

type Locale = 'es' | 'en';
const copy = {
  es: { title: 'Sistema de colección', local: 'Perfiles e hitos guardados en este navegador.', checkpoint: 'Guardar hito', choose: 'Hito guardado', compare: 'Comparar', restore: 'Restaurar como nueva revisión', profile: 'Perfil reutilizable', saveProfile: 'Guardar perfil actual', applyProfile: 'Aplicar perfil', resize: 'Cambiar formato', width: 'Ancho', height: 'Alto', scale: 'Escalar proporcionalmente', stretch: 'Estirar', anchor: 'Anclar sin escalar', horizontal: 'Anclaje horizontal', vertical: 'Anclaje vertical', left: 'Izquierda', center: 'Centro', right: 'Derecha', top: 'Arriba', bottom: 'Abajo', overflow: 'La vista previa desborda el lienzo en:', apply: 'Previsualizar cambio', cancel: 'Cancelar', accept: 'Aplicar formato', compareTitle: 'Comparación: diseño actual y hito', current: 'Actual', saved: 'Hito', empty: 'Aún no hay hitos guardados.', nameCheckpoint: 'Nombre del hito editorial', nameProfile: 'Nombre del perfil de colección', errors: 'No se pudieron guardar estos datos en el almacenamiento local del navegador.', created: 'Hito guardado. El estado actual queda protegido antes de restaurar.', profileSaved: 'Perfil guardado. Conserva texto y arte de cada libro.', profileApplied: 'Perfil aplicado: se actualizaron guías, márgenes, zona ISBN y anclajes de texto existentes.', resized: 'Vista previa del nuevo formato. Revisa el lienzo y confirma para aplicarlo.', noProfile: 'Selecciona un perfil guardado.', noCheckpoint: 'Selecciona un hito guardado.', close: 'Cerrar', },
  en: { title: 'Collection system', local: 'Profiles and checkpoints are stored in this browser.', checkpoint: 'Save checkpoint', choose: 'Saved checkpoint', compare: 'Compare', restore: 'Restore as a new revision', profile: 'Reusable profile', saveProfile: 'Save current profile', applyProfile: 'Apply profile', resize: 'Resize format', width: 'Width', height: 'Height', scale: 'Scale proportionally', stretch: 'Stretch', anchor: 'Anchor without scaling', horizontal: 'Horizontal anchor', vertical: 'Vertical anchor', left: 'Left', center: 'Center', right: 'Right', top: 'Top', bottom: 'Bottom', overflow: 'The preview overflows the canvas at:', apply: 'Preview change', cancel: 'Cancel', accept: 'Apply format', compareTitle: 'Compare: current design and checkpoint', current: 'Current', saved: 'Checkpoint', empty: 'No checkpoints saved yet.', nameCheckpoint: 'Editorial checkpoint name', nameProfile: 'Collection profile name', errors: 'Could not save this data in browser storage.', created: 'Checkpoint saved. The current state is protected before restoring.', profileSaved: 'Profile saved. It preserves each book’s text and artwork.', profileApplied: 'Profile applied: guides, margins, ISBN area and existing text anchors updated.', resized: 'Preview the new format. Review the canvas and confirm to apply it.', noProfile: 'Choose a saved profile.', noCheckpoint: 'Choose a saved checkpoint.', close: 'Close', },
} satisfies Record<Locale, Record<string, string>>;

export function CoverEditorialSystemPanel({ projectId, surface, companionSurface, locale, onChange, onCompanionChange }: {
  projectId: string; surface: DesignSurface; companionSurface: DesignSurface; locale: Locale;
  onChange: (surface: DesignSurface) => void; onCompanionChange: (surface: DesignSurface) => void;
}) {
  const t = copy[locale];
  const checkpointKey = checkpointStorageKey(projectId, surface.surface);
  const [checkpoints, setCheckpoints] = useState<CoverProofCheckpoint[]>([]);
  const [profiles, setProfiles] = useState<CollectionLayoutProfile[]>([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState('');
  const [selectedProfile, setSelectedProfile] = useState('');
  const [error, setError] = useState('');
  const [comparison, setComparison] = useState<CoverProofCheckpoint | null>(null);
  const [resize, setResize] = useState<{ width: number; height: number; mode: 'scale' | 'stretch' | 'anchor'; anchorX: 'left' | 'center' | 'right'; anchorY: 'top' | 'center' | 'bottom' } | null>(null);
  const [preview, setPreview] = useState<DesignSurface | null>(null);
  const selected = useMemo(() => checkpoints.find((item) => item.id === selectedCheckpoint), [checkpoints, selectedCheckpoint]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const rawCheckpoints = localStorage.getItem(checkpointKey);
        setCheckpoints(rawCheckpoints ? JSON.parse(rawCheckpoints) as CoverProofCheckpoint[] : []);
        const rawProfiles = localStorage.getItem(profileStorageKey());
        setProfiles(rawProfiles ? JSON.parse(rawProfiles) as CollectionLayoutProfile[] : []);
      } catch {
        setError(t.errors);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [checkpointKey, t.errors]);

  const saveCheckpoints = (next: CoverProofCheckpoint[]) => {
    try { localStorage.setItem(checkpointKey, JSON.stringify(next)); setCheckpoints(next); setError(''); }
    catch { setError(t.errors); }
  };

  const createCheckpoint = () => {
    const name = window.prompt(t.nameCheckpoint);
    if (!name?.trim()) return;
    try { saveCheckpoints(appendCoverProofCheckpoint(checkpoints, createCoverProofCheckpoint(name, surface))); }
    catch { setError(t.errors); }
  };

  const restoreCheckpoint = () => {
    if (!selected) { setError(t.noCheckpoint); return; }
    try {
      const recovery = createCoverProofCheckpoint(`${selected.name} · recovery`, surface);
      saveCheckpoints(appendCoverProofCheckpoint(checkpoints, recovery));
      onChange({ ...structuredClone(selected.surface), status: 'draft' });
      setError(t.created);
    } catch { setError(t.errors); }
  };

  const saveProfile = () => {
    const name = window.prompt(t.nameProfile);
    if (!name?.trim()) return;
    try {
      const profile = createCollectionLayoutProfile(name, surface.surface === 'cover' ? surface : companionSurface, surface.surface === 'back-cover' ? surface : companionSurface);
      const next = [profile, ...profiles.filter((item) => item.name.toLocaleLowerCase() !== profile.name.toLocaleLowerCase())].slice(0, 30);
      localStorage.setItem(profileStorageKey(), JSON.stringify(next));
      setProfiles(next); setSelectedProfile(profile.id); setError(t.profileSaved);
    } catch { setError(t.errors); }
  };

  const applyProfile = () => {
    const profile = profiles.find((item) => item.id === selectedProfile);
    if (!profile) { setError(t.noProfile); return; }
    const current = surface.surface === 'cover' ? surface : companionSurface;
    const next = applyCollectionLayoutProfile(profile, current);
    if (surface.surface === 'cover') { onChange(next); onCompanionChange(applyCollectionLayoutProfile(profile, companionSurface)); }
    else { onChange(next); onCompanionChange(applyCollectionLayoutProfile(profile, companionSurface)); }
    setError(t.profileApplied);
  };

  const beginResize = () => {
    if (!resize) return;
    try { setPreview(resizeDesignSurface(surface, resize.width, resize.height, resize.mode, resize.anchorX, resize.anchorY)); setError(t.resized); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t.errors); }
  };
  const previewOverflows = preview ? findDesignSurfaceOverflows(preview) : [];

  return <details className="cover-preflight-panel cover-editor-artifacts" data-testid="cover-editor-artifacts">
    <summary>{t.title}</summary>
    <p>{t.local}</p>
    <div className="cover-artifact-row">
      <button type="button" className="ac-button ac-button--secondary ac-button--sm" onClick={createCheckpoint}>{t.checkpoint}</button>
      <select aria-label={t.choose} value={selectedCheckpoint} onChange={(event) => setSelectedCheckpoint(event.target.value)}>
        <option value="">{t.choose}</option>{checkpoints.map((item) => <option key={item.id} value={item.id}>{item.name} · {new Date(item.createdAt).toLocaleDateString(locale)}</option>)}
      </select>
      <button type="button" className="ac-button ac-button--secondary ac-button--sm" disabled={!selected} onClick={() => selected && setComparison(selected)}>{t.compare}</button>
      <button type="button" className="ac-button ac-button--secondary ac-button--sm" disabled={!selected} onClick={restoreCheckpoint}>{t.restore}</button>
    </div>
    {checkpoints.length === 0 && <small>{t.empty}</small>}
    <div className="cover-artifact-row">
      <button type="button" className="ac-button ac-button--secondary ac-button--sm" onClick={saveProfile}>{t.saveProfile}</button>
      <select aria-label={t.profile} value={selectedProfile} onChange={(event) => setSelectedProfile(event.target.value)}>
        <option value="">{t.profile}</option>{profiles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      <button type="button" className="ac-button ac-button--secondary ac-button--sm" disabled={!selectedProfile} onClick={applyProfile}>{t.applyProfile}</button>
    </div>
    <div className="cover-artifact-row cover-artifact-row--resize">
      <strong>{t.resize}</strong>
      <label>{t.width}<input type="number" min="100" max="10000" value={resize?.width ?? surface.width} onChange={(event) => setResize({ width: Number(event.target.value), height: resize?.height ?? surface.height, mode: resize?.mode ?? 'scale', anchorX: resize?.anchorX ?? 'center', anchorY: resize?.anchorY ?? 'center' })}/></label>
      <label>{t.height}<input type="number" min="100" max="10000" value={resize?.height ?? surface.height} onChange={(event) => setResize({ width: resize?.width ?? surface.width, height: Number(event.target.value), mode: resize?.mode ?? 'scale', anchorX: resize?.anchorX ?? 'center', anchorY: resize?.anchorY ?? 'center' })}/></label>
      <select aria-label={t.resize} value={resize?.mode ?? 'scale'} onChange={(event) => setResize({ width: resize?.width ?? surface.width, height: resize?.height ?? surface.height, mode: event.target.value as 'scale' | 'stretch' | 'anchor', anchorX: resize?.anchorX ?? 'center', anchorY: resize?.anchorY ?? 'center' })}>
        <option value="scale">{t.scale}</option><option value="stretch">{t.stretch}</option><option value="anchor">{t.anchor}</option>
      </select>
      {resize?.mode === 'anchor' && <>
        <select aria-label={t.horizontal} value={resize.anchorX} onChange={(event) => setResize({ ...resize, anchorX: event.target.value as 'left' | 'center' | 'right' })}><option value="left">{t.left}</option><option value="center">{t.center}</option><option value="right">{t.right}</option></select>
        <select aria-label={t.vertical} value={resize.anchorY} onChange={(event) => setResize({ ...resize, anchorY: event.target.value as 'top' | 'center' | 'bottom' })}><option value="top">{t.top}</option><option value="center">{t.center}</option><option value="bottom">{t.bottom}</option></select>
      </>}
      <button type="button" className="ac-button ac-button--secondary ac-button--sm" onClick={beginResize}>{t.apply}</button>
    </div>
    {error && <p role="status">{error}</p>}
    {comparison && <div className="cover-artifact-compare" role="dialog" aria-label={t.compareTitle}>
      <h3>{t.compareTitle} · {comparison.name}</h3><div><figure><figcaption>{t.current}</figcaption><DesignSurfaceStaticPreview surface={surface}/></figure><figure><figcaption>{t.saved}</figcaption><DesignSurfaceStaticPreview surface={comparison.surface}/></figure></div>
      <button type="button" className="ac-button ac-button--secondary ac-button--sm" onClick={() => setComparison(null)}>{t.close}</button>
    </div>}
    {preview && <div className="cover-artifact-compare" role="dialog" aria-label={t.resize}>
      <h3>{t.resize}</h3><div><figure><figcaption>{t.current}</figcaption><DesignSurfaceStaticPreview surface={surface}/></figure><figure><figcaption>{t.width} × {t.height}</figcaption><DesignSurfaceStaticPreview surface={preview}/></figure></div>
      <button type="button" className="ac-button ac-button--secondary ac-button--sm" onClick={() => setPreview(null)}>{t.cancel}</button>
      {previewOverflows.length > 0 && <p role="alert">{t.overflow} {previewOverflows.join(', ')}</p>}
      <button type="button" className="ac-button ac-button--primary ac-button--sm" disabled={previewOverflows.length > 0} onClick={() => { onChange(preview); setPreview(null); }}>{t.accept}</button>
    </div>}
  </details>;
}
