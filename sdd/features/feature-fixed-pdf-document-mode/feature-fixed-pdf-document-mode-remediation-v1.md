# Fixed-PDF document mode — remediation v1

This document supersedes the infrastructure exception recorded in the v1
implementation notes. The original feature spec remains immutable; this
remediation records the governed production storage contract now in force.

## Storage contract

- New `fixed-pdf` uploads require `SOURCE_DOCUMENT_READ_WRITE_TOKEN`.
- New source PDFs are written only to the dedicated private Vercel Blob store
  `anclora-talent-source-documents`, with `access: 'private'`.
- The existing public Blob store and `BLOB_READ_WRITE_TOKEN` remain in use for
  the pre-existing public image assets only; they are never a fallback for a
  new source PDF.
- A missing token, rejected private upload, empty result, or upload error is a
  controlled failure: no project is created and the user returns to the
  creation form with an actionable error.
- New documents must persist `sourceAccessLevel: 'private'`.

## Backward compatibility

Existing documents persisted with `sourceAccessLevel: 'public-proxy-only'`
remain readable through the authenticated, ownership-checked source-PDF
proxy. That value is read-compatible legacy data only and must never be
written for a new document.

## Verification scope

The remediation gate covers private-store integration, fail-closed project
creation, authenticated source serving, visual rendering of the real 122-page
PDF across desktop/mobile and light/dark themes, and byte-identical export.
