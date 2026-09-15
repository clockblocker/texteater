import { Button, IconSwap, LinkButton, NoteSection } from "lego";
import {
	BrushCleaningIcon,
	ChevronDownIcon,
	LoaderCircleIcon,
} from "lucide-react";

import type { GrammaticalDefaultRenderer } from "../../../renderer";
import { RouteAside } from "../../common/features";
import { RelationMark } from "../../common/relation-mark";
import { RouteMark } from "../../common/route-mark";

/**
 * Who points at this Shadow, and what it might turn out to be. Each pending
 * relation can be cleaned up from here once the referring Reading no longer
 * needs it.
 */
export const renderDefaultShadowRelations = (({
	noteData,
	PresentationCapabilities,
}) => {
	const { references, cleanup } = PresentationCapabilities;
	const isCard = PresentationCapabilities.presentation === "Card";
	const { candidates } = noteData.inspection;
	const referrers = references.items;
	if (referrers.length === 0 && candidates.length === 0) return null;

	return (
		<>
			{referrers.length > 0 ? (
				<NoteSection aria-label="Referenced by" label="Referenced by">
					<ul className="grid gap-2">
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
									<span className="me-[0.35em] text-ink">
										{referrer.reading.emojiDescription}
									</span>
									{referrer.reading.canonicalForm}
								</LinkButton>
								{referrer.pendingRelations.length > 0 ||
								referrer.structuralReferences.length > 0 ? (
									<ul className="ms-7 grid gap-1 text-sm text-ink-soft">
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
													{cleanup.resolve &&
													!isCard ? (
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
									</ul>
								) : null}
							</li>
						))}
					</ul>
					{!isCard && references.hasMore ? (
						<Button
							variant="outline"
							size="sm"
							className="mt-4 w-fit"
							disabled={
								references.isLoading ||
								references.loadMore === null
							}
							onClick={() => void references.loadMore?.()}
						>
							<IconSwap
								data-icon="inline-start"
								active={references.isLoading}
								idle={<ChevronDownIcon />}
								busy={
									<LoaderCircleIcon className="animate-spin" />
								}
							/>
							{references.isLoading
								? "Loading…"
								: "Load more references"}
						</Button>
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
			{!isCard && candidates.length > 0 ? (
				<NoteSection aria-label="Could be" label="Could be">
					<ul className="grid gap-2">
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
										`${candidate.family} · ${candidate.kind}`,
										...candidate.coreFeatures.map(
											({ name, value }) =>
												`${name} ${value}`,
										),
									].join(" · ")}
								</RouteAside>
							</li>
						))}
					</ul>
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
}) satisfies GrammaticalDefaultRenderer<"Shadow">;
