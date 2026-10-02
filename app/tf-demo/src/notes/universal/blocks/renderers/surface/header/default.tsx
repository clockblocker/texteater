import { NoteTitle, NoteTitleRow } from "lego";
import type { SurfaceDefaultRenderer } from "../../../renderer";
import { genderTone } from "../../common/feature-values";

/**
 * The active analysis supplies the heading's gender. An ambiguous aggregate
 * without an active analysis keeps its bare, neutral title.
 */
export const renderDefaultSurfaceHeader = (({
	noteData,
	PresentationCapabilities,
}) => {
	const count = noteData.analyses.length;
	const active =
		noteData.analyses.find(
			({ analysisKey }) =>
				analysisKey === PresentationCapabilities.activeAnalysisKey,
		) ??
		(count === 1 && noteData.isDone ? noteData.analyses[0] : undefined);
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
				<span className="text-sm text-ink-muted">
					{count === 1 ? "1 reading" : `${count} readings`}
					{noteData.isDone ? "" : "+"}
				</span>
			</NoteTitleRow>
		</header>
	);
}) satisfies SurfaceDefaultRenderer;
