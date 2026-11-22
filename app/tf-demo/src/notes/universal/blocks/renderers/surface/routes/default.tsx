import {
	LinkButton,
	NoteAside,
	NoteList,
	NoteMorphReveal,
	NoteSection,
} from "lego";

import { formatLemmaClassLine } from "../../../../caption/metadata";
import type { SurfaceDefaultRenderer } from "../../../renderer";
import { featureSummary, genderTone } from "../../common/feature-values";
import { RouteAside } from "../../common/features";
import { LoadMore } from "../../common/load-more";
import { RouteMark } from "../../common/route-mark";

/**
 * Every Lemma this written form can be. When an opening context selected one
 * active analysis, it leads the list; other analyses fold cleanly in Card via
 * `NoteMorphReveal` while a compact count hints at them, then unfold smoothly
 * as the Card opens into a Sheet.
 */
export const renderDefaultSurfaceRoutes = (({
	noteData,
	PresentationCapabilities,
}) => {
	const { activeAnalysisKey, pagination } = PresentationCapabilities;
	const active = noteData.analyses.find(
		({ analysisKey }) => analysisKey === activeAnalysisKey,
	);
	const ordered = [...noteData.analyses].sort((left, right) =>
		left === active ? -1 : right === active ? 1 : 0,
	);
	if (ordered.length === 0) return null;
	const otherCount = active ? ordered.length - 1 : 0;

	return (
		<NoteSection label="Analyses">
			<NoteList>
				{ordered.map((analysis) => {
					const { lemma } = analysis.presented;
					const isActive = analysis.analysisKey === activeAnalysisKey;
					const tone = genderTone(lemma) ?? "default";
					const inflection = featureSummary(
						analysis.presented.inflectionalFeatures,
					);
					const row = (
						<>
							<LinkButton
								aria-current={isActive ? "true" : undefined}
								onClick={() =>
									PresentationCapabilities.follow(
										analysis.lemmaTarget,
									)
								}
								tone={tone === "default" ? "link" : tone}
							>
								<RouteMark
									hop="leadsTo"
									className={
										isActive ? "text-ink" : undefined
									}
								/>
								{lemma.canonicalForm}
							</LinkButton>
							<RouteAside>
								{[
									formatLemmaClassLine(
										lemma.family,
										lemma.kind,
									),
									inflection,
									analysis.presented.surfaceFeatures
										.historicalStatus,
								]
									.filter(Boolean)
									.join(" · ")}
							</RouteAside>
						</>
					);
					if (active && !isActive) {
						return (
							<NoteMorphReveal
								as="li"
								key={analysis.analysisKey}
								visibility="sheet"
							>
								{row}
							</NoteMorphReveal>
						);
					}
					return (
						<li
							key={analysis.analysisKey}
							data-active={isActive || undefined}
						>
							{row}
						</li>
					);
				})}
			</NoteList>
			{otherCount > 0 ? (
				<NoteMorphReveal visibility="card">
					<NoteAside as="p" className="mt-2 tabular-nums">
						{otherCount === 1
							? "1 other reading of this form"
							: `${otherCount} other readings of this form`}
					</NoteAside>
				</NoteMorphReveal>
			) : null}
			{pagination?.hasMore ? (
				<LoadMore
					label="Load more analyses"
					isLoading={pagination.isLoading}
					loadMore={pagination.loadMore}
				/>
			) : null}
			{pagination?.error ? (
				<p className="mt-2 text-sm text-destructive" role="alert">
					{pagination.error}
				</p>
			) : null}
		</NoteSection>
	);
}) satisfies SurfaceDefaultRenderer;
