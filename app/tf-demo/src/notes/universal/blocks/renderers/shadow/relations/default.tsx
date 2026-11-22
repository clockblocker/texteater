import {
	IconSwap,
	LinkButton,
	NoteList,
	NoteMorphReveal,
	NoteSection,
} from "lego";
import { BrushCleaningIcon, LoaderCircleIcon } from "lucide-react";

import {
	formatCoreFeatureEntries,
	formatLemmaClassLine,
} from "../../../../caption/metadata";
import { citationText } from "../../../citation";
import type { GrammaticalDefaultRenderer } from "../../../renderer";
import { RouteAside } from "../../common/features";
import { LoadMore } from "../../common/load-more";
import { RelationMark } from "../../common/relation-mark";
import { RouteMark } from "../../common/route-mark";

/**
 * Who points at this Shadow, and what it might turn out to be. Each pending
 * relation can be cleaned up from here once the referring Reading no longer
 * needs it. Secondary sections and cleanup controls fold cleanly in Card via
 * `visibility="sheet"` without forking the DOM tree.
 */
type ShadowRelationsProps = Parameters<GrammaticalDefaultRenderer<"Shadow">>[0];

function ShadowRelations({
	noteData,
	PresentationCapabilities,
	Citation,
}: ShadowRelationsProps) {
	const { references, cleanup } = PresentationCapabilities;
	const { candidates } = noteData.inspection;
	// A Breakdown's Constituents and a Source show under Formations instead
	// (ADR 0050).
	const referrers = references.items.flatMap((referrer) => {
		const structuralReferences = referrer.structuralReferences.filter(
			({ aspect, path }) =>
				!(aspect === "breakdown" && path.startsWith("constituents.")) &&
				aspect !== "source",
		);
		return referrer.pendingRelations.length > 0 ||
			structuralReferences.length > 0
			? [{ ...referrer, structuralReferences }]
			: [];
	});
	if (referrers.length === 0 && candidates.length === 0) return null;

	return (
		<>
			{referrers.length > 0 ? (
				<NoteSection label="Referenced by">
					<NoteList>
						{referrers.map((referrer) => (
							<li
								key={referrer.reading.readingId}
								className="grid gap-1"
							>
								<LinkButton
									onClick={() =>
										PresentationCapabilities.follow(
											referrer.reading.target,
										)
									}
								>
									<RouteMark hop="reachedFrom" />
									<span
										aria-hidden="true"
										className="me-[0.35em] text-ink"
									>
										{referrer.reading.emojiDescription}
									</span>
									{citationText(
										Citation({
											...referrer.reading,
											lemma: referrer.reading,
										}),
									)}
								</LinkButton>
								{referrer.pendingRelations.length > 0 ||
								referrer.structuralReferences.length > 0 ? (
									<NoteList
										gap="tight"
										className="ms-7 text-[length:var(--note-aside-size,0.875rem)] text-ink-soft"
									>
										{referrer.pendingRelations.map(
											(pending) => (
												<li
													key={pending.locatorKey}
													className="flex flex-wrap items-baseline"
												>
													<RelationMark
														relation={
															pending.relation
														}
													/>
													<span>
														{pending.relation}
													</span>
													{cleanup.resolve ? (
														<NoteMorphReveal
															as="span"
															visibility="sheet"
															className="inline-grid"
														>
															<LinkButton
																tone="quiet"
																className="ms-3 text-xs"
																disabled={
																	cleanup.activeLocator !==
																	null
																}
																onClick={() =>
																	void cleanup.resolve?.(
																		pending.locatorKey,
																	)
																}
															>
																<IconSwap
																	active={
																		cleanup.activeLocator ===
																		pending.locatorKey
																	}
																	idle={
																		<BrushCleaningIcon />
																	}
																	busy={
																		<LoaderCircleIcon className="animate-spin" />
																	}
																/>
																Clean up
															</LinkButton>
														</NoteMorphReveal>
													) : null}
												</li>
											),
										)}
										{referrer.structuralReferences.map(
											(reference) => (
												<li
													key={`${reference.aspect}:${reference.path}`}
													className="font-mono text-xs text-ink-muted"
												>
													{reference.aspect}{" "}
													{reference.path}
												</li>
											),
										)}
									</NoteList>
								) : null}
							</li>
						))}
					</NoteList>
					{references.hasMore ? (
						<LoadMore
							label="Load more references"
							isLoading={references.isLoading}
							loadMore={references.loadMore}
						/>
					) : null}
					{references.error ? (
						<p
							className="mt-2 text-sm text-destructive"
							role="alert"
						>
							{references.error}
						</p>
					) : null}
				</NoteSection>
			) : null}
			{candidates.length > 0 ? (
				<NoteSection label="Could be" visibility="sheet">
					<NoteList>
						{candidates.map((candidate) => (
							<li key={candidate.lemmaId}>
								<LinkButton
									onClick={() =>
										PresentationCapabilities.follow(
											candidate.target,
										)
									}
								>
									<RouteMark hop="candidate" />
									{candidate.canonicalForm}
								</LinkButton>
								<RouteAside>
									{[
										formatLemmaClassLine(
											candidate.family,
											candidate.kind,
										),
										...formatCoreFeatureEntries(
											noteData.descriptor.language,
											candidate.coreFeatures,
										),
									].join(" · ")}
								</RouteAside>
							</li>
						))}
					</NoteList>
				</NoteSection>
			) : null}
			{cleanup.outcome ? (
				<p className="mt-3 text-sm text-ink-soft" role="status">
					{cleanup.outcome}
				</p>
			) : null}
			{cleanup.actionError ? (
				<p className="mt-3 text-sm text-destructive" role="alert">
					{cleanup.actionError}
				</p>
			) : null}
		</>
	);
}

export const renderDefaultShadowRelations = ((props) => (
	<ShadowRelations {...props} />
)) satisfies GrammaticalDefaultRenderer<"Shadow">;
