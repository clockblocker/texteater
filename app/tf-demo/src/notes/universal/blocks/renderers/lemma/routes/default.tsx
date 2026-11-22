import { LinkButton, NoteList, NoteSection } from "lego";
import type { ReactNode } from "react";

import { formatLemmaClassLine } from "../../../../caption/metadata";
import { citationText } from "../../../citation";
import type { GrammaticalDefaultRenderer } from "../../../renderer";
import { RouteAside } from "../../common/features";
import { LoadMore } from "../../common/load-more";
import { RouteMark } from "../../common/route-mark";

/**
 * What this Lemma connects: the Readings it leads to, a verb's participial
 * adjectives, the written forms it was reached from, and other Lemmas spelled
 * the same. Secondary sections fold smoothly in Card via `visibility="sheet"`
 * and unfold into Sheet without forking the DOM tree.
 */
export const renderDefaultLemmaRoutes = (({
	noteData,
	PresentationCapabilities,
	Citation,
}) => {
	const { connections, presented, participialAdjectives } = noteData;
	const { pagination } = PresentationCapabilities;
	const sections: ReactNode[] = [];

	if (connections.readings.length > 0) {
		sections.push(
			<NoteSection key="readings" label="Readings">
				<NoteList>
					{connections.readings.map((reading) => (
						<li key={reading.readingId}>
							<LinkButton
								onClick={() =>
									PresentationCapabilities.follow(
										reading.target,
									)
								}
							>
								<RouteMark hop="leadsTo" />
								<span
									aria-hidden="true"
									className="me-[0.35em] text-ink"
								>
									{reading.emojiDescription}
								</span>
								{citationText(
									Citation({ ...reading, lemma: presented }),
								)}
							</LinkButton>
						</li>
					))}
				</NoteList>
			</NoteSection>,
		);
	}

	if (participialAdjectives.length > 0) {
		sections.push(
			<NoteSection
				key="participial"
				label="Participial adjectives"
				visibility="sheet"
			>
				<NoteList>
					{participialAdjectives.map((adjective) => (
						<li key={adjective.readingId}>
							<LinkButton
								onClick={() =>
									PresentationCapabilities.follow(
										adjective.target,
									)
								}
							>
								<span
									aria-hidden="true"
									className="me-[0.35em] text-ink"
								>
									{adjective.emojiDescription}
								</span>
								{adjective.canonicalForm}
							</LinkButton>
						</li>
					))}
				</NoteList>
			</NoteSection>,
		);
	}

	if (connections.surfaces.length > 0) {
		sections.push(
			<NoteSection
				key="surfaces"
				label="Written forms"
				visibility="sheet"
			>
				<NoteList layout="wrap">
					{connections.surfaces.map((surface) => (
						<li key={surface.surfaceId}>
							<LinkButton
								onClick={() =>
									PresentationCapabilities.follow(
										surface.target,
										{
											activeAnalysisKey:
												surface.surfaceId,
											...(PresentationCapabilities.activeReadingId
												? {
														activeReadingId:
															PresentationCapabilities.activeReadingId,
													}
												: {}),
										},
									)
								}
							>
								<RouteMark
									hop="reachedFrom"
									className="me-1.5"
								/>
								{surface.normalizedSurface}
							</LinkButton>
						</li>
					))}
				</NoteList>
			</NoteSection>,
		);
	}

	if (connections.sameWrittenForm.length > 0) {
		sections.push(
			<NoteSection
				key="same"
				label="Same written form"
				visibility="sheet"
			>
				<NoteList>
					{connections.sameWrittenForm.map((lemma) => (
						<li key={lemma.lemmaId}>
							<LinkButton
								onClick={() =>
									PresentationCapabilities.follow(
										lemma.target,
									)
								}
							>
								<RouteMark hop="sameWrittenForm" />
								{lemma.canonicalForm}
							</LinkButton>
							<RouteAside>
								{formatLemmaClassLine(lemma.family, lemma.kind)}
							</RouteAside>
						</li>
					))}
				</NoteList>
			</NoteSection>,
		);
	}

	if (sections.length === 0 && !pagination.hasMore) return null;

	return (
		<>
			{sections}
			{pagination.hasMore ? (
				<LoadMore
					label="Load more connections"
					isLoading={pagination.isLoading}
					loadMore={pagination.loadMore}
				/>
			) : null}
			{pagination.error ? (
				<p className="mt-2 text-sm text-destructive" role="alert">
					{pagination.error}
				</p>
			) : null}
		</>
	);
}) satisfies GrammaticalDefaultRenderer<"Lemma">;
