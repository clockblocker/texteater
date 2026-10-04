import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";
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
import { visitorErrorMessage } from "@/lib/visitor-error";
import { NotFoundView } from "@/views/not-found-view";
import { ReaderSentence } from "@/views/reader-sentence";
import type { TextSubjectTarget } from "@/workspace/workspace-subject";
import { api } from "../../convex/_generated/api";

/**
 * The reading column, shared with Reading Notes. The Deck sits at one place
 * in its Pane, 12rem below its top (the battery's `DECK_TOP_REM`), so the
 * column's top leaves the first two lines above it under the Pane bar, and
 * its foot lets the last Sentence scroll clear of it.
 */
const READER_BODY_CLASS =
	"mx-auto w-full max-w-note px-note-gutter pt-14 pb-[max(5rem,calc(100svh-12rem))] @max-md:pt-8";

const MISSING_SOURCE_CONTEXT_NOTICE =
	"This Source Context is no longer available. The Text is still open, and no new resolution was started.";

type SentenceView = NonNullable<
	FunctionReturnType<typeof api.textViews.get>
>["sentences"][number];

export function TextView({ target }: { target: TextSubjectTarget }) {
	const visitorId = useAnonymousVisitorId();
	const [notice, setNotice] = useState<string | null>(null);
	const [segmentationError, setSegmentationError] = useState<string | null>(
		null,
	);
	const selection = useSegmentSelection(visitorId);
	const segmentText = usePendingAction(api.orchestration.submitText);
	const focus = useOccurrenceFocus(
		target.textId,
		target.focusAttestationId ?? null,
		() => setNotice(MISSING_SOURCE_CONTEXT_NOTICE),
	);

	const textQuery = useQuery(
		convexQuery(api.textViews.get, { textId: target.textId, visitorId }),
	);

	const textDetail = textQuery.data;
	const sentences = textDetail?.sentences ?? [];
	const error =
		selection.error ??
		segmentationError ??
		(textQuery.error ? visitorErrorMessage(textQuery.error) : null);
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
				visitorId,
				inspectionVisitorId: import.meta.env.DEV
					? visitorId
					: undefined,
				submissionKey: textDetail.submissionKey,
				sourceText: textDetail.sourceText,
			});
			if (result.status === "Rejected") {
				setSegmentationError(result.message);
				return;
			}
			if (result.textId !== textDetail.textId) {
				setSegmentationError(
					"Segments were saved to a different Text.",
				);
				return;
			}
			setNotice("Text split into segments.");
		} catch (cause) {
			setSegmentationError(visitorErrorMessage(cause));
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
			focus={focus}
			selectedSegmentKey={selection.selectedSegmentKey}
			sentences={sentences}
			showSegmentAction={needsSegmentation}
			isSegmenting={segmentText.isPending}
			onSegmentText={() => void handleSegmentText()}
		/>
	);
}

/** Where Go to source lands in a Text: one occurrence's Sentence and members. */
type OccurrenceFocus = {
	readonly sentenceId: string;
	readonly memberSegmentIndices: readonly number[];
};

/**
 * The occurrence a Text Cover pushed by Go to source lands on, looked up
 * apart from the Text so the Text query keeps its identity. One that no
 * longer resolves is reported once, and the Text reads as if opened from
 * the Library.
 */
function useOccurrenceFocus(
	textId: string,
	attestationId: string | null,
	onMissing: () => void,
): OccurrenceFocus | null {
	const focusQuery = useQuery(
		convexQuery(
			api.textViews.occurrenceFocus,
			attestationId ? { textId, attestationId } : "skip",
		),
	);
	const focus = focusQuery.data;
	const reported = useRef(false);
	const latestOnMissing = useRef(onMissing);
	latestOnMissing.current = onMissing;
	useEffect(() => {
		if (focus?.kind !== "Missing" || reported.current) return;
		reported.current = true;
		latestOnMissing.current();
	}, [focus]);
	return focus?.kind === "Occurrence"
		? {
				sentenceId: focus.sentenceId,
				memberSegmentIndices: focus.memberSegmentIndices,
			}
		: null;
}

export function TextPresentation({
	sentences,
	selectedSegmentKey,
	onSegmentClick,
	focus = null,
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
	readonly focus?: OccurrenceFocus | null;
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
					focus={focus}
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
	focus = null,
}: {
	sentences: readonly SentenceView[];
	selectedSegmentKey: string | null;
	onSegmentClick: (
		sentence: SentenceView,
		clickedSegmentIndex: number,
		altKey: boolean,
		anchorElement: HTMLElement,
	) => Promise<void>;
	/** The occurrence Go to source lands on: its Sentence is scrolled to once, its members lit. */
	focus?: OccurrenceFocus | null;
}) {
	const sentenceElements = useRef(new Map<string, HTMLParagraphElement>());
	const focusSentenceId = focus?.sentenceId ?? null;
	const landed = useRef<string | null>(null);

	useEffect(() => {
		if (!focusSentenceId || landed.current === focusSentenceId) return;
		const frame = window.requestAnimationFrame(() => {
			const sentence = sentenceElements.current.get(focusSentenceId);
			if (!sentence) return;
			landed.current = focusSentenceId;
			centerInScroller(sentence);
		});
		return () => window.cancelAnimationFrame(frame);
	}, [focusSentenceId]);

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
								focusMemberIndices={
									sentence.sentenceId === focusSentenceId
										? focus?.memberSegmentIndices
										: undefined
								}
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

/**
 * Scrolls the Sheet's own scroller, and only it, so the Sentence sits in
 * its middle; nothing around the Sheet moves.
 */
function centerInScroller(sentence: HTMLElement): void {
	const scroller = sentence.closest<HTMLElement>("[data-scroller]");
	if (!scroller) {
		sentence.scrollIntoView({ block: "center", behavior: "auto" });
		return;
	}
	const frame = scroller.getBoundingClientRect();
	const box = sentence.getBoundingClientRect();
	scroller.scrollTop += box.top - frame.top - (frame.height - box.height) / 2;
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
