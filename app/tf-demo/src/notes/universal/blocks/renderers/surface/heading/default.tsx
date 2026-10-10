import { NoteTitle, NoteTitleRow } from "lego";
import type { SurfaceDefaultRenderer } from "../../../renderer";
import { genderTone } from "../../common/feature-values";

/**
 * The active analysis supplies the heading's gender. An ambiguous aggregate
 * without an active analysis keeps its bare, neutral title.
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
	return (
		<header>
			<NoteTitleRow>
				<NoteTitle
					data-surface-title=""
					tone={
						active ? genderTone(active.presented.lemma) : undefined
					}
				>
					{noteData.target.normalizedSurface}
				</NoteTitle>
			</NoteTitleRow>
		</header>
	);
}) satisfies SurfaceDefaultRenderer;
