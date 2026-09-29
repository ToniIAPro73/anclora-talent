# Source page map

Persist a document-global source page map for rich DOC, DOCX, and ODT imports.
The map is a projection over stable canonical block anchors; chapters remain
semantic sections and are not used as pages.

Acceptance criteria:

- Page boundaries support block and text offsets.
- Source maps survive persistence and reload through document metadata.
- Explicit page breaks are represented without destructively splitting blocks.
- Editor and preview can consume the same canonical page projection.
- Layout-changing edits invalidate source certification.
- Missing authoritative rendered alignment remains unverified.
