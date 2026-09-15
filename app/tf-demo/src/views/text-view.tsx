import { convexQuery } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import {
	NoteLinesSkeleton,
	ReaderPlainSegment,
	ReaderSegment,
	type ReaderSegmentTone,
} from "lego";
import { type ComponentProps, useEffect, useRef, useState } from "react";

import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import type { SentenceView } from "@/lib/action-results";
import type { TextTarget } from "@/lib/navigation";
import {
	shouldRequestRouteNote,
	useRouteNotePreference,
} from "@/lib/route-note-preference";
import {
	actuateSourceContextFocus,
	isFocusedOccurrenceMember,
} from "@/lib/source-context-focus";
import { NotFoundView } from "@/views/not-found-view";
import { segmentSelectionDeckCards } from "@/views/segment-selection-deck";
import { useWorkspaceInteraction } from "@/workspace/workspace-controller";
import { api } from "../../convex/_generated/api";

type InteractionTarget = {
	readonly segmentKey: string;
	readonly attestationId?: string;
};

type SegmentDisplayState =
	| "unknown-preview"
	| "resolving"
	| "unresolved"
	| "unresolved-preview"
	| "failed"
	| "failed-preview"
	| "known-preview"
	| "selected"
	| "retained";

/** The reading column: shared with Reading Notes, padded so the last sentence clears the deck. */
const READER_BODY_CLASS =
	"mx-auto w-full max-w-note px-note-gutter pt-[var(--reading-top,5rem)] pb-[max(5rem,calc(100cqh-var(--reading-deck-top,10.25rem)+0.875rem))] @max-md:pt-8";

export function TextView({ target }: { target: TextTarget }) {
	const { presentCards } = useWorkspaceInteraction();
	const visitorId = useAnonymousVisitorId();
	const [routeNotesEnabled] = useRouteNotePreference();
	const [selectedSegmentKey, setSelectedSegmentKey] = useState<string | null>(
		null,
	);
	const [notice, setNotice] = useState<string | null>(null);
	const [interactionError, setInteractionError] = useState<string | null>(
		null,
	);

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
	const selectSegmentMutation = useConvexMutation(
		api.resolutionSessions.selectSegment,
	);
	const selectSegment = useMutation({
		mutationFn: selectSegmentMutation,
	});

	const textDetail = textQuery.data;
	const sentences: readonly SentenceView[] =
		textDetail?.sentences.map((sentence) => ({
			...sentence,
			sourceText: textDetail.sourceText,
		})) ?? [];
	const error =
		interactionError ??
		mutationMessage(selectSegment.error) ??
		mutationMessage(textQuery.error);

	async function handleSegmentSelection(
		sentence: SentenceView,
		clickedSegmentIndex: number,
		altKey: boolean,
		anchorElement: HTMLElement,
	) {
		setNotice(null);
		setInteractionError(null);
		setSelectedSegmentKey(
			segmentKey(sentence.sentenceId, clickedSegmentIndex),
		);
		try {
			const requestId = crypto.randomUUID();
			const result = await selectSegment.mutateAsync({
				requestId,
				visitorId,
				sentenceId: sentence.sentenceId,
				clickedSegmentIndex,
				routeNoteRequested: shouldRequestRouteNote(
					routeNotesEnabled,
					altKey,
				),
			});
			presentCards(segmentSelectionDeckCards(requestId, result), {
				anchor: anchorElement,
			});
		} catch (cause) {
			setSelectedSegmentKey(null);
			setInteractionError(
				mutationMessage(cause) ?? "Segment resolution failed.",
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
			focus={textDetail.focus}
			notice={notice}
			onSegmentClick={handleSegmentSelection}
			selectedSegmentKey={selectedSegmentKey}
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
	const [hoveredTarget, setHoveredTarget] =
		useState<InteractionTarget | null>(null);
	const [focusedTarget, setFocusedTarget] =
		useState<InteractionTarget | null>(null);
	const previewTarget = hoveredTarget ?? focusedTarget;
	const focusKey =
		focus.kind === "Occurrence"
			? `${focus.attestationId}:${focus.sentenceId}:${focus.memberSegmentIndices.join(",")}`
			: focus.kind;
	const selectedSegment = sentences
		.flatMap((sentence) =>
			sentence.segments.map((segment) => ({
				segment,
				key: segmentKey(sentence.sentenceId, segment.index),
			})),
		)
		.find(({ key }) => key === selectedSegmentKey)?.segment;

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
	}, [focusKey]);

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
					<p
						ref={(element) => {
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
					>
						{sentence.segments.length === 0 ? (
							<span>{sentence.stitchedText}</span>
						) : null}
						{sentence.segments.map((segment) => {
							const isSourceContextMember =
								isFocusedOccurrenceMember(
									focus,
									sentence.sentenceId,
									segment.index,
								);
							const key = segmentKey(
								sentence.sentenceId,
								segment.index,
							);
							const trackElement = (
								element: HTMLElement | null,
							) => {
								if (element) {
									segmentElements.current.set(key, element);
								} else {
									segmentElements.current.delete(key);
								}
							};
							if (segment.kind !== "ResolvableText") {
								return (
									<ReaderPlainSegment
										key={segment.index}
										ref={trackElement}
										highlighted={isSourceContextMember}
									>
										{segment.text}
									</ReaderPlainSegment>
								);
							}
							const isPreviewed = previewTarget?.attestationId
								? segment.attestationId ===
									previewTarget.attestationId
								: previewTarget?.segmentKey === key;
							const isSelected = selectedSegment?.attestationId
								? segment.attestationId ===
									selectedSegment.attestationId
								: selectedSegmentKey === key;
							const displayState = displayStateForSegment(
								segment,
								isPreviewed,
								isSelected,
							);
							const interactionTarget: InteractionTarget = {
								segmentKey: key,
								...(segment.attestationId
									? { attestationId: segment.attestationId }
									: {}),
							};

							return (
								<ReaderSegment
									key={segment.index}
									ref={trackElement}
									data-state={displayState}
									highlighted={isSourceContextMember}
									tone={segmentTone(displayState)}
									underlined={isPreviewState(displayState)}
									disabled={
										sentence.language !== "de" ||
										segment.resolutionState === "Active"
									}
									aria-pressed={isSelected}
									aria-label={segmentAccessibleLabel(segment)}
									onBlur={() => setFocusedTarget(null)}
									onFocus={() =>
										setFocusedTarget(interactionTarget)
									}
									onMouseEnter={() =>
										setHoveredTarget(interactionTarget)
									}
									onMouseLeave={() => setHoveredTarget(null)}
									onClick={(event) =>
										void onSegmentClick(
											sentence,
											segment.index,
											event.altKey,
											event.currentTarget,
										)
									}
								>
									{segment.text}
								</ReaderSegment>
							);
						})}
					</p>
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

function segmentKey(sentenceId: string, segmentIndex: number): string {
	return `${sentenceId}:${segmentIndex}`;
}

function displayStateForSegment(
	segment: SentenceView["segments"][number],
	isPreviewed: boolean,
	isSelected: boolean,
): SegmentDisplayState | undefined {
	if (isPreviewed && segment.attestationId) return "known-preview";
	if (isPreviewed) {
		switch (segment.resolutionState) {
			case "Active":
				return "resolving";
			case "Unresolved":
				return "unresolved-preview";
			case "PermanentFailure":
				return "failed-preview";
			default:
				return "unknown-preview";
		}
	}
	if (segment.resolutionState === "Active") return "resolving";
	if (segment.resolutionState === "Unresolved") return "unresolved";
	if (segment.resolutionState === "PermanentFailure") return "failed";
	if (isSelected) return segment.attestationId ? "selected" : "resolving";
	return segment.encountered && segment.attestationId
		? "retained"
		: undefined;
}

function segmentTone(
	state: SegmentDisplayState | undefined,
): ReaderSegmentTone {
	switch (state) {
		case "unknown-preview":
			return "unknown";
		case "resolving":
			return "resolving";
		case "unresolved":
		case "unresolved-preview":
			return "unresolved";
		case "failed":
		case "failed-preview":
			return "failed";
		case "known-preview":
		case "selected":
		case "retained":
			return "known";
		default:
			return "plain";
	}
}

function isPreviewState(state: SegmentDisplayState | undefined): boolean {
	return (
		state === "unknown-preview" ||
		state === "unresolved-preview" ||
		state === "failed-preview" ||
		state === "known-preview"
	);
}

function segmentAccessibleLabel(
	segment: SentenceView["segments"][number],
): string {
	if (segment.attestationId) {
		return `${segment.text}, part of a known occurrence`;
	}
	switch (segment.resolutionState) {
		case "Active":
			return `${segment.text}, resolution in progress`;
		case "Unresolved":
			return `${segment.text}, unresolved, click to try again`;
		case "PermanentFailure":
			return `${segment.text}, resolution failed, click to try again`;
		default:
			return `${segment.text}, click to resolve`;
	}
}
