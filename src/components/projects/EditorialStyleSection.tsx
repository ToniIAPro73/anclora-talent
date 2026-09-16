'use client';

import { useRef, useState, useTransition } from 'react';
import { Check, FileText, Sparkles } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import type { StructureProfile } from '@/lib/structure-profile/model';
import type { ReferenceEditorialProfile } from '@/lib/reference-editorial-profile/model';
import { isReferenceEditorialProfile } from '@/lib/reference-editorial-profile/legacy';
import {
  extractReferenceEditorialProfileAction,
  saveReferenceEditorialProfileAction,
} from '@/lib/structure-profile/actions';

type Copy = AppMessages['project'];
type StyleSource =
  | { type: 'none' }
  | { type: 'talent' }
  | { type: 'saved'; profileId?: string; profile?: ReferenceEditorialProfile }
  | { type: 'reference-document'; fileName: string; profile?: ReferenceEditorialProfile };

interface EditorialStyleSectionProps {
  copy: Copy;
  profiles: StructureProfile[];
  onSelectionChange?: (selection: { type: StyleSource['type']; label: string }) => void;
}

function confidenceLabel(copy: Copy, value: ReferenceEditorialProfile['confidence']['overall']) {
  if (value === 'high') return copy.referenceEditorialConfidenceHigh;
  if (value === 'medium') return copy.referenceEditorialConfidenceMedium;
  return copy.referenceEditorialConfidenceLow;
}

function referenceProfiles(profiles: StructureProfile[]) {
  return profiles.filter((profile) => isReferenceEditorialProfile(profile.schema));
}

export function EditorialStyleSection({ copy, profiles, onSelectionChange }: EditorialStyleSectionProps) {
  const savedProfiles = referenceProfiles(profiles);
  const [source, setSource] = useState<StyleSource>({ type: 'none' });
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [saveProfile, setSaveProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();
  const attemptRef = useRef(0);

  const selectSource = (next: StyleSource['type']) => {
    setError('');
    setSaved(false);
    if (next === 'none') {
      setSource({ type: 'none' });
      onSelectionChange?.({ type: 'none', label: copy.newProjectStyleNone });
    }
    if (next === 'talent') {
      setSource({ type: 'talent' });
      onSelectionChange?.({ type: 'talent', label: copy.newProjectStyleTalent });
    }
    if (next === 'saved') {
      if (savedProfiles[0] && isReferenceEditorialProfile(savedProfiles[0].schema)) {
        setSource({ type: 'saved', profileId: savedProfiles[0].id, profile: savedProfiles[0].schema });
        onSelectionChange?.({ type: 'saved', label: savedProfiles[0].name });
      } else {
        setSource({ type: 'saved' });
        onSelectionChange?.({ type: 'saved', label: copy.newProjectStyleSaved });
      }
    }
    if (next === 'reference-document') {
      setSource({ type: 'reference-document', fileName: referenceFile?.name ?? '' });
      onSelectionChange?.({ type: 'reference-document', label: referenceFile?.name || copy.newProjectStyleReference });
    }
  };

  const analyzeReference = async () => {
    if (!referenceFile) return;
    setError('');
    setIsAnalysing(true);
    const attemptId = ++attemptRef.current;
    try {
      const data = new FormData();
      data.set('referenceDocument', referenceFile);
      const result = await extractReferenceEditorialProfileAction(data);
      if (attemptId !== attemptRef.current) return;
      if (!result.ok) {
        setError(result.error || copy.newProjectReferenceAnalyseError);
        return;
      }
      setError('');
      setSource({ type: 'reference-document', fileName: referenceFile.name, profile: result.profile });
      onSelectionChange?.({ type: 'reference-document', label: referenceFile.name });
      setProfileName(result.suggestedName);
    } catch {
      if (attemptId !== attemptRef.current) return;
      setError(copy.newProjectReferenceAnalyseError);
    } finally {
      if (attemptId === attemptRef.current) {
        setIsAnalysing(false);
      }
    }
  };

  const saveReusableProfile = () => {
    if (source.type !== 'reference-document' || !source.profile || !profileName.trim()) return;
    startSaveTransition(async () => {
      try {
        const data = new FormData();
        data.set('name', profileName.trim());
        data.set('profile', JSON.stringify(source.profile));
        await saveReferenceEditorialProfileAction(data);
        setSaved(true);
      } catch {
        setError(copy.newProjectReferenceAnalyseError);
      }
    });
  };

  const activeProfile = source.type === 'saved' ? source.profile : source.type === 'reference-document' ? source.profile : undefined;

  return (
    <section className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-5 shadow-[var(--shadow-soft)]" data-testid="new-project-editorial-style-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">02</p>
          <h3 className="mt-2 text-xl font-bold text-[var(--text-primary)]">{copy.newProjectEditorialStyleTitle}</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{copy.newProjectEditorialStyleDescription}</p>
        </div>
        <Sparkles className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup" aria-label={copy.newProjectEditorialStyleTitle}>
        <button type="button" role="radio" aria-checked={source.type === 'none'} data-testid="editorial-style-none" onClick={() => selectSource('none')} className={`rounded-2xl border p-4 text-left transition ${source.type === 'none' ? 'border-[var(--accent)] bg-[var(--surface-highlight)]' : 'border-[var(--border-subtle)] bg-[var(--surface-soft)]'}`}>
          <span className="flex items-center justify-between gap-2 font-semibold text-[var(--text-primary)]">{copy.newProjectStyleNone}{source.type === 'none' && <Check className="h-4 w-4 text-[var(--accent)]" />}</span>
          <span className="mt-2 block text-xs leading-5 text-[var(--text-tertiary)]">{copy.newProjectStyleNoneDescription}</span>
        </button>
        <button type="button" role="radio" aria-checked={source.type === 'talent'} disabled aria-disabled="true" data-testid="editorial-style-talent" className="cursor-not-allowed rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-4 text-left opacity-65">
          <span className="font-semibold text-[var(--text-primary)]">{copy.newProjectStyleTalent}</span>
          <span className="mt-2 block text-xs leading-5 text-[var(--text-tertiary)]">{copy.newProjectStyleTalentDescription}</span>
          <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{copy.newProjectStyleTalentUnavailable}</span>
        </button>
        <button type="button" role="radio" aria-checked={source.type === 'saved'} data-testid="editorial-style-saved" onClick={() => selectSource('saved')} className={`rounded-2xl border p-4 text-left transition ${source.type === 'saved' ? 'border-[var(--accent)] bg-[var(--surface-highlight)]' : 'border-[var(--border-subtle)] bg-[var(--surface-soft)]'}`}>
          <span className="flex items-center justify-between gap-2 font-semibold text-[var(--text-primary)]">{copy.newProjectStyleSaved}{source.type === 'saved' && <Check className="h-4 w-4 text-[var(--accent)]" />}</span>
          <span className="mt-2 block text-xs leading-5 text-[var(--text-tertiary)]">{copy.newProjectStyleSavedDescription}</span>
        </button>
        <button type="button" role="radio" aria-checked={source.type === 'reference-document'} data-testid="editorial-style-reference" onClick={() => selectSource('reference-document')} className={`rounded-2xl border p-4 text-left transition ${source.type === 'reference-document' ? 'border-[var(--accent)] bg-[var(--surface-highlight)]' : 'border-[var(--border-subtle)] bg-[var(--surface-soft)]'}`}>
          <span className="flex items-center justify-between gap-2 font-semibold text-[var(--text-primary)]">{copy.newProjectStyleReference}{source.type === 'reference-document' && <Check className="h-4 w-4 text-[var(--accent)]" />}</span>
          <span className="mt-2 block text-xs leading-5 text-[var(--text-tertiary)]">{copy.newProjectStyleReferenceDescription}</span>
        </button>
      </div>

      {source.type === 'saved' && (
        <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-4" data-testid="saved-editorial-styles-picker">
          {savedProfiles.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[var(--text-secondary)]">{copy.newProjectSavedStylesEmpty}</p>
              <button type="button" data-testid="saved-styles-create-from-document" onClick={() => selectSource('reference-document')} className="ac-button ac-button--secondary ac-button--sm">{copy.newProjectCreateFromDocument}</button>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {savedProfiles.map((item) => (
                <button key={item.id} type="button" data-testid={`saved-editorial-style-${item.id}`} onClick={() => { if (isReferenceEditorialProfile(item.schema)) { setSource({ type: 'saved', profileId: item.id, profile: item.schema }); onSelectionChange?.({ type: 'saved', label: item.name }); } }} className={`rounded-xl border p-3 text-left text-sm ${source.profileId === item.id ? 'border-[var(--accent)]' : 'border-[var(--border-subtle)]'}`}>
                  <span className="font-semibold text-[var(--text-primary)]">{item.name}</span>
                  <span className="mt-1 block text-xs text-[var(--text-tertiary)]">{isReferenceEditorialProfile(item.schema) ? `${item.schema.body.resolvedFontFamily ?? item.schema.body.fontFamily ?? '—'} · ${item.schema.body.fontSize ?? '—'} pt` : ''}</span>
                </button>
              ))}
            </div>
          )}
          {source.profile && <input type="hidden" data-testid="saved-editorial-profile-input" name="referenceEditorialProfile" value={JSON.stringify(source.profile)} />}
        </div>
      )}

      {source.type === 'reference-document' && (
        <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-4" data-testid="reference-document-inline-panel">
          <div className="flex items-start gap-3"><FileText className="mt-0.5 h-5 w-5 text-[var(--accent)]" aria-hidden="true" /><div><h4 className="font-semibold text-[var(--text-primary)]">{copy.newProjectReferenceTitle}</h4><p className="mt-1 text-xs leading-5 text-[var(--text-tertiary)]">{copy.newProjectReferenceDescription}</p></div></div>
          <input name="referenceDocument" type="file" accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" data-testid="reference-document-input" className="mt-4 block w-full rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--page-surface)] p-3 text-sm text-[var(--text-secondary)]" onChange={(event) => { const file = event.target.files?.[0] ?? null; setReferenceFile(file); setSource({ type: 'reference-document', fileName: file?.name ?? '' }); onSelectionChange?.({ type: 'reference-document', label: file?.name || copy.newProjectStyleReference }); setError(''); }} />
          {referenceFile && <p className="mt-2 text-xs text-[var(--text-secondary)]" data-testid="reference-document-selected">{copy.newProjectReferenceSelected}: {referenceFile.name}</p>}
          <div className="mt-3 grid gap-2 text-xs leading-5 text-[var(--text-tertiary)] sm:grid-cols-2"><p>{copy.newProjectReferenceWhatWeAnalyse}</p><p>{copy.newProjectReferenceWhatWeDoNotCopy}</p></div>
          <div className="mt-4 flex flex-wrap items-center gap-2"><button type="button" data-testid="reference-document-analyse" disabled={!referenceFile || isAnalysing} onClick={analyzeReference} className="ac-button ac-button--primary ac-button--sm">{isAnalysing ? copy.newProjectReferenceAnalysing : copy.newProjectReferenceAnalyse}</button>{referenceFile && <button type="button" data-testid="reference-document-remove" onClick={() => { setReferenceFile(null); setSource({ type: 'reference-document', fileName: '' }); }} className="ac-button ac-button--ghost ac-button--sm">{copy.newProjectReferenceRemove}</button>}</div>
          {error && <p role="alert" className="mt-3 text-sm text-[var(--danger)]" data-testid="reference-document-error">{error}</p>}
          {activeProfile && <div className="mt-4 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-3" data-testid="reference-profile-summary"><p className="font-semibold text-[var(--text-primary)]">{copy.newProjectReferenceProfileDetected}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{activeProfile.body.resolvedFontFamily ?? activeProfile.body.fontFamily ?? '—'} · {activeProfile.body.fontSize ?? '—'} pt · {confidenceLabel(copy, activeProfile.confidence.overall)}</p><input type="hidden" data-testid="reference-editorial-profile-input" name="referenceEditorialProfile" value={JSON.stringify(activeProfile)} /></div>}
          {activeProfile && <div className="mt-4 border-t border-[var(--border-subtle)] pt-3"><label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><input type="checkbox" data-testid="reference-profile-save-checkbox" checked={saveProfile} onChange={(event) => setSaveProfile(event.target.checked)} />{copy.newProjectReferenceSave}</label>{saveProfile && <div className="mt-2 flex flex-wrap gap-2"><input data-testid="reference-profile-save-name" className="field-input min-w-[220px] flex-1" value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder={copy.newProjectReferenceSaveName} /><button type="button" data-testid="reference-profile-save-button" disabled={isSaving || !profileName.trim() || saved} onClick={saveReusableProfile} className="ac-button ac-button--secondary ac-button--sm">{saved ? copy.newProjectReferenceSaved : copy.newProjectReferenceSave}</button></div>}</div>}
        </div>
      )}
    </section>
  );
}
