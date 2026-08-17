import { convexQuery } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import type { FunctionArgs } from "convex/server";
import {
	ArrowRightIcon,
	BookOpenIcon,
	DatabaseZapIcon,
	EraserIcon,
	LibraryIcon,
	UserRoundXIcon,
} from "lucide-react";
import { type FormEvent, lazy, Suspense, useState } from "react";
import {
	Link,
	Navigate,
	Route,
	Routes,
	useNavigate,
	useParams,
} from "react-router-dom";
import { ResolutionPipeline } from "@/components/resolution-pipeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import {
	parseResolutionDecision,
	parseSubmittedTextId,
	type SentenceView,
} from "@/lib/action-results";
import { api } from "../convex/_generated/api";

type TextId = FunctionArgs<typeof api.demoReset.stripTextAnalysis>["textId"];

const exampleText = "Die Banken sind geöffnet.";
const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
});
const ReadingGraph = lazy(() => import("@/components/reading-graph"));

export function App() {
	return (
		<Routes>
			<Route path="/" element={<Navigate to="/library" replace />} />
			<Route path="/library" element={<LibraryPage />} />
			<Route path="/text/:textId" element={<TextPage />} />
			<Route path="*" element={<NotFoundPage />} />
		</Routes>
	);
}

function LibraryPage() {
	const navigate = useNavigate();
	const [sourceText, setSourceText] = useState(exampleText);
	const [interactionError, setInteractionError] = useState<string | null>(
		null,
	);
	const textsQuery = useQuery({
		...convexQuery(api.texts.list, {}),
		gcTime: 10_000,
	});
	const submitTextAction = useAction(api.orchestration.submitText);
	const submitText = useMutation({ mutationFn: submitTextAction });

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setInteractionError(null);
		const normalized = sourceText.trim().normalize("NFC");
		if (!normalized) return;

		try {
			const result = await submitText.mutateAsync({
				submissionKey: submissionKeyFor(normalized),
				sourceText: normalized,
			});
			navigate(`/text/${parseSubmittedTextId(result)}`);
		} catch (cause) {
			setInteractionError(
				mutationMessage(cause) ?? "Text analysis failed.",
			);
		}
	}

	const error = interactionError ?? mutationMessage(textsQuery.error);

	return (
		<main className="min-h-svh bg-muted/30 px-4 py-8 sm:px-6 sm:py-12">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
				<header className="flex flex-col gap-2">
					<p className="text-sm font-medium text-muted-foreground">
						tf-demo
					</p>
					<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
						Library
					</h1>
					<p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
						Open a stored text to inspect its sentences and resolve
						German segments.
					</p>
				</header>

				<Card>
					<CardHeader>
						<CardTitle>Add a text</CardTitle>
						<CardDescription>
							Analyze a short German sentence and save it to the
							library.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form
							id="library-text-submission"
							aria-label="Add text to library"
							onSubmit={(event) => void handleSubmit(event)}
						>
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="library-source-text">
										German sentence
									</FieldLabel>
									<Textarea
										id="library-source-text"
										name="text"
										className="min-h-24 resize-y"
										value={sourceText}
										onChange={(event) =>
											setSourceText(event.target.value)
										}
										disabled={submitText.isPending}
									/>
								</Field>
							</FieldGroup>
						</form>
						{error ? (
							<p
								className="mt-4 text-sm text-destructive"
								role="alert"
							>
								{error}
							</p>
						) : null}
					</CardContent>
					<CardFooter className="justify-end">
						<Button
							type="submit"
							form="library-text-submission"
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

				<section
					className="flex flex-col gap-3"
					aria-labelledby="library-title"
				>
					<div className="flex items-center justify-between gap-4">
						<h2
							id="library-title"
							className="text-lg font-semibold"
						>
							Stored texts
						</h2>
						{textsQuery.data ? (
							<Badge variant="secondary">
								{textsQuery.data.length}
							</Badge>
						) : null}
					</div>

					{textsQuery.isPending ? (
						<LibrarySkeleton />
					) : textsQuery.data && textsQuery.data.length > 0 ? (
						<div className="grid gap-3 sm:grid-cols-2">
							{textsQuery.data.map((text) => (
								<Link
									key={text.textId}
									to={`/text/${text.textId}`}
									className="group rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
								>
									<div className="flex items-start justify-between gap-4">
										<div className="flex min-w-0 flex-col gap-2">
											<p className="line-clamp-3 text-base leading-relaxed font-medium">
												{text.sourceText}
											</p>
											<p className="text-xs text-muted-foreground">
												Added{" "}
												{formatDate(text.createdAt)}
											</p>
										</div>
										<ArrowRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
									</div>
								</Link>
							))}
						</div>
					) : (
						<Card size="sm">
							<CardContent className="flex items-center gap-3 py-3 text-muted-foreground">
								<LibraryIcon className="size-5" />
								<p>No stored texts yet. Analyze one above.</p>
							</CardContent>
						</Card>
					)}
				</section>

				<DataControls />
			</div>
		</main>
	);
}

function TextPage() {
	const { textId } = useParams();
	return textId ? (
		<TextWorkspace key={textId} textId={textId} />
	) : (
		<NotFoundPage />
	);
}

function TextWorkspace({ textId }: { textId: string }) {
	const visitorId = useAnonymousVisitorId();
	const [selectedSegmentKey, setSelectedSegmentKey] = useState<string | null>(
		null,
	);
	const [notice, setNotice] = useState<string | null>(null);
	const [interactionError, setInteractionError] = useState<string | null>(
		null,
	);

	const textQuery = useQuery({
		...convexQuery(api.texts.get, { textId }),
		gcTime: 10_000,
	});
	const presentationQuery = useQuery({
		...convexQuery(api.presentation.forVisitor, { visitorId }),
		gcTime: 10_000,
	});
	const resolveSegmentAction = useAction(api.orchestration.resolveSegment);
	const resolveSegment = useMutation({ mutationFn: resolveSegmentAction });

	const latestPresentation = presentationQuery.data ?? null;
	const presentation =
		latestPresentation?.text.textId === textId ? latestPresentation : null;
	const textDetail = textQuery.data;
	const storedSentences: readonly SentenceView[] =
		textDetail?.sentences.map((sentence) => ({
			...sentence,
			sourceText: textDetail.sourceText,
			segments: sentence.segments.map((segment) => ({
				...segment,
				isClicked: false,
				isResolutionMember: false,
			})),
		})) ?? [];
	const visibleSentences = storedSentences.map((sentence) =>
		presentation?.sentence.sentenceId === sentence.sentenceId
			? presentation.sentence
			: sentence,
	);
	const error =
		interactionError ??
		mutationMessage(resolveSegment.error) ??
		mutationMessage(textQuery.error) ??
		mutationMessage(presentationQuery.error);

	async function handleSegmentClick(
		sentence: SentenceView,
		clickedSegmentIndex: number,
	) {
		setNotice(null);
		setInteractionError(null);
		setSelectedSegmentKey(
			segmentKey(sentence.sentenceId, clickedSegmentIndex),
		);
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
					? null
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

	if (textQuery.isPending) return <TextPageSkeleton />;
	if (textQuery.data === null) return <NotFoundPage />;

	return (
		<main className="min-h-svh bg-background px-4 py-8 sm:px-6 sm:py-12">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
				<SentenceList
					sentences={visibleSentences}
					isResolving={resolveSegment.isPending}
					selectedSegmentKey={selectedSegmentKey}
					onSegmentClick={handleSegmentClick}
				/>

				{notice ? (
					<p
						className="text-sm text-muted-foreground"
						aria-live="polite"
					>
						{notice}
					</p>
				) : null}
				{error ? (
					<p className="text-sm text-destructive" role="alert">
						{error}
					</p>
				) : null}

				{presentation ? (
					<>
						<ResolutionPipeline presentation={presentation} />
						<Suspense fallback={<ReadingGraphSkeleton />}>
							<ReadingGraph
								key={presentation.reading.ownerKey}
								origin={presentation.reading}
							/>
						</Suspense>
					</>
				) : null}

				<DataControls
					text={
						textDetail
							? {
									textId: textDetail.textId,
									sourceText: textDetail.sourceText,
									isAnalyzed: textDetail.sentences.some(
										(sentence) =>
											sentence.segments.length > 0,
									),
								}
							: undefined
					}
				/>
			</div>
		</main>
	);
}

function LibrarySkeleton() {
	return (
		<div
			className="grid gap-3 sm:grid-cols-2"
			role="status"
			aria-label="Loading texts"
		>
			{[0, 1, 2, 3].map((index) => (
				<Card key={index} size="sm">
					<CardContent className="flex flex-col gap-3">
						<Skeleton className="h-5 w-4/5" />
						<Skeleton className="h-4 w-2/5" />
					</CardContent>
				</Card>
			))}
		</div>
	);
}

function TextPageSkeleton() {
	return (
		<main className="min-h-svh bg-background px-4 py-8 sm:px-6 sm:py-12">
			<div
				className="mx-auto w-full max-w-5xl"
				role="status"
				aria-label="Loading text"
			>
				<Skeleton className="h-9 w-96 max-w-full" />
			</div>
		</main>
	);
}

function NotFoundPage() {
	return (
		<main className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-12">
			<div className="flex w-full max-w-5xl flex-col gap-8">
				<Card className="w-full max-w-md self-center">
					<CardHeader>
						<CardTitle>Text not found</CardTitle>
						<CardDescription>
							This text does not exist, or it was removed from the
							demo.
						</CardDescription>
					</CardHeader>
					<CardFooter className="justify-end">
						<Link
							to="/library"
							className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
						>
							<LibraryIcon className="size-4" />
							Back to library
						</Link>
					</CardFooter>
				</Card>
				<DataControls />
			</div>
		</main>
	);
}

function DataControls({
	text,
}: {
	text?: { textId: TextId; sourceText: string; isAnalyzed: boolean };
}) {
	const navigate = useNavigate();
	const visitorId = useAnonymousVisitorId();
	const [notice, setNotice] = useState<string | null>(null);
	const [interactionError, setInteractionError] = useState<string | null>(
		null,
	);
	const clearSharedData = useMutation({
		mutationFn: useAction(api.demoReset.clearSharedData),
	});
	const clearVisitorData = useMutation({
		mutationFn: useAction(api.demoReset.clearVisitorData),
	});
	const stripTextAnalysis = useMutation({
		mutationFn: useAction(api.demoReset.stripTextAnalysis),
	});
	const analyzeText = useMutation({
		mutationFn: useAction(api.orchestration.submitText),
	});
	const isBusy =
		clearSharedData.isPending ||
		clearVisitorData.isPending ||
		stripTextAnalysis.isPending ||
		analyzeText.isPending;
	const error =
		interactionError ??
		mutationMessage(clearSharedData.error) ??
		mutationMessage(clearVisitorData.error) ??
		mutationMessage(stripTextAnalysis.error) ??
		mutationMessage(analyzeText.error);

	async function handleClearVisitorData() {
		if (
			!window.confirm(
				"Clear this visitor's data? This removes only your Click history; shared resolutions and Knowledge stay available.",
			)
		) {
			return;
		}
		setNotice(null);
		setInteractionError(null);
		try {
			const result = await clearVisitorData.mutateAsync({ visitorId });
			setNotice(`Cleared ${result.deleted} visitor-owned records.`);
		} catch (cause) {
			setInteractionError(
				mutationMessage(cause) ?? "Visitor-data reset failed.",
			);
		}
	}

	async function handleStripTextAnalysis() {
		if (!text) return;
		if (
			!window.confirm(
				`Strip the analysis from “${text.sourceText}”? The Text and its Sentences will remain. Segments, resolutions, Clicks, and Readings with no other source will be removed.`,
			)
		) {
			return;
		}
		setNotice(null);
		setInteractionError(null);
		try {
			const result = await stripTextAnalysis.mutateAsync({
				textId: text.textId,
			});
			setNotice(
				`Stripped ${result.removed} analysis records. The Text and its Sentences were kept.`,
			);
		} catch (cause) {
			setInteractionError(
				mutationMessage(cause) ?? "Analysis stripping failed.",
			);
		}
	}

	async function handleAnalyzeText() {
		if (!text) return;
		setNotice(null);
		setInteractionError(null);
		try {
			const result = await analyzeText.mutateAsync({
				submissionKey: submissionKeyFor(text.sourceText),
				sourceText: text.sourceText,
			});
			const analyzedTextId = parseSubmittedTextId(result);
			if (analyzedTextId !== text.textId) {
				throw new Error("Analysis was saved to a different Text.");
			}
			setNotice("Text analysis restored.");
		} catch (cause) {
			setInteractionError(
				mutationMessage(cause) ?? "Text analysis failed.",
			);
		}
	}

	async function handleClearSharedData() {
		if (
			!window.confirm(
				"Clear shared data for every visitor? This removes all Texts, Sentences, Segments, Readings, Lemmas, relations, and Knowledge.",
			)
		) {
			return;
		}
		setNotice(null);
		setInteractionError(null);
		try {
			const result = await clearSharedData.mutateAsync({});
			navigate("/library");
			setNotice(
				`Cleared ${result.deleted} shared records. Visitor-owned history was kept.`,
			);
		} catch (cause) {
			setInteractionError(
				mutationMessage(cause) ?? "Shared-data reset failed.",
			);
		}
	}

	return (
		<footer className="flex flex-col gap-3 border-t pt-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-xs leading-relaxed text-muted-foreground">
					Demo data controls. Destructive actions require
					confirmation.
				</p>
				<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
					<Button
						type="button"
						variant="outline"
						disabled={isBusy}
						onClick={() => void handleClearVisitorData()}
					>
						<UserRoundXIcon data-icon="inline-start" />
						{clearVisitorData.isPending
							? "Clearing your data…"
							: "Clear my data"}
					</Button>
					{text?.isAnalyzed ? (
						<Button
							type="button"
							variant="destructive"
							disabled={isBusy}
							onClick={() => void handleStripTextAnalysis()}
						>
							<EraserIcon data-icon="inline-start" />
							{stripTextAnalysis.isPending
								? "Stripping analysis…"
								: "Strip analysis"}
						</Button>
					) : text ? (
						<Button
							type="button"
							disabled={isBusy}
							onClick={() => void handleAnalyzeText()}
						>
							<BookOpenIcon data-icon="inline-start" />
							{analyzeText.isPending
								? "Analyzing…"
								: "Analyze text"}
						</Button>
					) : null}
					<Button
						type="button"
						variant="destructive"
						disabled={isBusy}
						onClick={() => void handleClearSharedData()}
					>
						<DatabaseZapIcon data-icon="inline-start" />
						{clearSharedData.isPending
							? "Clearing shared data…"
							: "Clear shared data"}
					</Button>
				</div>
			</div>
			{notice ? (
				<p className="text-sm text-muted-foreground" aria-live="polite">
					{notice}
				</p>
			) : null}
			{error ? (
				<p className="text-sm text-destructive" role="alert">
					{error}
				</p>
			) : null}
		</footer>
	);
}

function ReadingGraphSkeleton() {
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

function SentenceList({
	sentences,
	isResolving,
	selectedSegmentKey,
	onSegmentClick,
}: {
	sentences: readonly SentenceView[];
	isResolving: boolean;
	selectedSegmentKey: string | null;
	onSegmentClick: (
		sentence: SentenceView,
		clickedSegmentIndex: number,
	) => Promise<void>;
}) {
	return (
		<article className="flex flex-col gap-5" aria-label="Text">
			{sentences.map((sentence) => (
				<p
					key={sentence.sentenceId}
					className="text-xl leading-loose sm:text-2xl"
				>
					{sentence.segments.length === 0 ? (
						<span>{sentence.stitchedText}</span>
					) : null}
					{sentence.segments.map((segment) => {
						const isSelected =
							segment.isClicked ||
							selectedSegmentKey ===
								segmentKey(sentence.sentenceId, segment.index);

						return segment.kind === "ResolvableText" ? (
							<button
								key={segment.index}
								type="button"
								className="-mx-0.5 cursor-pointer appearance-none rounded-sm border-0 bg-transparent px-0.5 py-0 align-baseline text-inherit transition-colors [font:inherit] leading-[1.35] hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-pressed:bg-primary aria-pressed:text-primary-foreground disabled:pointer-events-none"
								disabled={
									isResolving || sentence.language !== "de"
								}
								aria-pressed={isSelected}
								onClick={() =>
									void onSegmentClick(sentence, segment.index)
								}
							>
								{segment.text}
							</button>
						) : (
							<span key={segment.index}>{segment.text}</span>
						);
					})}
				</p>
			))}
		</article>
	);
}

function mutationMessage(error: unknown): string | null {
	return error instanceof Error ? error.message : null;
}

function formatDate(timestamp: number): string {
	return shortDateFormatter.format(timestamp);
}

function segmentKey(sentenceId: string, segmentIndex: number): string {
	return `${sentenceId}:${segmentIndex}`;
}

function submissionKeyFor(sourceText: string): string {
	return `text:v1:${sourceText.trim().normalize("NFC")}`;
}

export default App;
