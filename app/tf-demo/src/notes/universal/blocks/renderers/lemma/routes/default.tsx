import { Button, LinkButton, NoteSection } from "lego";
import { LoaderCircleIcon } from "lucide-react";
import type { ReactNode } from "react";

import type { GrammaticalDefaultRenderer } from "../../../renderer";
import { RouteAside } from "../../common/features";
import { RouteMark } from "../../common/route-mark";

/**
 * What this Lemma connects: the Readings it leads to, the written forms it
 * was reached from, and other Lemmas spelled the same. A Card keeps only the
 * Readings; the Sheet reveals the rest.
 */
export const renderDefaultLemmaRoutes = (({
	noteData,
	PresentationCapabilities,
}) => {
	const { connections, presented } = noteData;
	const isCard = PresentationCapabilities.presentation === "Card";
	const { pagination } = PresentationCapabilities;
	const sections: ReactNode[] = [];

	if (connections.readings.length > 0) {
		sections.push(
			<NoteSection key="readings" aria-label="Readings" label="Readings">
				<ul className="grid gap-2">
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
								<span className="mr-[0.35em] text-ink">
									{reading.emojiDescription}
								</span>
								{presented.canonicalForm}
							</LinkButton>
						</li>
					))}
				</ul>
			</NoteSection>,
		);
	}

	if (!isCard && connections.surfaces.length > 0) {
		sections.push(
			<NoteSection
				key="surfaces"
				aria-label="Written forms"
				label="Written forms"
			>
				<ul className="flex flex-wrap gap-x-5 gap-y-2">
					{connections.surfaces.map((surface) => (
						<li key={surface.surfaceId}>
							<LinkButton
								onClick={() =>
									PresentationCapabilities.follow(
										surface.target,
									)
								}
							>
								<RouteMark
									hop="reachedFrom"
									className="mr-1.5"
								/>
								{surface.normalizedSurface}
							</LinkButton>
						</li>
					))}
				</ul>
			</NoteSection>,
		);
	}

	if (!isCard && connections.sameWrittenForm.length > 0) {
		sections.push(
			<NoteSection
				key="same"
				aria-label="Same written form"
				label="Same written form"
			>
				<ul className="grid gap-2">
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
								{lemma.family} · {lemma.kind}
							</RouteAside>
						</li>
					))}
				</ul>
			</NoteSection>,
		);
	}

	if (sections.length === 0 && !pagination.hasMore) return null;

	return (
		<>
			{sections}
			{!isCard && pagination.hasMore ? (
				<Button
					variant="outline"
					size="sm"
					className="mt-4 w-fit"
					disabled={
						pagination.isLoading || pagination.loadMore === null
					}
					onClick={() => void pagination.loadMore?.()}
				>
					{pagination.isLoading ? (
						<LoaderCircleIcon className="animate-spin" />
					) : null}
					{pagination.isLoading
						? "Loading…"
						: "Load more connections"}
				</Button>
			) : null}
			{pagination.error ? (
				<p className="mt-2 text-sm text-destructive" role="alert">
					{pagination.error}
				</p>
			) : null}
		</>
	);
}) satisfies GrammaticalDefaultRenderer<"Lemma">;
