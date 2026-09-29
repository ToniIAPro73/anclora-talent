# Source page map implementation plan

1. Add canonical anchors, source map statuses, slices, projection, and certification.
2. Derive an initial map during rich import from rendered pages or explicit breaks.
3. Persist the map in existing JSON document metadata.
4. Make editor and preview consume the projection when the map is valid.
5. Invalidate source certification after layout-changing edits.
