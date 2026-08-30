---
status: superseded by ADR-0002
---

# Separate linguistic entry identity from lemma form

The system originally gave every linguistic entry an opaque identity distinct
from its display form. This avoided merging homographs by spelling or features,
but required language-specific identity policy and was replaced by the
tuple-derived Lemma identity in ADR-0002.
