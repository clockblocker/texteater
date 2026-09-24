import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { Button, NoteLinesSkeleton } from "lego";
import { BookOpenIcon } from "lucide-react";
import {
	type ComponentProps,
	Fragment,
	useEffect,
	useRef,
	useState,
} from "react";

import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import { usePendingAction } from "@/hooks/use-pending-action";
import { useSegmentSelection } from "@/hooks/use-segment-selection";
import { parseSubmittedTextId, type SentenceView } from "@/lib/action-results";
import { actuateSourceContextFocus } from "@/lib/source-context-focus";
import { NotFoundView } from "@/views/not-found-view";
import { ReaderSentence } from "@/views/reader-sentence";
import type { TextSubjectTarget } from "@/workspace/sheet-workspace";
import {
	type OccurrenceRevealHandle,
	useOccurrenceReveal,
} from "@/workspace/workspace-controller";
import { api } from "../../convex/_generated/api";

/** The reading column: shared with Reading Notes, padded so the last sentence clears the deck. */
const READER_BODY_CLASS =
	"mx-auto w-full max-w-note px-note-gutter pt-[var(--reading-top,5rem)] pb-[max(5rem,calc(100cqh-var(--reading-deck-top,10.25rem)+0.875rem))] @max-md:pt-8";

const MISSING_SOURCE_CONTEXT_NOTICE =
	"This Source Context is no longer available. The Text is still open, and no new resolution was started.";

export function TextView({ target }: { target: TextSubjectTarget }) {
	const visitorId = useAnonymousVisitorId();
	const [notice, setNotice] = useState<string | null>(null);
	const [segmentationError, setSegmentationError] = useState<string | null>(
		null,
	);
	const selection = useSegmentSelection(visitorId);
	const segmentText = usePendingAction(api.orchestration.submitText);
	const reveal = useOccurrenceReveal();
	const revealSentenceId = useOccurrenceArrival(target.textId, reveal, {
		onOccurrence: selection.markSelected,
		onMissing: () => setNotice(MISSING_SOURCE_CONTEXT_NOTICE),
	});

	const textQuery = useQuery({
		...convexQuery(api.textViews.get, { textId: target.textId, visitorId }),
		gcTime: 10_000,
	});

	const textDetail = textQuery.data;
	const sentences: readonly SentenceView[] =
		textDetail?.sentences.map((sentence) => ({
			...sentence,
			sourceText: textDetail.sourceText,
		})) ?? [];
	const error =
		selection.error ??
		segmentationError ??
		mutationMessage(textQuery.error);
	const needsSegmentation =
		sentences.length > 0 &&
		sentences.every((sentence) => sentence.segments.length === 0);

	async function handleSegmentSelection(
		sentence: SentenceView,
		clickedSegmentIndex: number,
		altKey: boolean,
		anchorElement: HTMLElement,
	) {
		setNotice(null);
		await selection.select(
			sentence.sentenceId,
			clickedSegmentIndex,
			altKey,
			anchorElement,
		);
	}

	async function handleSegmentText() {
		if (!textDetail) return;
		setNotice(null);
		setSegmentationError(null);
		try {
			const result = await segmentText.run({
				inspectionVisitorId: import.meta.env.DEV
					? visitorId
					: undefined,
				submissionKey: textDetail.submissionKey,
				sourceText: textDetail.sourceText,
			});
			if (parseSubmittedTextId(result) !== textDetail.textId) {
				throw new Error("Segments were saved to a different Text.");
			}
			setNotice("Text split into segments.");
		} catch (cause) {
			setSegmentationError(
				mutationMessage(cause) ?? "Text segmentation failed.",
			);
		}
	}

	if (textQuery.isPending) return <TextViewSkeleton />;
	if (!textDetail) {
		return (
			<NotFoundView
				title="Text not found"
				description="This text does not exist, or it was removed from the demo."
			/>
		);
	}

	return (
		<TextPresentation
			error={error}
			notice={notice}
			onSegmentClick={handleSegmentSelection}
			revealSentenceId={revealSentenceId}
			onRevealed={reveal?.acknowledge}
			selectedSegmentKey={selection.selectedSegmentKey}
			sentences={sentences}
			showSegmentAction={needsSegmentation}
			isSegmenting={segmentText.isPending}
			onSegmentText={() => void handleSegmentText()}
		/>
	);
}

/**
 * Consumes a pending occurrence reveal once. The occurrence is looked up
 * apart from the Text, its members are selected exactly as a click would
 * select them, and its Sentence is handed back for one scroll. A reveal
 * that no longer resolves leaves a notice instead. Either way the gesture
 * is acknowledged, and from then on the Text is an ordinary open Text.
 */
function useOccurrenceArrival(
	textId: string,
	reveal: OccurrenceRevealHandle | null,
	handlers: {
		readonly onOccurrence: (
			sentenceId: string,
			segmentIndex: number,
		) => void;
		readonly onMissing: () => void;
	},
): string | null {
	const attestationId = reveal?.attestationId ?? null;
	const focusQuery = useQuery(
		convexQuery(
			api.textViews.occurrenceFocus,
			attestationId ? { textId, attestationId } : "skip",
		),
	);
	const focus = focusQuery.data;
	const [revealSentenceId, setRevealSentenceId] = useState<string | null>(
		null,
	);
	const consumedAttestationId = useRef<string | null>(null);
	const latestHandlers = useRef(handlers);
	latestHandlers.current = handlers;

	useEffect(() => {
		if (!reveal || !focus) return;
		if (consumedAttestationId.current === reveal.attestationId) return;
		consumedAttestationId.current = reveal.attestationId;
		if (focus.kind === "Occurrence") {
			const [firstMember] = focus.memberSegmentIndices;
			if (firstMember !== undefined)
				latestHandlers.current.onOccurrence(
					focus.sentenceId,
					firstMember,
				);
			setRevealSentenceId(focus.sentenceId);
			return;
		}
		latestHandlers.current.onMissing();
		reveal.acknowledge();
	}, [reveal, focus]);

	useEffect(() => {
		if (!reveal) setRevealSentenceId(null);
	}, [reveal]);

	return revealSentenceId;
}

export function TextPresentation({
	sentences,
	selectedSegmentKey,
	onSegmentClick,
	revealSentenceId = null,
	onRevealed,
	notice = null,
	error = null,
	showSegmentAction = false,
	isSegmenting = false,
	onSegmentText,
}: {
	readonly sentences: readonly SentenceView[];
	readonly selectedSegmentKey: string | null;
	readonly onSegmentClick: (
		sentence: SentenceView,
		clickedSegmentIndex: number,
		altKey: boolean,
		anchorElement: HTMLElement,
	) => Promise<void>;
	readonly revealSentenceId?: string | null;
	readonly onRevealed?: () => void;
	readonly notice?: string | null;
	readonly error?: string | null;
	readonly showSegmentAction?: boolean;
	readonly isSegmenting?: boolean;
	readonly onSegmentText?: () => void;
}) {
	return (
		<div
			data-slot="text-reader"
			className="w-full min-h-full flex-auto bg-paper text-ink motion-reduce:[&_*]:transition-none"
		>
			<div className={READER_BODY_CLASS}>
				<SentenceList
					sentences={sentences}
					selectedSegmentKey={selectedSegmentKey}
					onSegmentClick={onSegmentClick}
					revealSentenceId={revealSentenceId}
					onRevealed={onRevealed}
				/>
				{showSegmentAction ? (
					<div className="mt-8">
						<Button
							type="button"
							disabled={isSegmenting}
							onClick={onSegmentText}
						>
							<BookOpenIcon data-icon="inline-start" />
							{isSegmenting
								? "Splitting…"
								: "Split into segments"}
						</Button>
					</div>
				) : null}

				{notice ? (
					<ReaderStatus aria-live="polite">{notice}</ReaderStatus>
				) : null}
				{error ? (
					<ReaderStatus role="alert" className="text-destructive">
						{error}
					</ReaderStatus>
				) : null}
			</div>
		</div>
	);
}

function ReaderStatus({ className = "", ...props }: ComponentProps<"p">) {
	return (
		<p
			className={`mt-8 text-xs leading-snug text-ink-muted ${className}`}
			{...props}
		/>
	);
}

export function SentenceList({
	sentences,
	selectedSegmentKey,
	onSegmentClick,
	revealSentenceId = null,
	onRevealed,
}: {
	sentences: readonly SentenceView[];
	selectedSegmentKey: string | null;
	onSegmentClick: (
		sentence: SentenceView,
		clickedSegmentIndex: number,
		altKey: boolean,
		anchorElement: HTMLElement,
	) => Promise<void>;
	/** A Sentence to scroll to once it is on screen; reported back through `onRevealed`. */
	revealSentenceId?: string | null;
	onRevealed?: () => void;
}) {
	const sentenceElements = useRef(new Map<string, HTMLParagraphElement>());
	const latestOnRevealed = useRef(onRevealed);
	latestOnRevealed.current = onRevealed;

	useEffect(() => {
		if (!revealSentenceId) return;
		const frame = window.requestAnimationFrame(() => {
			const sentence = sentenceElements.current.get(revealSentenceId);
			if (sentence) actuateSourceContextFocus(sentence);
			latestOnRevealed.current?.();
		});
		return () => window.cancelAnimationFrame(frame);
	}, [revealSentenceId]);

	return (
		<article
			className="space-y-7 text-lg leading-[1.52] font-[430] tracking-[-0.015em] @max-md:space-y-6 @max-md:text-base"
			aria-label="Text"
		>
			{paragraphsOf(sentences).map((paragraph) => (
				<section key={paragraph[0].sentenceId}>
					{paragraph[0].heading ? (
						<h2 className="mb-2 text-base font-semibold tracking-normal">
							{paragraph[0].heading}
						</h2>
					) : null}
					{paragraph.map((sentence, index) => (
						<Fragment key={sentence.sentenceId}>
							{index > 0 ? " " : null}
							<ReaderSentence
								sentence={sentence}
								selectedSegmentKey={selectedSegmentKey}
								onSegmentClick={onSegmentClick}
								className="text-reader__sentence inline"
								onSentenceElement={(element) => {
									if (element) {
										sentenceElements.current.set(
											sentence.sentenceId,
											element,
										);
									} else {
										sentenceElements.current.delete(
											sentence.sentenceId,
										);
									}
								}}
							/>
						</Fragment>
					))}
				</section>
			))}
		</article>
	);
}

type Paragraph = readonly [SentenceView, ...SentenceView[]];

/**
 * Consecutive Sentences sharing a paragraph, in order. A Sentence without a
 * paragraph, or one opening under a heading, starts a paragraph of its own.
 */
function paragraphsOf(sentences: readonly SentenceView[]): Paragraph[] {
	const paragraphs: Paragraph[] = [];
	let current: [SentenceView, ...SentenceView[]] | undefined;
	for (const sentence of sentences) {
		if (
			current &&
			sentence.paragraph !== undefined &&
			sentence.paragraph === current[0].paragraph &&
			!sentence.heading
		) {
			current.push(sentence);
		} else {
			current = [sentence];
			paragraphs.push(current);
		}
	}
	return paragraphs;
}

/** The reading column before its sentences arrive: two passages of bones set on the passage leading. */
export function TextViewSkeleton() {
	return (
		<div
			className="w-full min-h-full flex-auto bg-paper"
			role="status"
			aria-busy="true"
			aria-label="Loading Text"
		>
			<div
				aria-hidden="true"
				className={`${READER_BODY_CLASS} space-y-7 text-lg leading-[1.52] @max-md:space-y-6 @max-md:text-base`}
			>
				<NoteLinesSkeleton
					className="leading-[inherit]"
					widths={["w-full", "w-11/12", "w-full", "w-3/5"]}
				/>
				<NoteLinesSkeleton
					className="leading-[inherit]"
					widths={["w-full", "w-4/5", "w-2/5"]}
				/>
			</div>
		</div>
	);
}

function mutationMessage(error: unknown): string | null {
	return error instanceof Error ? error.message : null;
}
