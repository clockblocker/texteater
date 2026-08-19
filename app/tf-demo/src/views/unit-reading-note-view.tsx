import { convexQuery } from "@convex-dev/react-query";
import {
	useQuery,
	useMutation as useReactQueryMutation,
} from "@tanstack/react-query";
import { useAction, useConvex } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { LibraryIcon, LoaderCircleIcon, LockIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { DataControls } from "@/components/data-controls";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import { hrefFor, type UnitReadingNoteTarget } from "@/lib/navigation";
import {
	normalizeReadingDefinition,
	readingDefinitionChange,
} from "@/lib/reading-definition";
import { NotFoundView } from "@/views/not-found-view";
import { api } from "../../convex/_generated/api";
import {
	KnowledgeActivity,
	KnowledgeActivityPresentation,
} from "./unit-reading-knowledge-activity";
import {
	KnowledgeSettingsChecklist,
	KnowledgeSettingsPanel,
	withKnowledgeSetting,
} from "./unit-reading-knowledge-settings";

export {
	KnowledgeActivityPresentation,
	KnowledgeSettingsChecklist,
	withKnowledgeSetting,
};

export type UnitReadingNote = Extract<
	NonNullable<FunctionReturnType<typeof api.presentation.getNote>>,
	{ kind: "UnitReadingNote" }
>;

const DEFINITION_AUTOSAVE_DELAY_MS = 600;

export function UnitReadingNoteView({
	target,
}: {
	target: UnitReadingNoteTarget;
}) {
	const visitorId = useAnonymousVisitorId();
	const noteQuery = useQuery({
		...convexQuery(api.presentation.getNote, { target, visitorId }),
		gcTime: 10_000,
	});

	if (noteQuery.isPending) return <ReadingNoteSkeleton />;
	if (noteQuery.data?.kind !== "UnitReadingNote") {
		return (
			<NotFoundView
				title="Reading note not found"
				description="This Unit Reading Note does not exist, was removed, or its Reading is not a supported Unit family."
			/>
		);
	}

	return (
		<ReadingNote
			key={noteQuery.data.target.readingId}
			note={noteQuery.data}
			visitorId={visitorId}
		/>
	);
}

export function ReadingNote({
	note,
	visitorId,
}: {
	note: UnitReadingNote;
	visitorId: string;
}) {
	return (
		<main className="min-h-svh bg-background px-4 py-8 sm:px-6 sm:py-12">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
				<header className="flex flex-wrap items-start justify-between gap-4">
					<div className="flex flex-col gap-3">
						<p className="text-sm font-medium text-muted-foreground">
							Unit Reading Note
						</p>
						<div className="flex flex-wrap items-center gap-2">
							<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
								{note.reading.emojiDescription}{" "}
								{note.reading.canonicalForm}
							</h1>
							{note.note.transcription ? (
								<span className="text-lg text-muted-foreground">
									/{note.note.transcription}/
								</span>
							) : null}
							<Badge variant="secondary">
								{note.lemma.language}
							</Badge>
							<Badge variant="outline">{note.lemma.family}</Badge>
							<Badge variant="outline">{note.lemma.kind}</Badge>
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

				<KnowledgeActivity note={note} visitorId={visitorId} />
				<KnowledgeSettingsPanel
					visitorId={visitorId}
					initialSettings={note.settings}
				/>

				<article
					className="flex flex-col gap-5"
					aria-label="Reading note"
				>
					{note.lemma.coreFeatures.length > 0 ? (
						<div className="flex flex-wrap gap-2">
							{note.lemma.coreFeatures.map((feature) => (
								<Badge key={feature.name} variant="outline">
									{feature.name}: {feature.value}
								</Badge>
							))}
						</div>
					) : null}

					{note.settings.definition ? (
						<DefinitionEditor
							readingKey={note.reading.ownerKey}
							storedDefinition={note.note.definition}
						/>
					) : null}

					<KnowledgeBuckets
						title="Translations"
						buckets={note.note.translations}
					/>
					<RelationList note={note} />
					<StructuralReferenceList note={note} />
					<SourceContextList note={note} visitorId={visitorId} />
				</article>

				<DataControls />
			</div>
		</main>
	);
}

function SourceContextList({
	note,
	visitorId,
}: {
	note: UnitReadingNote;
	visitorId: string;
}) {
	const convex = useConvex();
	const [additionalContexts, setAdditionalContexts] = useState<
		UnitReadingNote["sourceContexts"]["page"]
	>([]);
	const [cursor, setCursor] = useState(note.sourceContexts.continueCursor);
	const [isDone, setIsDone] = useState(note.sourceContexts.isDone);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const contexts = deduplicateSourceContexts([
		...note.sourceContexts.page,
		...additionalContexts,
	]);

	async function loadMore() {
		if (isDone || isLoading) return;
		setIsLoading(true);
		setError(null);
		try {
			const nextNote = await convex.query(api.presentation.getNote, {
				target: note.target,
				visitorId,
				contextCursor: cursor,
			});
			if (nextNote?.kind !== "UnitReadingNote") {
				setIsDone(true);
				return;
			}
			setAdditionalContexts((current) =>
				deduplicateSourceContexts([
					...current,
					...nextNote.sourceContexts.page,
				]),
			);
			setCursor(nextNote.sourceContexts.continueCursor);
			setIsDone(nextNote.sourceContexts.isDone);
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "Source Contexts could not be loaded.",
			);
		} finally {
			setIsLoading(false);
		}
	}

	if (contexts.length === 0) return null;
	return (
		<section
			className="flex flex-col gap-3"
			aria-labelledby="source-contexts"
		>
			<h2 id="source-contexts" className="text-sm font-medium">
				Source Contexts
			</h2>
			<ul className="grid gap-2">
				{contexts.map((context) => (
					<li key={context.attestationId}>
						<Link
							to={hrefFor(context.target)}
							className="block rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
						>
							<p className="text-sm leading-relaxed">
								{context.sentenceSnippet}
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								Sentence {context.sentencePosition + 1} ·{" "}
								{context.memberSegmentIndices.length}{" "}
								{context.memberSegmentIndices.length === 1
									? "member"
									: "members"}
							</p>
						</Link>
					</li>
				))}
			</ul>
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
					{isLoading ? "Loading…" : "Load more contexts"}
				</button>
			) : null}
			{error ? (
				<p className="text-sm text-destructive" role="alert">
					{error}
				</p>
			) : null}
		</section>
	);
}

export function deduplicateSourceContexts<
	Context extends { readonly attestationId: string },
>(contexts: readonly Context[]): Context[] {
	const seen = new Set<string>();
	return contexts.filter(({ attestationId }) => {
		if (seen.has(attestationId)) return false;
		seen.add(attestationId);
		return true;
	});
}

function DefinitionEditor({
	readingKey,
	storedDefinition,
}: {
	readingKey: string;
	storedDefinition: string | null;
}) {
	const [definition, setDefinition] = useState(storedDefinition ?? "");
	const savedDefinitionRef = useRef(
		normalizeReadingDefinition(storedDefinition),
	);
	const failedDefinitionRef = useRef<string | null>(null);
	const applyKnowledgeChangeAction = useAction(
		api.orchestration.applyReadingKnowledgeChange,
	);
	const changeMutation = useReactQueryMutation({
		mutationFn: applyKnowledgeChangeAction,
	});
	const { error, isError, isPending, mutateAsync, reset } = changeMutation;

	useEffect(() => {
		const previousSavedDefinition = savedDefinitionRef.current;
		const nextSavedDefinition =
			normalizeReadingDefinition(storedDefinition);
		setDefinition((currentDefinition) =>
			normalizeReadingDefinition(currentDefinition) ===
			previousSavedDefinition
				? (storedDefinition ?? "")
				: currentDefinition,
		);
		savedDefinitionRef.current = nextSavedDefinition;
		failedDefinitionRef.current = null;
	}, [storedDefinition]);

	useEffect(() => {
		const normalized = normalizeReadingDefinition(definition);
		if (
			normalized === savedDefinitionRef.current ||
			normalized === failedDefinitionRef.current ||
			isPending
		) {
			return;
		}

		const timeout = window.setTimeout(() => {
			const change = readingDefinitionChange(
				savedDefinitionRef.current,
				normalized,
			);
			if (!change) return;
			void mutateAsync({
				knowledgeChangeKey: crypto.randomUUID(),
				ownerReadingKey: readingKey,
				change,
			})
				.then(() => {
					savedDefinitionRef.current = normalized;
					failedDefinitionRef.current = null;
				})
				.catch(() => {
					failedDefinitionRef.current = normalized;
				});
		}, DEFINITION_AUTOSAVE_DELAY_MS);

		return () => window.clearTimeout(timeout);
	}, [definition, isPending, mutateAsync, readingKey]);

	return (
		<Field>
			<FieldLabel className="sr-only" htmlFor="reading-definition">
				Reading definition
			</FieldLabel>
			<Textarea
				id="reading-definition"
				value={definition}
				aria-busy={isPending}
				placeholder="A short learner-facing definition"
				onChange={(event) => {
					failedDefinitionRef.current = null;
					if (isError) reset();
					setDefinition(event.target.value);
				}}
			/>
			<p className="sr-only" aria-live="polite">
				{isPending ? "Saving definition" : ""}
			</p>
			{error ? (
				<p className="text-sm text-destructive" role="alert">
					{mutationMessage(error)}
				</p>
			) : null}
		</Field>
	);
}

function KnowledgeBuckets({
	title,
	buckets,
}: {
	title: string;
	buckets: UnitReadingNote["note"]["translations"];
}) {
	if (buckets.length === 0) return null;
	return (
		<section className="flex flex-col gap-2">
			<h2 className="text-sm font-medium">{title}</h2>
			<div className="flex flex-wrap gap-2">
				{buckets.flatMap((bucket) =>
					bucket.values.map((value) => (
						<Badge
							key={`${bucket.language}:${value}`}
							variant="secondary"
						>
							{bucket.language}: {value}
						</Badge>
					)),
				)}
			</div>
		</section>
	);
}

function RelationList({ note }: { note: UnitReadingNote }) {
	if (note.relations.length === 0 && note.pendingRelations.length === 0) {
		return null;
	}

	return (
		<ul className="flex flex-wrap gap-2" aria-label="Semantic relations">
			{note.relations.map((relation) => (
				<li key={`${relation.relation}:${relation.target.id}`}>
					<Link
						to={hrefFor(relation.target)}
						className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
					>
						<Badge variant="outline">
							{relation.relation}: {relation.targetCanonicalForm}
						</Badge>
					</Link>
				</li>
			))}
			{note.pendingRelations.map((relation) => (
				<li key={relation.locatorKey}>
					<Link
						to={hrefFor(relation.target)}
						className="inline-flex rounded-md opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
					>
						<Badge
							variant="outline"
							aria-label={`${relation.relation} relation to unresolved Reading ${relation.targetCanonicalForm}`}
						>
							<LockIcon
								data-icon="inline-start"
								aria-hidden="true"
							/>
							{relation.relation}: {relation.targetCanonicalForm}
						</Badge>
					</Link>
				</li>
			))}
		</ul>
	);
}

function StructuralReferenceList({ note }: { note: UnitReadingNote }) {
	if (note.structuralReferences.length === 0) return null;
	return (
		<section className="flex flex-col gap-2" aria-labelledby="structures">
			<h2 id="structures" className="text-sm font-medium">
				Structure
			</h2>
			<ul className="flex flex-wrap gap-2">
				{note.structuralReferences.map((reference) => (
					<li key={`${reference.aspect}:${reference.path}`}>
						<Link
							to={hrefFor(reference.target)}
							className="inline-flex rounded-md opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
						>
							<Badge variant="outline">
								<LockIcon
									data-icon="inline-start"
									aria-hidden="true"
								/>
								{reference.descriptor.canonicalForm} ·{" "}
								{reference.path}
							</Badge>
						</Link>
					</li>
				))}
			</ul>
		</section>
	);
}

function ReadingNoteSkeleton() {
	return (
		<main className="min-h-svh bg-background px-4 py-8 sm:px-6 sm:py-12">
			<div
				className="mx-auto flex w-full max-w-5xl flex-col gap-3"
				role="status"
				aria-label="Loading Reading note"
			>
				<Skeleton className="h-7 w-48" />
				<Skeleton className="h-20 w-full" />
			</div>
		</main>
	);
}

function mutationMessage(error: unknown): string {
	return error instanceof Error ? error.message : "Knowledge update failed.";
}
