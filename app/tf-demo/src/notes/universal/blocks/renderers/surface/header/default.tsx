import { NoteTitle, NoteTitleLink, NoteTitleRow } from "lego";
import { displayedArticle } from "../../../../../../../shared/surface-display";
import type { SurfaceDefaultRenderer } from "../../../renderer";
import { genderTone } from "../../common/feature-values";

/**
 * The active analysis supplies the heading's gender and the article a noun is
 * displayed with (`dem Wald`), linked to its DET Surface. An ambiguous
 * aggregate without an active analysis keeps its bare, neutral title.
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
	const article = active?.article;
	const form = noteData.target.normalizedSurface;
	const shown = active ? displayedArticle(active.presented) : null;
	return (
		<header>
			<NoteTitleRow>
				<NoteTitle
					data-surface-title=""
					tone={
						active ? genderTone(active.presented.lemma) : undefined
					}
				>
					{shown && article ? (
						<NoteTitleLink
							aria-label={`${shown.text}, open its DET Surface`}
							onClick={() =>
								PresentationCapabilities.follow(
									article.target,
									article.presentationContext,
								)
							}
						>
							{shown.text}
						</NoteTitleLink>
					) : (
						shown?.text
					)}
					{shown?.joiner}
					{form}
				</NoteTitle>
				<span className="text-sm text-ink-muted">
					{count === 1 ? "1 reading" : `${count} readings`}
					{noteData.isDone ? "" : "+"}
				</span>
			</NoteTitleRow>
		</header>
	);
}) satisfies SurfaceDefaultRenderer;
