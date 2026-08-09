import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineLanguageOverlayPage({
	description: "German Attestation occurrence evidence fields.",
	family: "feature-attestation",
	order: 8100,
	subject: "attestation",
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

Canonical versus Variant spelling remains a Surface property. The docs keep
\`sentenceMarkdown\` outside Attestation solely as display and review context.
`,
});

export default document;
