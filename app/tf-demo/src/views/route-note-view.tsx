import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useConvex } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { LoaderCircleIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { PageNavigation } from "@/components/page-navigation";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { hrefFor, type RouteNoteTarget } from "@/lib/navigation";
import { NotFoundView } from "@/views/not-found-view";
import { api } from "../../convex/_generated/api";

export type RouteNote = Extract<
	NonNullable<FunctionReturnType<typeof api.presentation.getNote>>,
	{ kind: "RouteNote" }
>;

export function RouteNoteView({ target }: { target: RouteNoteTarget }) {
	const noteQuery = useQuery({
		...convexQuery(api.presentation.getNote, { target }),
		gcTime: 10_000,
	});
	if (noteQuery.isPending) return <RouteNoteSkeleton />;
	if (
		noteQuery.data?.kind !== "RouteNote" ||
		noteQuery.data.routeKind !== target.routeKind
	) {
		return (
			<NotFoundView
				title="Route Note not found"
				description="This Route Note does not exist, was removed, or its target kind does not match the stored record."
			/>
		);
	}
	return noteQuery.data.routeKind === "Attestation" ? (
		<RouteNoteFrame note={noteQuery.data} />
	) : (
		<PaginatedRouteNote initialNote={noteQuery.data} />
	);
}

export function RouteNoteFrame({
	note,
	pagination,
}: {
	note: RouteNote;
	pagination?: React.ReactNode;
}) {
	return (
		<main className="min-h-svh bg-background px-4 py-8 sm:px-6 sm:py-12">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
				<header className="flex flex-wrap items-start justify-between gap-4">
					<div className="flex flex-col gap-2">
						<p className="text-sm font-medium text-muted-foreground">
							{note.routeKind} Route Note
						</p>
						<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
							{routeNoteTitle(note)}
						</h1>
					</div>
					<PageNavigation />
				</header>

				<RouteNoteBody note={note} />
				{pagination}
			</div>
		</main>
	);
}

export function RouteNoteBody({ note }: { note: RouteNote }) {
	return note.routeKind === "Attestation" ? (
		<AttestationRouteNote note={note} />
	) : note.routeKind === "Surface" ? (
		<SurfaceRouteNote note={note} />
	) : (
		<LemmaRouteNote note={note} />
	);
}

type PaginatedRouteNote = Extract<
	RouteNote,
	{ routeKind: "Surface" | "Lemma" }
>;

type RouteNotePaginationState = {
	readonly note: PaginatedRouteNote;
	readonly cursor: string;
	readonly isDone: boolean;
	readonly isLoading: boolean;
};

export function resetRouteNotePagination(
	note: PaginatedRouteNote,
): RouteNotePaginationState {
	return {
		note,
		cursor: note.connections.continueCursor,
		isDone: note.connections.isDone,
		isLoading: false,
	};
}

function PaginatedRouteNote({
	initialNote,
}: {
	initialNote: PaginatedRouteNote;
}) {
	const convex = useConvex();
	const [pagination, setPagination] = useState(() =>
		resetRouteNotePagination(initialNote),
	);
	const [error, setError] = useState<string | null>(null);
	const revision = useRef(0);
	const { note, cursor, isDone, isLoading } = pagination;

	useEffect(() => {
		revision.current += 1;
		setPagination(resetRouteNotePagination(initialNote));
		setError(null);
	}, [initialNote]);

	async function loadMore() {
		if (isDone || isLoading) return;
		setPagination((current) => ({ ...current, isLoading: true }));
		setError(null);
		const requestedRevision = revision.current;
		try {
			const next = await convex.query(api.presentation.getNote, {
				target: note.target,
				contextCursor: cursor,
			});
			if (
				requestedRevision !== revision.current ||
				next?.kind !== "RouteNote" ||
				next.routeKind !== note.routeKind
			) {
				if (requestedRevision === revision.current) {
					setPagination((current) => ({
						...current,
						isDone: true,
						isLoading: false,
					}));
				}
				return;
			}
			setPagination((current) => ({
				note: mergeRouteNotePages(current.note, next),
				cursor: next.connections.continueCursor,
				isDone: next.connections.isDone,
				isLoading: current.isLoading,
			}));
		} catch (cause) {
			const message = routePageFailureMessage(
				cause,
				requestedRevision,
				revision.current,
			);
			if (message) setError(message);
		} finally {
			if (requestedRevision === revision.current) {
				setPagination((current) => ({
					...current,
					isLoading: false,
				}));
			}
		}
	}

	return (
		<RouteNoteFrame
			note={note}
			pagination={
				<div className="flex flex-col gap-2">
					{!isDone ? (
						<button
							type="button"
							className="inline-flex w-fit items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
							disabled={isLoading}
							onClick={() => void loadMore()}
						>
							{isLoading ? (
								<LoaderCircleIcon className="size-4 animate-spin" />
							) : null}
							{isLoading
								? "Loading…"
								: "Load more route connections"}
						</button>
					) : null}
					{error ? (
						<p className="text-sm text-destructive" role="alert">
							{error}
						</p>
					) : null}
				</div>
			}
		/>
	);
}

export function routePageFailureMessage(
	cause: unknown,
	requestedRevision: number,
	currentRevision: number,
): string | null {
	if (requestedRevision !== currentRevision) return null;
	return cause instanceof Error
		? cause.message
		: "Route connections could not be loaded.";
}

export function mergeRouteNotePages(
	current: PaginatedRouteNote,
	next: PaginatedRouteNote,
): PaginatedRouteNote {
	if (current.routeKind === "Surface" && next.routeKind === "Surface") {
		return {
			...current,
			connections: {
				occurrences: deduplicateBy(
					[
						...current.connections.occurrences,
						...next.connections.occurrences,
					],
					(value) => value.attestationId,
				),
				sameWrittenForm: deduplicateBy(
					[
						...current.connections.sameWrittenForm,
						...next.connections.sameWrittenForm,
					],
					(value) => value.surfaceId,
				),
				continueCursor: next.connections.continueCursor,
				isDone: next.connections.isDone,
			},
		};
	}
	if (current.routeKind === "Lemma" && next.routeKind === "Lemma") {
		return {
			...current,
			connections: {
				surfaces: deduplicateBy(
					[
						...current.connections.surfaces,
						...next.connections.surfaces,
					],
					(value) => value.surfaceId,
				),
				readings: deduplicateBy(
					[
						...current.connections.readings,
						...next.connections.readings,
					],
					(value) => value.readingId,
				),
				sameWrittenForm: deduplicateBy(
					[
						...current.connections.sameWrittenForm,
						...next.connections.sameWrittenForm,
					],
					(value) => value.lemmaId,
				),
				continueCursor: next.connections.continueCursor,
				isDone: next.connections.isDone,
			},
		};
	}
	throw new Error("Route Note pages must describe the same target kind.");
}

function deduplicateBy<Value>(
	values: readonly Value[],
	key: (value: Value) => string,
): Value[] {
	const seen = new Set<string>();
	return values.filter((value) => {
		const identity = key(value);
		if (seen.has(identity)) return false;
		seen.add(identity);
		return true;
	});
}

function AttestationRouteNote({
	note,
}: {
	note: Extract<RouteNote, { routeKind: "Attestation" }>;
}) {
	return (
		<article
			className="flex flex-col gap-5"
			aria-label="Attestation Route Note"
		>
			<RouteSection title="Source">
				<RouteLink target={note.source.target}>
					<p className="text-base leading-relaxed">
						{note.source.sentenceSnippet}
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						Sentence {note.source.sentencePosition + 1}
					</p>
				</RouteLink>
			</RouteSection>
			<RouteSection title="Ordered members">
				<ol className="grid gap-2">
					{note.members.map((member) => (
						<li
							key={member.segmentIndex}
							className="flex items-center gap-2"
						>
							<span>{member.attested}</span>
							<Badge variant="outline">
								{member.orthography}
							</Badge>
						</li>
					))}
				</ol>
				<Badge variant="secondary">{note.realizationCoverage}</Badge>
			</RouteSection>
			<RouteSection title="Resolution route">
				<div className="grid gap-2 sm:grid-cols-2">
					<RouteLink target={note.surface.target}>
						Surface · {note.surface.normalizedSurface}
					</RouteLink>
					<RouteLink target={note.reading.target}>
						Unit Reading · {note.reading.emojiDescription}{" "}
						{note.reading.canonicalForm}
					</RouteLink>
				</div>
			</RouteSection>
		</article>
	);
}

function SurfaceRouteNote({
	note,
}: {
	note: Extract<RouteNote, { routeKind: "Surface" }>;
}) {
	return (
		<article
			className="flex flex-col gap-5"
			aria-label="Surface Route Note"
		>
			<div className="flex flex-wrap gap-2">
				<Badge variant="secondary">{note.language}</Badge>
				<Badge variant="outline">{note.spelling}</Badge>
				<Badge variant="outline">{note.surfaceKind}</Badge>
			</div>
			<FeatureList
				features={[
					...note.surfaceFeatures,
					...note.inflectionalFeatures,
				]}
			/>
			<RouteSection title="Lemma">
				<RouteLink target={note.lemma.target}>
					{note.lemma.canonicalForm} · {note.lemma.family} ·{" "}
					{note.lemma.kind}
				</RouteLink>
			</RouteSection>
			<RouteSection title="Source occurrences">
				<RouteGrid
					items={note.connections.occurrences.map((occurrence) => ({
						key: occurrence.attestationId,
						target: occurrence.target,
						label: occurrence.sentenceSnippet,
						detail: occurrence.members.join(" · "),
					}))}
					empty="No surviving occurrences."
				/>
			</RouteSection>
			<RouteSection title="Same written form">
				<RouteGrid
					items={note.connections.sameWrittenForm.map(
						surfaceRouteItem,
					)}
					empty="No distinct same-written-form Surfaces."
				/>
			</RouteSection>
		</article>
	);
}

function LemmaRouteNote({
	note,
}: {
	note: Extract<RouteNote, { routeKind: "Lemma" }>;
}) {
	return (
		<article className="flex flex-col gap-5" aria-label="Lemma Route Note">
			<div className="flex flex-wrap gap-2">
				<Badge variant="secondary">{note.language}</Badge>
				<Badge variant="outline">{note.family}</Badge>
				<Badge variant="outline">{note.lemmaKind}</Badge>
			</div>
			<FeatureList features={note.coreFeatures} />
			<RouteSection title="Known Surfaces">
				<RouteGrid
					items={note.connections.surfaces.map(surfaceRouteItem)}
					empty="No known Surfaces."
				/>
			</RouteSection>
			<RouteSection title="Unit Readings">
				<RouteGrid
					items={note.connections.readings.map((reading) => ({
						key: reading.readingId,
						target: reading.target,
						label: `${reading.emojiDescription} ${note.canonicalForm}`,
					}))}
					empty="No Unit Readings for this Lemma."
				/>
			</RouteSection>
			<RouteSection title="Same written form">
				<RouteGrid
					items={note.connections.sameWrittenForm.map((lemma) => ({
						key: lemma.lemmaId,
						target: lemma.target,
						label: lemma.canonicalForm,
						detail: `${lemma.family} · ${lemma.kind}`,
					}))}
					empty="No distinct same-form Lemmas."
				/>
			</RouteSection>
		</article>
	);
}

function RouteSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
			<h2 className="text-sm font-medium">{title}</h2>
			{children}
		</section>
	);
}

function RouteLink({
	target,
	children,
}: {
	target: Parameters<typeof hrefFor>[0];
	children: React.ReactNode;
}) {
	return (
		<Link
			to={hrefFor(target)}
			className="block rounded-lg border bg-background px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
		>
			{children}
		</Link>
	);
}

function RouteGrid({
	items,
	empty,
}: {
	items: readonly {
		key: string;
		target: Parameters<typeof hrefFor>[0];
		label: string;
		detail?: string;
	}[];
	empty: string;
}) {
	if (items.length === 0)
		return <p className="text-sm text-muted-foreground">{empty}</p>;
	return (
		<ul className="grid gap-2 sm:grid-cols-2">
			{items.map((item) => (
				<li key={item.key}>
					<RouteLink target={item.target}>
						<p className="font-medium">{item.label}</p>
						{item.detail ? (
							<p className="mt-1 text-xs text-muted-foreground">
								{item.detail}
							</p>
						) : null}
					</RouteLink>
				</li>
			))}
		</ul>
	);
}

function FeatureList({
	features,
}: {
	features: readonly { name: string; value: string }[];
}) {
	if (features.length === 0) return null;
	return (
		<div className="flex flex-wrap gap-2">
			{features.map((feature) => (
				<Badge key={feature.name} variant="outline">
					{feature.name}: {feature.value}
				</Badge>
			))}
		</div>
	);
}

function surfaceRouteItem(surface: {
	surfaceId: string;
	normalizedSurface: string;
	canonicalForm: string;
	family: string;
	kind: string;
	target: Parameters<typeof hrefFor>[0];
}) {
	return {
		key: surface.surfaceId,
		target: surface.target,
		label: surface.normalizedSurface,
		detail: `${surface.canonicalForm} · ${surface.family} · ${surface.kind}`,
	};
}

function routeNoteTitle(note: RouteNote): string {
	switch (note.routeKind) {
		case "Attestation":
			return note.members.map(({ attested }) => attested).join(" ");
		case "Surface":
			return note.normalizedSurface;
		case "Lemma":
			return note.canonicalForm;
	}
}

function RouteNoteSkeleton() {
	return (
		<main className="min-h-svh bg-background px-4 py-8 sm:px-6 sm:py-12">
			<div
				className="mx-auto flex w-full max-w-5xl flex-col gap-5"
				role="status"
			>
				<Skeleton className="h-8 w-56" />
				<Skeleton className="h-28 w-full" />
			</div>
		</main>
	);
}
