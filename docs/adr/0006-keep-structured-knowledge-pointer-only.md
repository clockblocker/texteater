---
status: accepted
---

# Keep structured Knowledge pointer-only

Morphological Tree stores only ordered hierarchy whose leaves point to lexical
Unit Shadows or resolved Morpheme Readings, and Lexical Breakdown stores only an
ordered list of Lexeme Unit Shadows. Dumling DTOs already own grammatical
distinctions, while any source coordinates used between Dumgen prompt phases
are transient execution data that must disappear before projection into
Dumrel Knowledge.
