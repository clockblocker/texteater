import { NoteTitle, NoteTitleLink, NoteTitleRow } from "lego";
import type { SurfaceDefaultRenderer } from "../../../renderer";
import { genderTone } from "../../common/feature-values";

/**
 * The active analysis supplies the heading's gender and article destination.
 * An ambiguous aggregate without an active analysis keeps its neutral title.
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
	const prefix = article?.presented.normalizedSurface;
	const hasArticle = prefix && form.startsWith(`${prefix} `);
	return (
		<header>
			<NoteTitleRow>
				<NoteTitle
					data-surface-title=""
					tone={
						active ? genderTone(active.presented.lemma) : undefined
					}
				>
					{article && hasArticle ? (
						<>
							<NoteTitleLink
								aria-label={`${prefix}, open its DET Surface`}
								onClick={() =>
									PresentationCapabilities.follow(
										article.target,
										article.presentationContext,
									)
								}
							>
								{prefix}
							</NoteTitleLink>
							{form.slice(prefix.length)}
						</>
					) : (
						form
					)}
				</NoteTitle>
				<span className="text-sm text-ink-muted">
					{count === 1 ? "1 reading" : `${count} readings`}
					{noteData.isDone ? "" : "+"}
				</span>
			</NoteTitleRow>
		</header>
	);
}) satisfies SurfaceDefaultRenderer;
