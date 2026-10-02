import {
	ReaderPlainSegment,
	ReaderSegment,
	type ReaderSegmentInteraction,
	type ReaderSegmentTone,
} from "lego";
import { useMemo, useState } from "react";

import { segmentKey } from "@/hooks/use-segment-selection";
import type { SentenceSegmentView } from "@/lib/action-results";

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
	readonly language: "de" | "en" | "he";
	readonly stitchedText: string;
	readonly segments: readonly SentenceSegmentView[];
};

/**
 * One Sentence of running text whose ResolvableText Segments select like
 * words in the reader. The same paragraph serves a Text and a Definition
 * block: hover and focus preview every member of the word's group (see
 * `segmentGroups`), a click selects that group, and the members of a
 * focused occurrence wear the selected rule. Selection outranks preview.
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
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
	const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
	// Built once per Sentence view, so a hover reads a map and asks nobody.
	const groups = useMemo(
		() => segmentGroups(sentence.segments),
		[sentence.segments],
	);
	const previewIndex = hoveredIndex ?? focusedIndex;
	const previewGroup =
		previewIndex === null ? undefined : groups.get(previewIndex);
	const selectedSegment = sentence.segments.find(
		(segment) =>
			segmentKey(sentence.sentenceId, segment.index) ===
			selectedSegmentKey,
	);
	const selectedGroup = selectedSegment
		? groups.get(selectedSegment.index)
		: undefined;

	return (
		<p className={className} ref={onSentenceElement}>
			{sentence.segments.length === 0 ? (
				<span>{sentence.stitchedText}</span>
			) : null}
			{fusedRuns(sentence.segments).map((run) =>
				run.length === 1 ? (
					renderSegment(run[0] as SentenceSegmentView)
				) : (
					// A fused word's components wrap as the one word they spell.
					<span
						key={`fused-${run[0]?.index}`}
						className="whitespace-nowrap"
					>
						{run.map(renderSegment)}
					</span>
				),
			)}
		</p>
	);

	function renderSegment(segment: SentenceSegmentView) {
		const isSourceContextMember = focusMemberIndices.includes(
			segment.index,
		);
		if (segment.kind !== "ResolvableText") {
			return (
				<ReaderPlainSegment key={segment.index}>
					{segment.text}
				</ReaderPlainSegment>
			);
		}
		const isPreviewed = previewGroup?.includes(segment.index) ?? false;
		/* The group of a word the reader picked, or the occurrence the
		   focused Note points at: both wear the selected rule. */
		const isSelected =
			isSourceContextMember ||
			(selectedGroup?.includes(segment.index) ?? false);
		const displayState = displayStateForSegment(
			segment,
			isPreviewed,
			isSelected,
		);

		return (
			<ReaderSegment
				key={segment.index}
				data-state={displayState}
				tone={segmentTone(displayState, segment)}
				gender={segment.encountered ? segment.gender : undefined}
				interaction={segmentInteraction(displayState)}
				disabled={
					sentence.language !== "de" ||
					segment.resolutionState === "Active" ||
					segment.resolutionState === "PermanentFailure"
				}
				aria-pressed={isSelected}
				aria-label={segmentAccessibleLabel(segment)}
				onBlur={() => setFocusedIndex(null)}
				onFocus={() => setFocusedIndex(segment.index)}
				onMouseEnter={() => setHoveredIndex(segment.index)}
				onMouseLeave={() => setHoveredIndex(null)}
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
	}
}

/**
 * What a hover, focus or click on each ResolvableText Segment lights up in
 * its Sentence, by Segment index. An attested Segment groups with its
 * occurrence's members. Any other Segment groups with the members of the
 * biggest unit intake stored for it that no occurrence claimed, which may be
 * discontinuous (`gibt … auf`); without a unit it stands alone. Groups never
 * overlap, so hovering any member lights up the same Segments.
 */
export function segmentGroups(
	segments: readonly SentenceSegmentView[],
): ReadonlyMap<number, readonly number[]> {
	const resolvable = segments.filter(
		(segment) => segment.kind === "ResolvableText",
	);
	const occurrenceOf = new Map(
		resolvable.map((segment) => [segment.index, segment.attestationId]),
	);
	const groups = new Map<number, readonly number[]>();
	for (const segment of resolvable) {
		if (groups.has(segment.index)) continue;
		const { attestationId } = segment;
		const members = attestationId
			? resolvable
					.filter((other) => other.attestationId === attestationId)
					.map(({ index }) => index)
			: (segment.unit?.segments ?? []).filter(
					(index) =>
						occurrenceOf.has(index) && !occurrenceOf.get(index),
				);
		// A Segment its stored unit does not name stands alone.
		const group = members.includes(segment.index)
			? members
			: [segment.index];
		for (const index of group) groups.set(index, group);
	}
	return groups;
}

/** Segments in reading order, a fused word's components grouped into one run. */
function fusedRuns(
	segments: readonly SentenceSegmentView[],
): SentenceSegmentView[][] {
	const runs: SentenceSegmentView[][] = [];
	for (const segment of segments) {
		const last = runs.at(-1);
		const previous = last?.at(-1);
		if (
			last &&
			previous?.surface !== undefined &&
			segment.surface !== undefined
		)
			last.push(segment);
		else runs.push([segment]);
	}
	return runs;
}

/**
 * A running resolution and a dead word show only that. Otherwise selection
 * outranks preview, and a selected or previewed group wears one look
 * whichever member was clicked or hovered.
 */
function displayStateForSegment(
	segment: SentenceSegmentView,
	isPreviewed: boolean,
	isSelected: boolean,
): SegmentDisplayState | undefined {
	if (segment.resolutionState === "Active") return "resolving";
	if (segment.resolutionState === "PermanentFailure")
		return isPreviewed ? "failed-preview" : "failed";
	if (isSelected) return "selected";
	if (isPreviewed && segment.attestationId) return "known-preview";
	if (isPreviewed)
		return segment.resolutionState === "Unresolved"
			? "unresolved-preview"
			: "unknown-preview";
	if (segment.resolutionState === "Unresolved") return "unresolved";
	return segment.encountered && segment.attestationId
		? "retained"
		: undefined;
}

function segmentTone(
	state: SegmentDisplayState | undefined,
	segment: SentenceSegmentView,
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
			// A selected unit no occurrence owns yet is still unknown.
			return segment.attestationId ? "known" : "unknown";
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
