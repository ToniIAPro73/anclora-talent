"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import type { AppMessages } from "@/lib/i18n/messages";
import type { StructureProfile } from "@/lib/structure-profile/model";
import {
  extractReferenceEditorialProfileAction,
  saveReferenceEditorialProfileAction,
} from "@/lib/structure-profile/actions";
import type { ReferenceEditorialProfile } from "@/lib/reference-editorial-profile/model";
import { isReferenceEditorialProfile } from "@/lib/reference-editorial-profile/legacy";

type Copy = AppMessages["project"];
type Props = {
  isOpen: boolean;
  profiles: StructureProfile[];
  copy: Copy;
  onConfirm: (profile: ReferenceEditorialProfile) => void;
  onClose: () => void;
};

function confidence(
  copy: Copy,
  value: ReferenceEditorialProfile["confidence"]["overall"],
) {
  if (value === "high") return copy.referenceEditorialConfidenceHigh;
  if (value === "medium") return copy.referenceEditorialConfidenceMedium;
  return copy.referenceEditorialConfidenceLow;
}

export function ReferenceEditorialProfileDialog({
  isOpen,
  profiles,
  copy,
  onConfirm,
  onClose,
}: Props) {
  const [profile, setProfile] = useState<ReferenceEditorialProfile | null>(
    null,
  );
  const [tab, setTab] = useState<"style" | "structure">("style");
  const [save, setSave] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  if (!isOpen) return null;
  const close = () => {
    setProfile(null);
    setError("");
    setTab("style");
    onClose();
  };
  const analyze = (file: File) =>
    startTransition(async () => {
      try {
        const data = new FormData();
        data.set("referenceDocument", file);
        const result = await extractReferenceEditorialProfileAction(data);
        if (!result.ok) throw new Error(copy.referenceEditorialNoStyle);
        setProfile(result.profile);
        setName(result.suggestedName);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : copy.structureError);
      }
    });
  const choose = (id: string) => {
    const item = profiles.find((candidate) => candidate.id === id);
    if (item && isReferenceEditorialProfile(item.schema)) {
      setProfile(item.schema);
      setName(item.name);
    }
  };
  const confirm = () => {
    if (!profile) return;
    if (!save) {
      onConfirm(profile);
      close();
      return;
    }
    startTransition(async () => {
      try {
        const data = new FormData();
        data.set("name", name);
        data.set("profile", JSON.stringify(profile));
        await saveReferenceEditorialProfileAction(data);
        onConfirm(profile);
        close();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : copy.structureError);
      }
    });
  };
  return (
    <div
      className="ac-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reference-editorial-title"
      data-testid="reference-editorial-dialog"
    >
      <div
        className="ac-modal__backdrop"
        data-testid="reference-editorial-backdrop"
        onClick={close}
      />
      <div className="ac-modal__panel max-w-xl rounded-[24px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 shadow-[var(--shadow-strong)]">
        <div className="flex items-start justify-between">
          <div>
            <h3
              id="reference-editorial-title"
              className="text-lg font-semibold text-[var(--text-primary)]"
            >
              {copy.referenceEditorialTitle}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {copy.referenceEditorialDescription}
            </p>
          </div>
          <button
            data-testid="reference-editorial-close"
            type="button"
            onClick={close}
            aria-label={copy.structureDiscardAction}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {!profile ? (
          <div className="mt-6 space-y-4">
            <label className="block cursor-pointer rounded-xl border border-dashed p-6 text-center text-sm font-semibold text-[var(--accent)]">
              {copy.structureSourceUploadLabel}
              <input
                data-testid="reference-editorial-file"
                type="file"
                accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) analyze(file);
                }}
              />
            </label>
            <select
              data-testid="reference-editorial-profile-select"
              className="field-input w-full"
              defaultValue=""
              onChange={(event) => choose(event.target.value)}
              aria-label={copy.referenceEditorialSavedProfiles}
            >
              <option value="" disabled>
                {copy.referenceEditorialSavedProfiles}
              </option>
              {profiles.map((item) =>
                isReferenceEditorialProfile(item.schema) ? (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ) : null,
              )}
            </select>
            {busy && <p className="text-sm">{copy.structureAnalyzing}</p>}
            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="mt-5 flex gap-2" role="tablist">
              <button
                data-testid="reference-editorial-style-tab"
                type="button"
                role="tab"
                aria-selected={tab === "style"}
                onClick={() => setTab("style")}
                className="ac-button ac-button--secondary ac-button--sm"
              >
                {copy.referenceEditorialStyleTab}
              </button>
              <button
                data-testid="reference-editorial-structure-tab"
                type="button"
                role="tab"
                aria-selected={tab === "structure"}
                onClick={() => setTab("structure")}
                className="ac-button ac-button--secondary ac-button--sm"
              >
                {copy.referenceEditorialStructureTab}
              </button>
            </div>
            {tab === "style" ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-[var(--surface-soft)] p-4">
                  <p className="text-xs font-semibold">
                    {copy.referenceEditorialBody}
                  </p>
                  <p className="mt-2 text-sm">
                    {profile.body.resolvedFontFamily ?? "—"} ·{" "}
                    {profile.body.fontSize ?? "—"} pt
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {confidence(copy, profile.confidence.bodyTypography)}
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--surface-soft)] p-4">
                  <p className="text-xs font-semibold">
                    {copy.referenceEditorialHeadings}
                  </p>
                  <p className="mt-2 text-sm">
                    {profile.headings.h1?.resolvedFontFamily ?? "—"} ·{" "}
                    {profile.headings.h1?.fontSize ?? "—"} pt
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {confidence(copy, profile.confidence.headings)}
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--surface-soft)] p-4">
                  <p className="text-xs font-semibold">
                    {copy.referenceEditorialPage}
                  </p>
                  <p className="mt-2 text-sm">
                    {profile.page.width ?? "—"} × {profile.page.height ?? "—"}{" "}
                    pt
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {confidence(copy, profile.confidence.pageGeometry)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-xl bg-[var(--surface-soft)] p-4 text-sm">
                <p>
                  {profile.observedStructure.chapterCount ?? 0} chapters
                  detected.
                </p>
                <p className="mt-2 text-[var(--text-secondary)]">
                  {copy.referenceEditorialObservedWarning}
                </p>
              </div>
            )}
            <label className="mt-5 flex gap-2 text-sm">
              <input
                data-testid="reference-editorial-save-checkbox"
                type="checkbox"
                checked={save}
                onChange={(event) => setSave(event.target.checked)}
              />
              {copy.referenceEditorialSaveLabel}
            </label>
            {save && (
              <input
                data-testid="reference-editorial-profile-name"
                className="field-input mt-2 w-full"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={copy.structureProfileNamePlaceholder}
              />
            )}
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-400">
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                data-testid="reference-editorial-discard"
                type="button"
                className="ac-button ac-button--secondary"
                onClick={close}
              >
                {copy.structureDiscardAction}
              </button>
              <button
                data-testid="reference-editorial-use"
                type="button"
                className="ac-button ac-button--primary"
                disabled={busy}
                onClick={confirm}
              >
                {copy.referenceEditorialUseAction}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
