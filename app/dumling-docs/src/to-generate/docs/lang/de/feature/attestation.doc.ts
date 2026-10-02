import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineLanguageOverlayPage({
	description: "German Attestation occurrence evidence fields.",
	order: 8100,
	title: "Attestation",
	body: `
Attestations preserve click-independent occurrence evidence without importing
sentence indices or interaction state into Dumling.

- \`members\` is a non-empty source-ordered tuple.
- Every member pairs its exact \`attested\` string with \`Standard | Typo\`
  orthography evidence.
- \`realizationCoverage\` records whether those members fully or partially
  realize the linked Surface.
- \`surface\` links the occurrence to reusable grammatical normalization.
- German verbal and \`ADP\` Attestations add \`valencyEvidence\`. A verb
  names the member realizing each governed preposition; an adposition, Lexeme
  or Locution, records the case its complement took, as one bare-case slot
  with no member, and never where it stands.

Canonical versus Variant spelling remains a Surface property. The docs keep
\`sentenceMarkdown\` outside Attestation solely as display and review context.
`,
});

export default document;
