---
status: accepted
---

# Use batch-only Intake and deterministic local Source Segmentation

Dumgen accepts a bounded batch through one Intake model call, then dispatches
accepted German and Hebrew text to deterministic, package-free Source
Segmentation. This keeps the model judgment singular while making segmentation
local, lossless, and reproducible; analyzer-backed Hebrew segmentation was
rejected because its footprint and server-only deployment violate that local
boundary.
