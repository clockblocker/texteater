import { LinkButton, NoteSection } from "lego";

import type { SurfaceDefaultRenderer } from "../../../renderer";
import { featureSummary, genderTone } from "../../common/feature-values";
import { RouteAside } from "../../common/features";
import { LoadMore } from "../../common/load-more";
import { RouteMark } from "../../common/route-mark";

/**
 * Every Lemma this written form can be. In Card form only the analysis the
 * opening context selected is shown; the Sheet reveals the whole aggregate.
 */
export const renderDefaultSurfaceRoutes = (({
	noteData,
	PresentationCapabilities,
}) => {
	const { activeAnalysisKey, presentation, pagination } =
		PresentationCapabilities;
	const isCard = presentation === "Card";
	const active = noteData.analyses.find(
		({ analysisKey }) => analysisKey === activeAnalysisKey,
	);
	const shown =
		isCard && active
			? [active]
			: [...noteData.analyses].sort((left, right) =>
					left === active ? -1 : right === active ? 1 : 0,
				);
	const hidden = noteData.analyses.length - shown.length;
	if (shown.length === 0) return null;

	return (
		<NoteSection aria-label="Analyses" label="Analyses">
			<ul className="grid gap-2">
				{shown.map((analysis) => {
					const { lemma } = analysis.presented;
					const isActive = analysis.analysisKey === activeAnalysisKey;
					const tone = genderTone(lemma) ?? "default";
					const inflection = featureSummary(
						analysis.presented.inflectionalFeatures,
					);
					return (
						<li
							key={analysis.analysisKey}
							data-active={isActive || undefined}
						>
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
									`${lemma.family} · ${lemma.kind}`,
									inflection,
									analysis.presented.surfaceFeatures
										.historicalStatus,
								]
									.filter(Boolean)
									.join(" · ")}
							</RouteAside>
						</li>
					);
				})}
			</ul>
			{hidden > 0 ? (
				<p className="mt-2 text-sm text-ink-muted compact:text-xs">
					{hidden === 1
						? "1 other reading of this form"
						: `${hidden} other readings of this form`}
				</p>
			) : null}
			{!isCard && pagination?.hasMore ? (
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
