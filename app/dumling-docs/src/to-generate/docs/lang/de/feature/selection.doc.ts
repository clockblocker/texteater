import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineLanguageOverlayPage({
	description: "German Selection evidence fields.",
	family: "feature-selection",
	order: 8100,
	subject: "selection",
	title: "Selection",
	body: `
Selections preserve sentence-local click evidence without moving linguistic
properties off the Surface.

- \`segmentedSentenceId\` scopes every local segment index.
- \`clickedSegmentIndex\` identifies the clicked \`ResolvableText\` Segment.
- \`surfaceSegmentIndices\` identifies the complete, possibly discontinuous
  Surface occurrence.
- \`attestedSurface\` preserves the noisy input across those segments.
- \`selectedOrthography\` is \`Standard\` or \`Typo\` for the clicked segment.

Canonical versus Variant spelling and Full versus Partial realization are
Surface properties.
`,
});

export default document;
