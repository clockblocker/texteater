import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useAction, useConvex } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { LibraryIcon, LoaderCircleIcon, LockIcon } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { hrefFor, type ShadowNoteTarget } from "@/lib/navigation";
import { NotFoundView } from "@/views/not-found-view";
import { api } from "../../convex/_generated/api";

export type ShadowNote = Extract<
	NonNullable<FunctionReturnType<typeof api.presentation.getNote>>,
	{ kind: "ShadowNote" }
>;
type ShadowCleanupResult = FunctionReturnType<
	typeof api.orchestration.cleanupPendingRelation
>;

export function isCurrentShadowAction(
	attempt: number,
	currentEpoch: number,
): boolean {
	return attempt === currentEpoch;
}

export function shadowCleanupFeedback(result: ShadowCleanupResult): {
	actionError: string | null;
	outcome: string | null;
} {
	if (result.status === "applied") {
		return { actionError: null, outcome: result.message };
	}
	return {
		actionError:
			result.status === "conflict"
				? `${result.message} The Shadow Note was refreshed.`
				: result.message,
		outcome: null,
	};
}

export type ShadowControlState = {
	targetShadowId: string;
	actionError: string | null;
	outcome: string | null;
};

export type ShadowControlEvent =
	| { type: "begin" }
	| { type: "settled"; result: ShadowCleanupResult }
	| { type: "failed"; message: string }
	| { type: "targetChanged"; targetShadowId: string }
	| { type: "refreshed"; targetShadowId: string };

export function reduceShadowControls(
	state: ShadowControlState,
	event: ShadowControlEvent,
): ShadowControlState {
	if (event.type === "targetChanged") {
		return event.targetShadowId === state.targetShadowId
			? state
			: {
					targetShadowId: event.targetShadowId,
					actionError: null,
					outcome: null,
				};
	}
	if (event.type === "refreshed") return state;
	if (event.type === "begin") {
		return { ...state, actionError: null, outcome: null };
	}
	if (event.type === "failed") {
		return { ...state, actionError: event.message, outcome: null };
	}
	return { ...state, ...shadowCleanupFeedback(event.result) };
}

export function ShadowNoteView({ target }: { target: ShadowNoteTarget }) {
	const noteQuery = useQuery({
		...convexQuery(api.presentation.getNote, { target }),
		gcTime: 10_000,
	});
	if (noteQuery.isPending) return <ShadowNoteSkeleton />;
	if (noteQuery.data?.kind !== "ShadowNote") {
		return (
			<NotFoundView
				title="Shadow note not found"
				description="This Shadow Note is missing, malformed, or no longer has an active reference."
			/>
		);
	}
	return (
		<ShadowNoteContent
			note={noteQuery.data}
			onRefresh={() => noteQuery.refetch().then(() => undefined)}
		/>
	);
}

export function ShadowNoteContent({
	note,
	onRefresh,
}: {
	note: ShadowNote;
	onRefresh: () => Promise<void>;
}) {
	const convex = useConvex();
	const cleanupPendingRelation = useAction(
		api.orchestration.cleanupPendingRelation,
	);
	const [additionalReferrers, setAdditionalReferrers] = useState<
		ShadowNote["references"]["page"]
	>([]);
	const [cursor, setCursor] = useState(note.references.continueCursor);
	const [isDone, setIsDone] = useState(note.references.isDone);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [activeLocator, setActiveLocator] = useState<string | null>(null);
	const [controls, dispatchControls] = useReducer(reduceShadowControls, {
		targetShadowId: note.target.shadowId,
		actionError: null,
		outcome: null,
	});
	const revision = useRef(0);
	const actionEpoch = useRef(0);
	const referrers = mergeReferrers([
		...note.references.page,
		...additionalReferrers,
	]);

	useEffect(() => {
		revision.current += 1;
		setAdditionalReferrers([]);
		setCursor(note.references.continueCursor);
		setIsDone(note.references.isDone);
		setIsLoading(false);
		setError(null);
		setActiveLocator(null);
		dispatchControls({
			type: "refreshed",
			targetShadowId: note.target.shadowId,
		});
	}, [note]);
	useEffect(() => {
		actionEpoch.current += 1;
		dispatchControls({
			type: "targetChanged",
			targetShadowId: note.target.shadowId,
		});
	}, [note.target.shadowId]);

	async function loadMore() {
		if (isDone || isLoading) return;
		const requestedRevision = revision.current;
		setIsLoading(true);
		setError(null);
		try {
			const nextNote = await convex.query(api.presentation.getNote, {
				target: note.target,
				contextCursor: cursor,
			});
			if (nextNote?.kind !== "ShadowNote") {
				if (requestedRevision === revision.current) setIsDone(true);
				return;
			}
			if (requestedRevision !== revision.current) return;
			setAdditionalReferrers((current) => [
				...current,
				...nextNote.references.page,
			]);
			setCursor(nextNote.references.continueCursor);
			setIsDone(nextNote.references.isDone);
		} catch (cause) {
			if (requestedRevision !== revision.current) return;
			setError(
				cause instanceof Error
					? cause.message
					: "Shadow references could not be loaded.",
			);
		} finally {
			if (requestedRevision === revision.current) setIsLoading(false);
		}
	}

	async function cleanUp(locatorKey: string) {
		if (activeLocator) return;
		const attempt = ++actionEpoch.current;
		setActiveLocator(locatorKey);
		setError(null);
		dispatchControls({ type: "begin" });
		try {
			const result = await cleanupPendingRelation({
				shadowId: note.target.shadowId,
				locatorKey,
				baseRevision: note.inspection.revision,
			});
			if (!isCurrentShadowAction(attempt, actionEpoch.current)) return;
			await onRefresh();
			if (!isCurrentShadowAction(attempt, actionEpoch.current)) return;
			dispatchControls({ type: "settled", result });
		} catch (cause) {
			if (!isCurrentShadowAction(attempt, actionEpoch.current)) return;
			dispatchControls({
				type: "failed",
				message:
					cause instanceof Error
						? cause.message
						: "The Shadow reference could not be changed.",
			});
		} finally {
			if (isCurrentShadowAction(attempt, actionEpoch.current)) {
				setActiveLocator(null);
			}
		}
	}

	return (
		<main className="min-h-svh bg-background px-4 py-8 sm:px-6 sm:py-12">
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
				<header className="flex flex-wrap items-start justify-between gap-4">
					<div className="flex flex-col gap-3">
						<p className="text-sm font-medium text-muted-foreground">
							Shadow Note
						</p>
						<h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
							<LockIcon className="size-5" aria-hidden="true" />
							{note.descriptor.canonicalForm}
						</h1>
						<div className="flex flex-wrap gap-2">
							<Badge variant="secondary">
								{note.descriptor.language}
							</Badge>
							<Badge variant="outline">
								{note.descriptor.family}
							</Badge>
							<Badge variant="outline">
								{note.descriptor.kind}
							</Badge>
						</div>
					</div>
					<Link
						to={hrefFor({ kind: "Library" })}
						className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
					>
						<LibraryIcon className="size-4" />
						Library
					</Link>
				</header>

				<section
					className="flex flex-col gap-3"
					aria-labelledby="referrers"
				>
					<h2 id="referrers" className="text-sm font-medium">
						Referring Unit Reading Notes
					</h2>
					<ShadowReferenceList
						note={note}
						referrers={referrers}
						activeLocator={activeLocator}
						onResolve={(locatorKey) => void cleanUp(locatorKey)}
					/>
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
							{isLoading ? "Loading…" : "Load more references"}
						</button>
					) : null}
					{error || controls.actionError ? (
						<p className="text-sm text-destructive" role="alert">
							{error ?? controls.actionError}
						</p>
					) : null}
					{controls.outcome ? (
						<p
							className="text-sm text-muted-foreground"
							role="status"
						>
							{controls.outcome}
						</p>
					) : null}
				</section>
			</div>
		</main>
	);
}

export function ShadowReferenceList({
	note,
	referrers,
	activeLocator,
	onResolve,
}: {
	note: ShadowNote;
	referrers: ShadowNote["references"]["page"];
	activeLocator: string | null;
	onResolve: (locatorKey: string) => void;
}) {
	return (
		<ul className="grid gap-3">
			{referrers.map((referrer) => {
				const candidates = note.inspection.candidates;
				return (
					<li
						key={referrer.reading.readingId}
						className="rounded-lg border bg-card p-4"
					>
						<Link
							to={hrefFor(referrer.reading.target)}
							className="font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
						>
							{referrer.reading.emojiDescription}{" "}
							{referrer.reading.canonicalForm}
						</Link>
						{referrer.pendingRelations.map((reference) => (
							<section
								key={reference.locatorKey}
								className="mt-3 rounded-md border p-3"
								aria-label={`Pending ${reference.relation} reference`}
							>
								<div className="flex flex-wrap items-center justify-between gap-2">
									<Badge variant="outline">
										{reference.relation}
									</Badge>
								</div>
								<p className="mt-2 break-all font-mono text-[10px] text-muted-foreground">
									{reference.locatorKey}
								</p>
								{candidates.length === 0 ? (
									<p className="mt-3 text-xs text-muted-foreground">
										No exact Lemma candidate is available.
									</p>
								) : (
									<div className="mt-3 flex flex-wrap gap-2">
										<button
											type="button"
											className="rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
											disabled={activeLocator !== null}
											onClick={() =>
												onResolve(reference.locatorKey)
											}
										>
											{activeLocator ===
											reference.locatorKey ? (
												<LoaderCircleIcon className="mr-1 inline size-3 animate-spin" />
											) : null}
											Resolve exact Lemma match
										</button>
									</div>
								)}
								{candidates.map((candidate) => (
									<div
										key={`details:${candidate.lemmaId}`}
										className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
									>
										<Link
											to={hrefFor(candidate.target)}
											className="font-medium hover:text-foreground hover:underline"
										>
											Inspect {candidate.canonicalForm} ·{" "}
											{candidate.family}/{candidate.kind}
										</Link>
										{candidate.coreFeatures.map(
											(feature) => (
												<Badge
													key={`${feature.name}:${feature.value}`}
													variant="secondary"
												>
													{feature.name}:{" "}
													{feature.value}
												</Badge>
											),
										)}
									</div>
								))}
							</section>
						))}
						{referrer.structuralReferences.map((reference) => (
							<section
								key={`${reference.aspect}:${reference.path}`}
								className="mt-3 rounded-md border border-dashed p-3"
							>
								<Badge variant="outline">
									{reference.aspect} · {reference.path}
								</Badge>
								<p className="mt-2 text-xs text-muted-foreground">
									Structural Shadow resolution is unavailable
									until Dumrel defines the resolved lexical
									replacement DTO.
								</p>
							</section>
						))}
					</li>
				);
			})}
		</ul>
	);
}

function mergeReferrers(
	referrers: readonly ShadowNote["references"]["page"][number][],
): ShadowNote["references"]["page"] {
	const merged = new Map<string, ShadowNote["references"]["page"][number]>();
	for (const referrer of referrers) {
		const current = merged.get(referrer.reading.readingId);
		if (!current) {
			merged.set(referrer.reading.readingId, referrer);
			continue;
		}
		merged.set(referrer.reading.readingId, {
			reading: current.reading,
			pendingRelations: [
				...current.pendingRelations,
				...referrer.pendingRelations,
			],
			structuralReferences: [
				...current.structuralReferences,
				...referrer.structuralReferences,
			],
		});
	}
	return [...merged.values()];
}

function ShadowNoteSkeleton() {
	return (
		<main className="min-h-svh bg-background px-4 py-8 sm:px-6 sm:py-12">
			<div
				className="mx-auto flex w-full max-w-4xl flex-col gap-3"
				role="status"
			>
				<Skeleton className="h-7 w-48" />
				<Skeleton className="h-20 w-full" />
			</div>
		</main>
	);
}
