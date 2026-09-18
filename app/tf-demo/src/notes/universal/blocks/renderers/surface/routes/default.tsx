import { Button, IconSwap, LinkButton, NoteSection } from "lego";
import { ChevronDownIcon, LoaderCircleIcon } from "lucide-react";

import type { SurfaceDefaultRenderer } from "../../../renderer";
import { featureSummary, genderTone } from "../../common/feature-values";
import { RouteAside } from "../../common/features";
import { RouteMark } from "../../common/route-mark";

const TONE_CLASS = {
	feminine: "text-gender-feminine",
	masculine: "text-gender-masculine",
	neuter: "text-gender-neuter",
	default: "",
} as const;

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
					const { article } = analysis;
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
							{article ? (
								<div className="mb-2">
									<LinkButton
										className={TONE_CLASS[tone]}
										onClick={() =>
											PresentationCapabilities.follow(
												article.target,
												article.presentationContext,
											)
										}
									>
										{article.presented.normalizedSurface}
									</LinkButton>
									<RouteAside>
										Article ·{" "}
										{featureSummary(
											article.presented
												.inflectionalFeatures,
										)}
									</RouteAside>
								</div>
							) : null}
							<LinkButton
								aria-current={isActive ? "true" : undefined}
								onClick={() =>
									PresentationCapabilities.follow(
										analysis.lemmaTarget,
									)
								}
								className={TONE_CLASS[tone]}
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
				<Button
					variant="outline"
					size="sm"
					className="mt-4 w-fit"
					disabled={
						pagination.isLoading || pagination.loadMore === null
					}
					onClick={() => void pagination.loadMore?.()}
				>
					<IconSwap
						data-icon="inline-start"
						active={pagination.isLoading}
						idle={<ChevronDownIcon />}
						busy={<LoaderCircleIcon className="animate-spin" />}
					/>
					{pagination.isLoading ? "Loading…" : "Load more analyses"}
				</Button>
			) : null}
			{pagination?.error ? (
				<p className="mt-2 text-sm text-destructive" role="alert">
					{pagination.error}
				</p>
			) : null}
		</NoteSection>
	);
}) satisfies SurfaceDefaultRenderer;
