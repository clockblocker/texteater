import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { NoteLinesSkeleton } from "lego";
import { type ComponentProps, useEffect, useRef, useState } from "react";

import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import { useSegmentSelection } from "@/hooks/use-segment-selection";
import type { SentenceView } from "@/lib/action-results";
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
	const selection = useSegmentSelection(visitorId);
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
	const error = selection.error ?? mutationMessage(textQuery.error);

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
			{sentences.map((sentence) => (
				<section key={sentence.sentenceId}>
					{sentence.heading ? (
						<h2 className="mb-2 text-base font-semibold tracking-normal">
							{sentence.heading}
						</h2>
					) : null}
					<ReaderSentence
						sentence={sentence}
						selectedSegmentKey={selectedSegmentKey}
						onSegmentClick={onSegmentClick}
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
				</section>
			))}
		</article>
	);
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
