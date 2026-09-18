# Font family preview in composition controls

## Intent
Show each selectable font family rendered in its own typeface, like desktop office applications, while preserving the existing composition value and all available families.

## Acceptance criteria
- The document composition font-family control opens a styled list where each family name uses its own family.
- The current family remains selectable even when it is not in the default Google Fonts list.
- Selecting a family updates the existing composition setting and loads the font as before.
- Existing keyboard and form-value behavior remains available to assistive technology and current consumers.
