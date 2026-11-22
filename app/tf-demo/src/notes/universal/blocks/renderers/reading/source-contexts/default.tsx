import { NoteList, NoteQuoteSkeleton, NoteSection } from "lego";
import type { ReactNode } from "react";

import type { NoteDataFor } from "../../../../note/data";
import type { ReadingDefaultRenderer } from "../../../renderer";
import { LoadMore } from "../../common/load-more";
import { citedOrigin, SourceQuote } from "../../common/source-quote";

type SourceContext = NoteDataFor<"Reading">["sourceContexts"]["page"][number];

/** A line under one quoted Source Context, such as its realized case. */
export type SourceContextCaption = (
	sourceContext: SourceContext,
	lemma: {
		readonly language: string;
		readonly family: string;
		readonly canonicalForm: string;
	},
) => ReactNode;

/**
 * The Reading's Source Contexts, each quoted with its members lit. A route
 * may add a caption under each quote.
 */
export function readingSourceContextsRenderer(
	caption?: SourceContextCaption,
): ReadingDefaultRenderer {
	return (({ noteData, PresentationCapabilities, Citation }) => {
		const { sourceContexts } = PresentationCapabilities;
		if (noteData.pending?.sourceContexts) {
			return (
				<NoteSection label="In context" aria-busy="true">
					<NoteQuoteSkeleton />
				</NoteSection>
			);
		}
		if (
			sourceContexts.items.length === 0 &&
			!sourceContexts.hasMore &&
			sourceContexts.error === null
		) {
			return null;
		}

		return (
			<NoteSection label="In context">
				{sourceContexts.items.length > 0 ? (
					<NoteList gap="loose">
						{sourceContexts.items.map((sourceContext) => (
							<li key={sourceContext.attestationId}>
								<SourceQuote
									segments={sourceContext.segments}
									memberSegmentIndices={
										sourceContext.memberSegmentIndices
									}
									language={noteData.reading.lemma.language}
									origin={citedOrigin(
										sourceContext.origin,
										Citation,
									)}
									follow={() =>
										PresentationCapabilities.follow(
											sourceContext.target,
										)
									}
								/>
								{caption?.(
									sourceContext,
									noteData.reading.lemma,
								)}
							</li>
						))}
					</NoteList>
				) : null}
				{sourceContexts.hasMore ? (
					<LoadMore
						label="Load more passages"
						isLoading={sourceContexts.isLoading}
						loadMore={sourceContexts.loadMore}
					/>
				) : null}
				{sourceContexts.error ? (
					<p className="mt-2 text-sm text-destructive" role="alert">
						{sourceContexts.error}
					</p>
				) : null}
			</NoteSection>
		);
	}) satisfies ReadingDefaultRenderer;
}

export const renderDefaultReadingSourceContexts =
	readingSourceContextsRenderer();
