import { convexQuery } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { LockIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
	normalizeReadingDefinition,
	readingDefinitionChange,
} from "@/lib/reading-definition";
import { api } from "../../convex/_generated/api";

type ReadingSummary = FunctionReturnType<
	typeof api.presentation.readingHistoryForVisitor
>[number];

type ReadingNote = NonNullable<
	FunctionReturnType<typeof api.presentation.forReading>
>;

const DEFINITION_AUTOSAVE_DELAY_MS = 600;

export function ReadingGraph({ origin }: { origin: ReadingSummary }) {
	const noteQuery = useQuery({
		...convexQuery(api.presentation.forReading, {
			readingKey: origin.ownerKey,
		}),
		gcTime: 10_000,
	});

	if (noteQuery.isPending) return <ReadingNoteSkeleton />;
	if (!noteQuery.data) {
		return (
			<p className="text-sm text-destructive" role="alert">
				This Reading is no longer stored.
			</p>
		);
	}

	return <ReadingNoteView note={noteQuery.data} />;
}

export default ReadingGraph;

function ReadingNoteView({ note }: { note: ReadingNote }) {
	return (
		<article className="flex flex-col gap-5" aria-label="Reading note">
			<header className="flex flex-wrap items-center gap-2">
				<h2 className="text-xl font-semibold">
					{note.reading.emojiDescription} {note.reading.canonicalForm}
				</h2>
				<Badge variant="secondary">{note.lemma.language}</Badge>
				<Badge variant="outline">{note.lemma.family}</Badge>
				<Badge variant="outline">{note.lemma.kind}</Badge>
			</header>

			{note.lemma.coreFeatures.length > 0 ? (
				<div className="flex flex-wrap gap-2">
					{note.lemma.coreFeatures.map((feature) => (
						<Badge key={feature.name} variant="outline">
							{feature.name}: {feature.value}
						</Badge>
					))}
				</div>
			) : null}

			<DefinitionEditor
				readingKey={note.reading.ownerKey}
				storedDefinition={note.note.definition}
			/>

			<RelationList note={note} />
		</article>
	);
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
	const contributeKnowledgeAction = useAction(
		api.orchestration.contributeKnowledge,
	);
	const contribution = useMutation({ mutationFn: contributeKnowledgeAction });
	const { error, isError, isPending, mutateAsync, reset } = contribution;

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
				contributionKey: crypto.randomUUID(),
				ownerKind: "Reading",
				ownerKey: readingKey,
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

function RelationList({ note }: { note: ReadingNote }) {
	if (note.relations.length === 0 && note.pendingRelations.length === 0) {
		return null;
	}

	return (
		<ul className="flex flex-wrap gap-2" aria-label="Semantic relations">
			{note.relations.map((relation) => (
				<li key={`${relation.relation}:${relation.targetReadingKey}`}>
					<Badge variant="outline">
						{relation.relation}: {relation.targetEmojiDescription}{" "}
						{relation.targetCanonicalForm}
					</Badge>
				</li>
			))}
			{note.pendingRelations.map((relation) => (
				<li
					key={`${relation.relation}:${relation.targetCanonicalForm}:${relation.targetFamily}:${relation.targetKind}`}
				>
					<Badge
						variant="outline"
						className="opacity-50"
						aria-label={`${relation.relation} relation to unresolved Reading ${relation.targetCanonicalForm}`}
					>
						<LockIcon data-icon="inline-start" aria-hidden="true" />
						{relation.relation}: {relation.targetCanonicalForm}
					</Badge>
				</li>
			))}
		</ul>
	);
}

function ReadingNoteSkeleton() {
	return (
		<div
			className="flex flex-col gap-3"
			role="status"
			aria-label="Loading Reading note"
		>
			<Skeleton className="h-7 w-48" />
			<Skeleton className="h-20 w-full" />
		</div>
	);
}

function mutationMessage(error: unknown): string {
	return error instanceof Error ? error.message : "Knowledge update failed.";
}
