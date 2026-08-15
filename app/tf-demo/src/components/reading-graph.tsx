import { convexQuery } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ChevronRightIcon, LinkIcon, SaveIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import { FeatureBadges } from "@/components/resolution-pipeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../convex/_generated/api";

type ReadingSummary = FunctionReturnType<
	typeof api.presentation.readingHistoryForVisitor
>[number];

type ReadingNote = NonNullable<
	FunctionReturnType<typeof api.presentation.forReading>
>;

type TrailItem = {
	readonly ownerKey: string;
	readonly canonicalForm: string;
	readonly emojiDescription: string;
};

const semanticRelations = [
	"synonym",
	"nearSynonym",
	"antonym",
	"hypernym",
	"hyponym",
	"meronym",
	"holonym",
] as const;

type SemanticRelation = (typeof semanticRelations)[number];

export function ReadingGraph({
	visitorId,
	origin,
}: {
	visitorId: string;
	origin: ReadingSummary;
}) {
	const [trail, setTrail] = useState<readonly TrailItem[]>(() => [origin]);
	const selected = trail.at(-1) ?? origin;
	const noteQuery = useQuery({
		...convexQuery(api.presentation.forReading, {
			readingKey: selected.ownerKey,
		}),
		gcTime: 10_000,
	});
	const historyQuery = useQuery({
		...convexQuery(api.presentation.readingHistoryForVisitor, {
			visitorId,
		}),
		gcTime: 10_000,
	});
	const note = noteQuery.data ?? null;
	const history = historyQuery.data ?? [];

	function openReading(target: TrailItem) {
		setTrail((current) => {
			const existingIndex = current.findIndex(
				({ ownerKey }) => ownerKey === target.ownerKey,
			);
			return existingIndex >= 0
				? current.slice(0, existingIndex + 1)
				: [...current, target];
		});
	}

	return (
		<Card size="sm" aria-labelledby="reading-graph-title">
			<CardHeader>
				<CardTitle id="reading-graph-title">Reading notes</CardTitle>
				<CardDescription>
					Follow resolved semantic relations from one stored Dumdict
					Reading to another.
				</CardDescription>
				<CardAction>
					<Badge variant="secondary">{history.length} visited</Badge>
				</CardAction>
			</CardHeader>
			<CardContent className="flex flex-col gap-5">
				<nav aria-label="Reading note trail">
					<ol className="flex flex-wrap items-center gap-2">
						{trail.map((item, index) => (
							<li key={item.ownerKey}>
								<Button
									type="button"
									size="sm"
									variant={
										item.ownerKey === selected.ownerKey
											? "default"
											: "outline"
									}
									onClick={() =>
										setTrail((current) =>
											current.slice(0, index + 1),
										)
									}
								>
									{index > 0 ? (
										<ChevronRightIcon data-icon="inline-start" />
									) : null}
									{item.emojiDescription} {item.canonicalForm}
								</Button>
							</li>
						))}
					</ol>
				</nav>

				{noteQuery.isPending ? <ReadingNoteSkeleton /> : null}
				{!noteQuery.isPending && note ? (
					<ReadingNoteView
						key={note.reading.ownerKey}
						note={note}
						history={history}
						onOpenReading={openReading}
					/>
				) : null}
				{!noteQuery.isPending && !note ? (
					<p className="text-sm text-destructive" role="alert">
						This relation target is not stored as a Dumdict Reading
						yet.
					</p>
				) : null}

				{history.length > 1 ? (
					<section className="flex flex-col gap-2">
						<h3 className="text-sm font-medium">
							Previously resolved
						</h3>
						<div className="flex flex-wrap gap-2">
							{history.map((reading) => (
								<Button
									type="button"
									size="sm"
									variant="outline"
									key={reading.ownerKey}
									onClick={() => openReading(reading)}
								>
									{reading.emojiDescription}{" "}
									{reading.canonicalForm}
								</Button>
							))}
						</div>
					</section>
				) : null}
			</CardContent>
		</Card>
	);
}

export default ReadingGraph;

function ReadingNoteView({
	note,
	history,
	onOpenReading,
}: {
	note: ReadingNote;
	history: readonly ReadingSummary[];
	onOpenReading: (target: TrailItem) => void;
}) {
	return (
		<article className="flex flex-col gap-5">
			<header className="flex flex-col gap-2">
				<div className="flex flex-wrap items-center gap-2">
					<h2 className="text-xl font-semibold">
						{note.reading.emojiDescription}{" "}
						{note.reading.canonicalForm}
					</h2>
					<Badge variant="secondary">{note.lemma.language}</Badge>
					<Badge variant="outline">{note.lemma.family}</Badge>
					<Badge variant="outline">{note.lemma.kind}</Badge>
				</div>
				<p className="text-sm text-muted-foreground">
					Reading Knowledge and Lemma Knowledge are projected
					separately and combined in this shared demo note.
				</p>
			</header>

			<FeatureBadges
				label="Lemma core features"
				features={note.lemma.coreFeatures}
			/>

			{note.note.definition ? (
				<section className="flex flex-col gap-2">
					<h3 className="text-xs font-medium text-muted-foreground">
						Definition
					</h3>
					<p className="text-sm leading-relaxed">
						{note.note.definition}
					</p>
				</section>
			) : (
				<DefinitionComposer readingKey={note.reading.ownerKey} />
			)}

			<KnowledgeBuckets
				label="Reading translations"
				buckets={note.note.translations}
			/>
			<KnowledgeBuckets
				label="Lemma transcriptions"
				buckets={note.note.transcriptions}
			/>

			{note.note.lexicalBreakdown.length > 0 ? (
				<section className="flex flex-col gap-2">
					<h3 className="text-xs font-medium text-muted-foreground">
						Lexical breakdown
					</h3>
					<div className="flex flex-wrap gap-2">
						{note.note.lexicalBreakdown.map((unit, index) => (
							<Badge
								key={`${unit.language}:${unit.canonicalForm}:${index}`}
								variant="outline"
							>
								{unit.canonicalForm} · {unit.family}/{unit.kind}
							</Badge>
						))}
					</div>
				</section>
			) : null}

			{note.note.morphologicalTree ? (
				<section className="flex flex-col gap-2">
					<h3 className="text-xs font-medium text-muted-foreground">
						Morphological tree
					</h3>
					<pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
						{JSON.stringify(note.note.morphologicalTree, null, 2)}
					</pre>
				</section>
			) : null}

			<section className="flex flex-col gap-3">
				<div className="flex flex-col gap-1">
					<h3 className="text-sm font-medium">
						Relations to other notes
					</h3>
					<p className="text-sm text-muted-foreground">
						Resolved relations open the target Reading. Pending
						Dumdict relations stay visible but are not clickable
						yet.
					</p>
				</div>
				{note.relations.length > 0 ? (
					<div className="flex flex-wrap gap-2">
						{note.relations.map((relation) => (
							<Button
								type="button"
								size="sm"
								variant="outline"
								key={`${relation.relation}:${relation.targetReadingKey}`}
								onClick={() =>
									onOpenReading({
										ownerKey: relation.targetReadingKey,
										canonicalForm:
											relation.targetCanonicalForm,
										emojiDescription:
											relation.targetEmojiDescription,
									})
								}
							>
								<LinkIcon data-icon="inline-start" />
								{relation.relation}:{" "}
								{relation.targetEmojiDescription}{" "}
								{relation.targetCanonicalForm}
							</Button>
						))}
					</div>
				) : (
					<p className="text-sm text-muted-foreground">
						No resolved relations yet.
					</p>
				)}
				{note.pendingRelations.length > 0 ? (
					<div className="flex flex-wrap gap-2">
						{note.pendingRelations.map((relation) => (
							<Badge
								key={`${relation.relation}:${relation.targetCanonicalForm}`}
								variant="secondary"
							>
								pending {relation.relation}:{" "}
								{relation.targetCanonicalForm} ·{" "}
								{relation.targetFamily}/{relation.targetKind}
							</Badge>
						))}
					</div>
				) : null}
			</section>

			<RelationComposer source={note.reading} history={history} />
		</article>
	);
}

function DefinitionComposer({ readingKey }: { readingKey: string }) {
	const [definition, setDefinition] = useState("");
	const contributeKnowledgeAction = useAction(
		api.orchestration.contributeKnowledge,
	);
	const contribution = useMutation({ mutationFn: contributeKnowledgeAction });

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const normalized = definition.trim().normalize("NFC");
		if (!normalized) return;
		try {
			await contribution.mutateAsync({
				contributionKey: crypto.randomUUID(),
				ownerKind: "Reading",
				ownerKey: readingKey,
				change: {
					kind: "Contribute",
					aspect: "definition",
					value: normalized,
				},
			});
			setDefinition("");
		} catch {
			// React Query exposes the error below while preserving the draft.
		}
	}

	return (
		<form onSubmit={(event) => void handleSubmit(event)}>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="reading-definition">
						Add a Reading definition
					</FieldLabel>
					<Textarea
						id="reading-definition"
						value={definition}
						onChange={(event) => setDefinition(event.target.value)}
						disabled={contribution.isPending}
						placeholder="A short learner-facing definition"
					/>
					<FieldDescription>
						Stored as validated Reading Knowledge through Dumrel.
					</FieldDescription>
				</Field>
				<Button
					type="submit"
					className="justify-self-end"
					disabled={
						contribution.isPending || definition.trim().length === 0
					}
				>
					<SaveIcon data-icon="inline-start" />
					{contribution.isPending ? "Saving…" : "Save definition"}
				</Button>
				{contribution.error ? (
					<p className="text-sm text-destructive" role="alert">
						{mutationMessage(contribution.error)}
					</p>
				) : null}
			</FieldGroup>
		</form>
	);
}

function RelationComposer({
	source,
	history,
}: {
	source: ReadingSummary;
	history: readonly ReadingSummary[];
}) {
	const targets = history.filter(
		({ ownerKey }) => ownerKey !== source.ownerKey,
	);
	const [relation, setRelation] = useState<SemanticRelation>("hypernym");
	const [requestedTargetKey, setRequestedTargetKey] = useState("");
	const selectedTargetKey = targets.some(
		({ ownerKey }) => ownerKey === requestedTargetKey,
	)
		? requestedTargetKey
		: (targets[0]?.ownerKey ?? "");
	const contributeRelationAction = useAction(
		api.orchestration.contributeRelation,
	);
	const contribution = useMutation({ mutationFn: contributeRelationAction });

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!selectedTargetKey) return;
		try {
			await contribution.mutateAsync({
				contributionKey: crypto.randomUUID(),
				sourceReadingKey: source.ownerKey,
				relation,
				targetReadingKey: selectedTargetKey,
			});
		} catch {
			// React Query exposes the error below without losing the selection.
		}
	}

	return (
		<form onSubmit={(event) => void handleSubmit(event)}>
			<FieldGroup>
				<Field>
					<FieldLabel>Connect this Reading</FieldLabel>
					<FieldDescription>
						Targets are real Dumdict Readings resolved by this
						Visitor and shared by the demo dictionary.
					</FieldDescription>
					{targets.length > 0 ? (
						<div className="flex flex-wrap items-end gap-3">
							<Select
								value={relation}
								onValueChange={(value) => {
									if (isSemanticRelation(value))
										setRelation(value);
								}}
							>
								<SelectTrigger aria-label="Relation type">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectLabel>Relation</SelectLabel>
										{semanticRelations.map((value) => (
											<SelectItem
												key={value}
												value={value}
											>
												{value}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>

							<Select
								value={selectedTargetKey}
								onValueChange={(value) =>
									setRequestedTargetKey(value ?? "")
								}
							>
								<SelectTrigger aria-label="Target Reading">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectLabel>
											Resolved Reading
										</SelectLabel>
										{targets.map((target) => (
											<SelectItem
												key={target.ownerKey}
												value={target.ownerKey}
											>
												{target.emojiDescription}{" "}
												{target.canonicalForm}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>

							<Button
								type="submit"
								disabled={
									contribution.isPending || !selectedTargetKey
								}
							>
								<LinkIcon data-icon="inline-start" />
								{contribution.isPending
									? "Connecting…"
									: "Add relation"}
							</Button>
						</div>
					) : (
						<p className="text-sm text-muted-foreground">
							Resolve another segment first to create a relation
							between stored Readings.
						</p>
					)}
				</Field>
				{contribution.error ? (
					<p className="text-sm text-destructive" role="alert">
						{mutationMessage(contribution.error)}
					</p>
				) : null}
			</FieldGroup>
		</form>
	);
}

function KnowledgeBuckets({
	label,
	buckets,
}: {
	label: string;
	buckets: readonly {
		readonly language: string;
		readonly values: readonly string[];
	}[];
}) {
	if (buckets.length === 0) return null;
	return (
		<section className="flex flex-col gap-2">
			<h3 className="text-xs font-medium text-muted-foreground">
				{label}
			</h3>
			<div className="flex flex-wrap gap-2">
				{buckets.flatMap((bucket) =>
					bucket.values.map((value) => (
						<Badge
							key={`${bucket.language}:${value}`}
							variant="outline"
						>
							{bucket.language}: {value}
						</Badge>
					)),
				)}
			</div>
		</section>
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
			<Skeleton className="h-4 w-full" />
			<Skeleton className="h-20 w-full" />
		</div>
	);
}

function isSemanticRelation(value: unknown): value is SemanticRelation {
	return semanticRelations.some((relation) => relation === value);
}

function mutationMessage(error: unknown): string {
	return error instanceof Error ? error.message : "Knowledge update failed.";
}
