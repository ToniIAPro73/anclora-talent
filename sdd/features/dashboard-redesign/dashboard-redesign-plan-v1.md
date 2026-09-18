# Implementation plan

1. Audit routes, summary fields, retrieval, menus and semantic tokens.
2. Add behavioral tests before implementing the compact dashboard and read-only cover summary mapping.
3. Replace dashboard presentation, keeping the modal and FileStudio integration. Scope compact shell styling to dashboard; preserve legacy create entry by redirect.
4. Validate unit tests, actual browser rendering, themes/locales/responsiveness and failure states. Run full gates.
5. Commit and push development only after local validation. Resolve the exact preview and dynamic protection access, then smoke test. Record evidence and final verdict.
