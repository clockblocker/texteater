import { NoteTitle } from "lego";
import { lemmaTitle, surfaceCaption } from "../../../../caption/caption";
import {
	CaptionedHeading,
	captionLanguages,
} from "../../../../caption/heading-caption";
import type { SurfaceDefaultRenderer } from "../../../renderer";
import { genderTone } from "../../common/feature-values";

/**
 * The active analysis supplies the heading's gender, and its caption: what
 * this form is of the Lemma in front of it. An ambiguous aggregate without
 * an active analysis keeps its bare, neutral title.
 */
export const renderDefaultSurfaceHeading = (({
	noteData,
	PresentationCapabilities,
}) => {
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
			title={
				<NoteTitle
					data-surface-title=""
					tone={
						active ? genderTone(active.presented.lemma) : undefined
					}
				>
					<bdi>{noteData.target.normalizedSurface}</bdi>
				</NoteTitle>
			}
			caption={caption}
		/>
	);
}) satisfies SurfaceDefaultRenderer;
