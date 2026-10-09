'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Link2, ListChecks, Sparkles, Wrench } from 'lucide-react';
import type { CoAuthorChapterStats } from '@/lib/ai/co-author';
import { AI_TOOLS, plural, type AiTool } from '@/lib/ai/workspace-model';
import type { AppMessages } from '@/lib/i18n/messages';

type Copy = AppMessages['project'];

export interface AiHistoryEntry {
  id: string;
  kind: string;
  summary: string;
  mode: 'cloud' | 'local';
  affectedBlocks: number;
  createdAt: string;
}

export const TOOL_ICONS = { style: Sparkles, architecture: ListChecks, summary: FileText, coherence: Link2, fixes: Wrench } as const;

export function toolLabel(copy: Copy, tool: AiTool): string {
  return {
    style: copy.aiWsToolStyle,
    architecture: copy.aiWsToolArchitecture,
    summary: copy.aiWsToolSummary,
    coherence: copy.aiWsToolCoherence,
    fixes: copy.aiWsToolFixes,
  }[tool];
}

export function toolDescription(copy: Copy, tool: AiTool): string {
  return {
    style: copy.aiWsToolStyleDesc,
    architecture: copy.aiWsToolArchitectureDesc,
    summary: copy.aiWsToolSummaryDesc,
    coherence: copy.aiWsToolCoherenceDesc,
    fixes: copy.aiWsToolFixesDesc,
  }[tool];
}

/** Left column: the manuscript and its chapters as the target of chapter-scoped tasks. */
export function TargetPanel({
  copy,
  title,
  totalWords,
  chapters,
  targetKey,
  onTargetChange,
  chapterTargetsActive,
  busy,
}: {
  copy: Copy;
  title: string;
  totalWords: number;
  chapters: CoAuthorChapterStats[];
  targetKey: string;
  onTargetChange: (key: string) => void;
  /** False while a document-wide task is selected: chapters are shown but inert. */
  chapterTargetsActive: boolean;
  busy: boolean;
}) {
  return (
    <div className="aw-targets" data-testid="ai-targets">
      <header className="aw-manuscript">
        <span className="aw-eyebrow">{copy.aiWsManuscript}</span>
        <strong className="aw-manuscript__title">{title}</strong>
        <span className="aw-hint">
          {plural(chapters.length, copy.aiWsChaptersOne, copy.aiWsChaptersMany)} · {plural(totalWords, copy.aiWsWordsOne, copy.aiWsWordsMany)}
        </span>
      </header>
      <ul className="aw-target-list" role="listbox" aria-label={copy.aiWsTargetsTitle}>
        <li role="presentation">
          <button type="button" role="option" aria-selected={!chapterTargetsActive} className="aw-target" data-testid="ai-target-document" disabled>
            <span className="aw-target__title">{copy.aiWsWholeDocument}</span>
          </button>
        </li>
        {chapters.map((chapter) => {
          const selected = chapterTargetsActive && chapter.key === targetKey;
          return (
            <li key={chapter.key} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={selected}
                aria-current={selected ? 'true' : undefined}
                className="aw-target"
                data-testid="ai-target-chapter"
                data-chapter-key={chapter.key}
                disabled={!chapterTargetsActive || busy}
                onClick={() => onTargetChange(chapter.key)}
              >
                <span className="aw-target__title">{chapter.title}</span>
                <span className="aw-target__meta">{plural(chapter.words, copy.aiWsWordsOne, copy.aiWsWordsMany)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Collapsible({ title, children, defaultOpen = true, testId }: { title: string; children: React.ReactNode; defaultOpen?: boolean; testId: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="aw-section" data-testid={testId}>
      <button type="button" className="aw-section__toggle" data-testid={`${testId}-toggle`} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span>{title}</span>
        {open ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
      </button>
      {open ? <div className="aw-section__body">{children}</div> : null}
    </section>
  );
}

/** Right column: editorial actions (real operations only), active context and AI history. */
export function ActionsPanel({
  copy,
  locale,
  tool,
  onSelectTool,
  cloudAvailable,
  editable,
  busy,
  context,
  history,
}: {
  copy: Copy;
  locale: string;
  tool: AiTool | null;
  onSelectTool: (tool: AiTool) => void;
  cloudAvailable: boolean;
  editable: boolean;
  busy: boolean;
  context: {
    project: string;
    target: string;
    words: number;
    blocks: number;
    chapters: number;
    language: string;
    voice: { active: boolean; name?: string };
  };
  history: AiHistoryEntry[];
}) {
  const groups: Array<{ id: 'writing' | 'document' | 'fixes'; label: string }> = [
    { id: 'writing', label: copy.aiWsGroupWriting },
    { id: 'document', label: copy.aiWsGroupDocument },
    { id: 'fixes', label: copy.aiWsGroupFixes },
  ];
  return (
    <div className="aw-side">
      <h2 className="aw-side__title">{copy.aiWsActionsTitle}</h2>
      {groups.map((group) => (
        <div key={group.id} className="aw-tool-group" role="group" aria-label={group.label}>
          <span className="aw-eyebrow">{group.label}</span>
          {AI_TOOLS.filter((definition) => definition.group === group.id).map((definition) => {
            const Icon = TOOL_ICONS[definition.id];
            const needsProvider = definition.needsCloud && !cloudAvailable;
            const blocked = !editable || needsProvider;
            return (
              <button
                key={definition.id}
                type="button"
                className="aw-tool"
                data-testid={`ai-tool-${definition.id}`}
                aria-pressed={tool === definition.id}
                disabled={busy || blocked}
                title={!editable ? copy.aiWsNeedsEditable : needsProvider ? copy.aiWsNeedsProvider : undefined}
                onClick={() => onSelectTool(definition.id)}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="aw-tool__text">
                  <span className="aw-tool__label">{toolLabel(copy, definition.id)}</span>
                  {blocked ? <span className="aw-tool__note">{!editable ? copy.aiWsNeedsEditable : copy.aiWsNeedsProvider}</span> : null}
                </span>
                <ChevronRight className="h-4 w-4 aw-tool__chevron" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      ))}

      <Collapsible title={copy.aiWsContextTitle} testId="ai-context">
        <dl className="aw-context">
          <div><dt>{copy.aiWsContextProject}</dt><dd>{context.project}</dd></div>
          <div><dt>{copy.aiWsContextTarget}</dt><dd data-testid="ai-context-target">{context.target}</dd></div>
          <div><dt>{copy.aiWsContextSize}</dt><dd>{plural(context.words, copy.aiWsWordsOne, copy.aiWsWordsMany)} · {copy.aiWsContextBlocks.replace('{count}', String(context.blocks))}</dd></div>
          <div><dt>{copy.aiWsContextChapters}</dt><dd>{context.chapters}</dd></div>
          <div><dt>{copy.aiWsContextLanguage}</dt><dd>{context.language}</dd></div>
          <div><dt>{copy.aiWsContextVoice}</dt><dd data-testid="ai-context-voice">{context.voice.active ? `${copy.aiWsVoiceApplied}${context.voice.name ? ` · ${context.voice.name}` : ''}` : copy.aiWsVoiceNone}</dd></div>
          <div><dt>{copy.aiWsContextProcessing}</dt><dd data-testid="ai-context-processing">{cloudAvailable ? copy.aiWsProcessingCloud : copy.aiWsProcessingNone}</dd></div>
        </dl>
      </Collapsible>

      <Collapsible title={`${copy.aiWsHistoryTitle} (${history.length})`} testId="ai-history">
        {history.length === 0 ? (
          <p className="aw-hint" data-testid="ai-history-empty">{copy.aiWsHistoryEmpty}</p>
        ) : (
          <ol className="aw-history">
            {history.map((entry) => (
              <li key={entry.id} className="aw-history__item" data-testid="ai-history-item">
                <span className="aw-history__summary">{entry.summary}</span>
                <span className="aw-history__meta">
                  <span className="aw-badge">{copy.aiWsHistoryApplied}</span>
                  <span>{entry.mode === 'cloud' ? copy.aiWsProcessingCloud : copy.aiModeLocal}</span>
                  <span>{plural(entry.affectedBlocks, copy.aiWsHistoryBlocksOne, copy.aiWsHistoryBlocksMany)}</span>
                  <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleDateString(locale)}</time>
                </span>
              </li>
            ))}
          </ol>
        )}
        <p className="aw-hint">{copy.aiWsHistoryNote}</p>
      </Collapsible>
    </div>
  );
}

