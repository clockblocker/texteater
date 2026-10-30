import { NoteTitle } from "lego";
import type { ReactNode } from "react";
import type { SupportedTargetLanguage } from "../../../../../../../shared/supported-target-language";
import { lemmaTitle, surfaceCaption } from "../../../../caption/caption";
import {
	CaptionedHeading,
	captionLanguages,
} from "../../../../caption/heading-caption";
import type { NoteDataFor } from "../../../../note/data";
import type { NoteBlockRenderer } from "../../../renderer";
import { genderTone } from "../../common/feature-values";

type SurfaceContext = Parameters<
	NoteBlockRenderer<SupportedTargetLanguage, "Surface">
>[0];
type SurfaceAnalysis = NoteDataFor<"Surface">["analyses"][number];

/**
 * The active analysis supplies the heading's gender, and its caption: what
 * this form is of the Lemma in front of it. An ambiguous aggregate without
 * an active analysis keeps its bare, neutral title. The title is the stored
 * form unless a language prints it otherwise, from the active analysis.
 */
export function SurfaceHeading({
	context: { noteData, PresentationCapabilities },
	title,
}: {
	readonly context: SurfaceContext;
	readonly title?: (active: SurfaceAnalysis | undefined) => ReactNode;
}) {
	const active =
		noteData.analyses.find(
			({ analysisKey }) =>
				analysisKey === PresentationCapabilities.activeAnalysisKey,
		) ??
		(noteData.analyses.length === 1 && noteData.isDone
			? noteData.analyses[0]
			: undefined);
	const languages = captionLanguages(noteData.target.language);
	const caption =
		active && languages
			? surfaceCaption(
					active.presented,
					lemmaTitle(active.presented.lemma, languages.target),
					languages,
				)
			: null;
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
					<bdi>
						{title
							? title(active)
							: noteData.target.normalizedSurface}
					</bdi>
				</NoteTitle>
			}
			caption={caption}
		/>
	);
}
