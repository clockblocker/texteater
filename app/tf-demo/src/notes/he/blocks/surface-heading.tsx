import { NoteTitle } from "lego";
import type { SurfaceDefaultRenderer } from "../../universal/blocks/renderer";
import { genderTone } from "../../universal/blocks/renderers/common/feature-values";
import { CaptionedHeading } from "../../universal/caption/heading-caption";
import type { Caption } from "../../universal/caption/wording";
import { hebrewFeaturePhrases } from "../features";

export const renderHebrewSurfaceHeading = (({
	noteData,
	PresentationCapabilities,
}) => {
	const active =
		noteData.analyses.find(
			({ analysisKey }) =>
				analysisKey === PresentationCapabilities.activeAnalysisKey,
		) ??
		(noteData.isDone && noteData.analyses.length === 1
			? noteData.analyses[0]
			: undefined);
	let caption: Caption | null = null;
	if (active) {
		const { presented } = active;
		const features =
			presented.grundform === true
				? []
				: hebrewFeaturePhrases(presented.inflectionalFeatures);
		const variant =
			presented.spelling.kind === "Variant"
				? presented.spelling.variantTags.map((tag) => tag.toLowerCase())
				: [];
		const phrases = [...variant, ...features];
		if (
			phrases.length > 0 ||
			presented.normalizedSurface !== presented.lemma.canonicalForm
		) {
			const form = phrases.length
				? `${phrases.join(", ")} form of`
				: "form of";
			caption = {
				card: [{ kind: "Word", text: form }],
				sheet: [
					{ kind: "Word", text: `${form} ` },
					{ kind: "Next", text: presented.lemma.canonicalForm },
				],
			};
		}
	}
	return (
		<CaptionedHeading
			presentation={PresentationCapabilities.presentation}
			title={
				<NoteTitle
					data-surface-title=""
					tone={
						active ? genderTone(active.presented.lemma) : undefined
					}
				>
					<bdi lang="he" dir="rtl">
						{noteData.target.normalizedSurface}
					</bdi>
				</NoteTitle>
			}
			caption={caption}
		/>
	);
}) satisfies SurfaceDefaultRenderer;
