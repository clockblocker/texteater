import {
	ReaderPlainSegment,
	ReaderSegment,
	type ReaderSegmentInteraction,
	type ReaderSegmentTone,
} from "lego";
import { useState } from "react";

import { segmentKey } from "@/hooks/use-segment-selection";
import type { SentenceSegmentView } from "@/lib/action-results";

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

/** What one Sentence needs to read and click, wherever it is shown. */
export type ReaderSentenceData = {
	readonly sentenceId: string;
	readonly language: "de" | "he";
	readonly stitchedText: string;
	readonly segments: readonly SentenceSegmentView[];
};

/**
 * One Sentence of running text whose ResolvableText Segments select like
 * words in the reader. The same paragraph serves a Text and a Definition
 * block: hover and focus preview the word or its whole occurrence, a click
 * selects it, and the members of a focused occurrence wear the selected rule.
 */
export function ReaderSentence<S extends ReaderSentenceData>({
	sentence,
	focusMemberIndices = [],
	selectedSegmentKey,
	onSegmentClick,
	onSentenceElement,
	className = "text-reader__sentence",
}: {
	readonly sentence: S;
	readonly focusMemberIndices?: readonly number[];
	readonly selectedSegmentKey: string | null;
	readonly onSegmentClick: (
		sentence: S,
		clickedSegmentIndex: number,
		altKey: boolean,
		anchorElement: HTMLElement,
	) => Promise<void> | void;
	readonly onSentenceElement?: (element: HTMLParagraphElement | null) => void;
	readonly className?: string;
}) {
	const [hoveredTarget, setHoveredTarget] =
		useState<InteractionTarget | null>(null);
	const [focusedTarget, setFocusedTarget] =
		useState<InteractionTarget | null>(null);
	const previewTarget = hoveredTarget ?? focusedTarget;
	const selectedSegment = sentence.segments.find(
		(segment) =>
			segmentKey(sentence.sentenceId, segment.index) ===
			selectedSegmentKey,
	);

	return (
		<p className={className} ref={onSentenceElement}>
			{sentence.segments.length === 0 ? (
				<span>{sentence.stitchedText}</span>
			) : null}
			{sentence.segments.map((segment) => {
				const isSourceContextMember = focusMemberIndices.includes(
					segment.index,
				);
				const key = segmentKey(sentence.sentenceId, segment.index);
				if (segment.kind !== "ResolvableText") {
					return (
						<ReaderPlainSegment key={segment.index}>
							{segment.text}
						</ReaderPlainSegment>
					);
				}
				const isPreviewed = previewTarget?.attestationId
					? segment.attestationId === previewTarget.attestationId
					: previewTarget?.segmentKey === key;
				/* A word the reader picked, or one the focused Note points
				   at: both wear the selected rule. */
				const isSelected =
					isSourceContextMember ||
					(selectedSegment?.attestationId
						? segment.attestationId ===
							selectedSegment.attestationId
						: selectedSegmentKey === key);
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
						data-state={displayState}
						tone={segmentTone(displayState)}
						interaction={segmentInteraction(displayState)}
						disabled={
							sentence.language !== "de" ||
							segment.resolutionState === "Active" ||
							segment.resolutionState === "PermanentFailure"
						}
						aria-pressed={isSelected}
						aria-label={segmentAccessibleLabel(segment)}
						onBlur={() => setFocusedTarget(null)}
						onFocus={() => setFocusedTarget(interactionTarget)}
						onMouseEnter={() => setHoveredTarget(interactionTarget)}
						onMouseLeave={() => setHoveredTarget(null)}
						onClick={(event) => {
							// A pointer click leaves no focus ring behind; keyboard activation keeps its ring.
							if (event.detail > 0) event.currentTarget.blur();
							void onSegmentClick(
								sentence,
								segment.index,
								event.altKey,
								event.currentTarget,
							);
						}}
					>
						{segment.text}
					</ReaderSegment>
				);
			})}
		</p>
	);
}

function displayStateForSegment(
	segment: SentenceSegmentView,
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
			return "unknown";
		case "failed":
		case "failed-preview":
			return "failed";
		case "selected":
		case "known-preview":
		case "retained":
			return "known";
		default:
			return "plain";
	}
}

function segmentInteraction(
	state: SegmentDisplayState | undefined,
): ReaderSegmentInteraction {
	switch (state) {
		case "unknown-preview":
		case "unresolved-preview":
		case "failed-preview":
		case "known-preview":
			return "previewed";
		case "selected":
			return "selected";
		default:
			return "idle";
	}
}

function segmentAccessibleLabel(segment: SentenceSegmentView): string {
	if (segment.attestationId) {
		return `${segment.text}, part of a known occurrence`;
	}
	switch (segment.resolutionState) {
		case "Active":
			return `${segment.text}, resolution in progress`;
		case "Unresolved":
			return `${segment.text}, unresolved, click to try again`;
		case "PermanentFailure":
			return `${segment.text}, could not be resolved`;
		default:
			return `${segment.text}, click to resolve`;
	}
}
