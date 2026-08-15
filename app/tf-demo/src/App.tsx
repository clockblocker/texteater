import { convexQuery } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import { BookOpenIcon } from "lucide-react";
import { type FormEvent, lazy, Suspense, useState } from "react";
import { ResolutionPipeline } from "@/components/resolution-pipeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import {
	parseResolutionDecision,
	parseSubmittedSentences,
	type SentenceView,
} from "@/lib/action-results";
import { api } from "../convex/_generated/api";

const exampleText = "Die Banken sind geöffnet.";
const ReadingGraph = lazy(() => import("@/components/reading-graph"));

export function App() {
	const visitorId = useAnonymousVisitorId();
	const [sourceText, setSourceText] = useState(exampleText);
	const [submittedSentences, setSubmittedSentences] = useState<
		readonly SentenceView[]
	>([]);
	const [notice, setNotice] = useState<string | null>(null);
	const [interactionError, setInteractionError] = useState<string | null>(
		null,
	);

	const presentationQuery = useQuery({
		...convexQuery(api.presentation.forVisitor, { visitorId }),
		gcTime: 10_000,
	});
	const submitTextAction = useAction(api.orchestration.submitText);
	const resolveSegmentAction = useAction(api.orchestration.resolveSegment);
	const submitText = useMutation({ mutationFn: submitTextAction });
	const resolveSegment = useMutation({ mutationFn: resolveSegmentAction });

	const presentation = presentationQuery.data ?? null;
	const visibleSentences =
		submittedSentences.length > 0
			? submittedSentences
			: presentation
				? [presentation.sentence]
				: [];
	const error =
		interactionError ??
		mutationMessage(submitText.error) ??
		mutationMessage(resolveSegment.error) ??
		mutationMessage(presentationQuery.error);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setNotice(null);
		setInteractionError(null);
		const normalized = sourceText.trim().normalize("NFC");
		if (!normalized) return;
		try {
			const result = await submitText.mutateAsync({
				submissionKey: `text:v1:${normalized}`,
				sourceText: normalized,
			});
			setSubmittedSentences(parseSubmittedSentences(result, normalized));
			setNotice("Text analyzed. Select a highlighted Segment.");
		} catch (cause) {
			setInteractionError(
				mutationMessage(cause) ?? "Text analysis failed.",
			);
		}
	}

	async function handleSegmentClick(
		sentence: SentenceView,
		clickedSegmentIndex: number,
	) {
		setNotice(null);
		setInteractionError(null);
		try {
			const result = await resolveSegment.mutateAsync({
				requestId: crypto.randomUUID(),
				visitorId,
				sentenceId: sentence.sentenceId,
				clickedSegmentIndex,
			});
			const decision = parseResolutionDecision(result);
			setNotice(
				decision === "Resolved"
					? "Reading resolved. Inspect the path and follow its note relations."
					: decision === "NotImplemented"
						? "This grammatical route is not implemented yet."
						: "Dumgen could not resolve this Segment.",
			);
		} catch (cause) {
			setInteractionError(
				mutationMessage(cause) ?? "Segment resolution failed.",
			);
		}
	}

	return (
		<main className="min-h-svh bg-muted/30 px-4 py-8 sm:px-6 sm:py-12">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
				<header className="flex flex-col gap-2">
					<p className="text-sm font-medium text-muted-foreground">
						tf-demo
					</p>
					<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
						Read German in context
					</h1>
					<p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
						Submit one short sentence, follow the complete
						linguistic resolution path, then move between Reading
						notes through real semantic relations.
					</p>
				</header>

				<Card>
					<CardHeader>
						<CardTitle>Reading workspace</CardTitle>
						<CardDescription>
							Linguistic Knowledge is global; only clicks and
							resolved contexts belong to this anonymous visitor.
						</CardDescription>
						<CardAction>
							<Badge variant="secondary">Local demo</Badge>
						</CardAction>
					</CardHeader>

					<CardContent className="flex flex-col gap-6">
						<form
							id="text-submission"
							aria-label="Text submission"
							onSubmit={(event) => void handleSubmit(event)}
						>
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="source-text">
										German sentence
									</FieldLabel>
									<Textarea
										id="source-text"
										name="text"
										className="min-h-32 resize-y"
										value={sourceText}
										onChange={(event) =>
											setSourceText(event.target.value)
										}
										disabled={submitText.isPending}
									/>
									<FieldDescription>
										Dumgen currently accepts
										caller-delimited Source Sentences, so
										this slice analyzes one sentence.
									</FieldDescription>
								</Field>
							</FieldGroup>
						</form>

						{visibleSentences.length > 0 ? (
							<SentenceList
								sentences={visibleSentences}
								isResolving={resolveSegment.isPending}
								onSegmentClick={handleSegmentClick}
							/>
						) : null}

						{presentation ? (
							<>
								<ResolutionPipeline
									presentation={presentation}
								/>
								<Suspense fallback={<ReadingGraphSkeleton />}>
									<ReadingGraph
										key={presentation.reading.ownerKey}
										visitorId={visitorId}
										origin={presentation.reading}
									/>
								</Suspense>
							</>
						) : (
							<Card size="sm">
								<CardHeader>
									<CardTitle>Resolution path</CardTitle>
									<CardDescription>
										Analyze a sentence and select a
										ResolvableText Segment to open the
										pipeline.
									</CardDescription>
								</CardHeader>
							</Card>
						)}

						{notice ? (
							<p
								className="text-sm text-muted-foreground"
								aria-live="polite"
							>
								{notice}
							</p>
						) : null}
						{error ? (
							<p
								className="text-sm text-destructive"
								role="alert"
							>
								{error}
							</p>
						) : null}
					</CardContent>

					<CardFooter className="justify-end">
						<Button
							type="submit"
							form="text-submission"
							disabled={
								submitText.isPending ||
								sourceText.trim().length === 0
							}
						>
							<BookOpenIcon data-icon="inline-start" />
							{submitText.isPending
								? "Analyzing…"
								: "Analyze text"}
						</Button>
					</CardFooter>
				</Card>
			</div>
		</main>
	);
}

function ReadingGraphSkeleton() {
	return (
		<Card size="sm" role="status" aria-label="Loading Reading graph">
			<CardContent className="flex flex-col gap-3">
				<Skeleton className="h-7 w-48" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-24 w-full" />
			</CardContent>
		</Card>
	);
}

function SentenceList({
	sentences,
	isResolving,
	onSegmentClick,
}: {
	sentences: readonly SentenceView[];
	isResolving: boolean;
	onSegmentClick: (
		sentence: SentenceView,
		clickedSegmentIndex: number,
	) => Promise<void>;
}) {
	return (
		<section
			className="flex flex-col gap-3"
			aria-labelledby="source-sentence-title"
		>
			<div className="flex flex-col gap-1">
				<h2 id="source-sentence-title" className="text-sm font-medium">
					Source Sentence
				</h2>
				<p className="text-xs text-muted-foreground">
					Only ResolvableText Segments are interactive.
				</p>
			</div>
			{sentences.map((sentence) => (
				<p
					key={sentence.sentenceId}
					className="rounded-lg border bg-background p-4 text-lg leading-9"
				>
					{sentence.segments.map((segment) =>
						segment.kind === "ResolvableText" ? (
							<Button
								key={segment.index}
								type="button"
								variant={
									segment.isResolutionMember
										? "secondary"
										: "ghost"
								}
								size="sm"
								className="h-auto px-1 py-0.5 align-baseline"
								disabled={
									isResolving || sentence.language !== "de"
								}
								aria-pressed={segment.isClicked}
								onClick={() =>
									void onSegmentClick(sentence, segment.index)
								}
							>
								{segment.text}
							</Button>
						) : (
							<span key={segment.index}>{segment.text}</span>
						),
					)}
				</p>
			))}
		</section>
	);
}

function mutationMessage(error: unknown): string | null {
	return error instanceof Error ? error.message : null;
}

export default App;
