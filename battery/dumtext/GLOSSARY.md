# Dumtext

Dumtext reads text into Extracted Text (tf-demo's Intake) and splits it into
paragraphs and Sentences in code. Each entry links the ADR that holds the
term's precise definition.

## Language

**`splitText`**:
The code that splits raw text into paragraphs and Sentences before
`language.detect` and `segment.inUnits` (Dumgen) see it. It is
language-neutral, since it runs before any language is known. See
[Dumgen ADR 0007].

[Dumgen ADR 0007]: ../dumgen/docs/adr/0007-segment-text-into-biggest-units-and-break-multiword-lemmas-down-apart.md
