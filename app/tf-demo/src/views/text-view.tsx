import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { NoteLinesSkeleton } from "lego";
import { type ComponentProps, useEffect, useRef, useState } from "react";

import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import { segmentKey, useSegmentSelection } from "@/hooks/use-segment-selection";
import type { SentenceView } from "@/lib/action-results";
import type { TextTarget } from "@/lib/navigation";
import { actuateSourceContextFocus } from "@/lib/source-context-focus";
import { NotFoundView } from "@/views/not-found-view";
import { ReaderSentence } from "@/views/reader-sentence";
import { api } from "../../convex/_generated/api";

/** The reading column: shared with Reading Notes, padded so the last sentence clears the deck. */
const READER_BODY_CLASS =
	"mx-auto w-full max-w-note px-note-gutter pt-[var(--reading-top,5rem)] pb-[max(5rem,calc(100cqh-var(--reading-deck-top,10.25rem)+0.875rem))] @max-md:pt-8";

export function TextView({ target }: { target: TextTarget }) {
	const visitorId = useAnonymousVisitorId();
	const [notice, setNotice] = useState<string | null>(null);
	const selection = useSegmentSelection(visitorId);

	const textQuery = useQuery({
		...convexQuery(api.textViews.get, {
			textId: target.textId,
			visitorId,
			...(target.focusAttestationId
				? { focusAttestationId: target.focusAttestationId }
				: {}),
		}),
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
			focus={textDetail.focus}
			notice={notice}
			onSegmentClick={handleSegmentSelection}
			selectedSegmentKey={selection.selectedSegmentKey}
			sentences={sentences}
		/>
	);
}

export function TextPresentation({
	sentences,
	focus,
	selectedSegmentKey,
	onSegmentClick,
	notice = null,
	error = null,
}: {
	readonly sentences: readonly SentenceView[];
	readonly focus:
		| { readonly kind: "None" | "Missing" }
		| {
				readonly kind: "Occurrence";
				readonly attestationId: string;
				readonly sentenceId: string;
				readonly memberSegmentIndices: readonly number[];
		  };
	readonly selectedSegmentKey: string | null;
	readonly onSegmentClick: (
		sentence: SentenceView,
		clickedSegmentIndex: number,
		altKey: boolean,
		anchorElement: HTMLElement,
	) => Promise<void>;
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
					focus={focus}
					selectedSegmentKey={selectedSegmentKey}
					onSegmentClick={onSegmentClick}
				/>

				{focus.kind === "Missing" ? (
					<ReaderStatus role="status">
						This Source Context is no longer available. The Text is
						still open, and no new resolution was started.
					</ReaderStatus>
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
	focus,
	selectedSegmentKey,
	onSegmentClick,
}: {
	sentences: readonly SentenceView[];
	focus:
		| { readonly kind: "None" | "Missing" }
		| {
				readonly kind: "Occurrence";
				readonly attestationId: string;
				readonly sentenceId: string;
				readonly memberSegmentIndices: readonly number[];
		  };
	selectedSegmentKey: string | null;
	onSegmentClick: (
		sentence: SentenceView,
		clickedSegmentIndex: number,
		altKey: boolean,
		anchorElement: HTMLElement,
	) => Promise<void>;
}) {
	const sentenceElements = useRef(new Map<string, HTMLParagraphElement>());
	const segmentElements = useRef(new Map<string, HTMLElement>());

	useEffect(() => {
		if (focus.kind !== "Occurrence") return;
		let animations: Animation[] = [];
		const frame = window.requestAnimationFrame(() => {
			const sentence = sentenceElements.current.get(focus.sentenceId);
			if (!sentence) return;
			const members = focus.memberSegmentIndices.flatMap((index) => {
				const element = segmentElements.current.get(
					segmentKey(focus.sentenceId, index),
				);
				return element ? [element] : [];
			});
			animations = actuateSourceContextFocus(sentence, members);
		});
		return () => {
			window.cancelAnimationFrame(frame);
			for (const animation of animations) animation.cancel();
		};
	}, [focus]);

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
						focusMemberIndices={
							focus.kind === "Occurrence" &&
							focus.sentenceId === sentence.sentenceId
								? focus.memberSegmentIndices
								: []
						}
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
						onSegmentElement={(index, element) => {
							const key = segmentKey(sentence.sentenceId, index);
							if (element)
								segmentElements.current.set(key, element);
							else segmentElements.current.delete(key);
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
