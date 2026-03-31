# Editorial Domain Rules

- The product is document-first.
- The editor must operate on a canonical document model.
- Preview and export must consume the same document source.
- New format importers must map into the canonical model before rendering.
- PDF import must be treated as assisted reconstruction, not guaranteed perfect editability.
- `doc` support should be implemented through backend conversion or an intermediary normalization path.
