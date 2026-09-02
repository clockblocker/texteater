import { convexQuery } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
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
import "./text-view.css";

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
		<div className="text-reader">
			<div className="text-reader__body">
				<SentenceList
					sentences={sentences}
					focus={focus}
					selectedSegmentKey={selectedSegmentKey}
					onSegmentClick={onSegmentClick}
				/>

				{focus.kind === "Missing" ? (
					<p className="text-reader__status" role="status">
						This Source Context is no longer available. The Text is
						still open, and no new resolution was started.
					</p>
				) : null}

				{notice ? (
					<p className="text-reader__status" aria-live="polite">
						{notice}
					</p>
				) : null}
				{error ? (
					<p
						className="text-reader__status text-reader__status--error"
						role="alert"
					>
						{error}
					</p>
				) : null}
			</div>
		</div>
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
		<article className="text-reader__passage" aria-label="Text">
			{sentences.map((sentence) => (
				<p
					key={sentence.sentenceId}
					className="text-reader__sentence"
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
						const isSourceContextMember = isFocusedOccurrenceMember(
							focus,
							sentence.sentenceId,
							segment.index,
						);
						const key = segmentKey(
							sentence.sentenceId,
							segment.index,
						);
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

						return segment.kind === "ResolvableText" ? (
							<button
								key={segment.index}
								type="button"
								className="text-reader__segment"
								data-state={displayState}
								data-source-context-member={
									isSourceContextMember || undefined
								}
								ref={(element) => {
									if (element) {
										segmentElements.current.set(
											key,
											element,
										);
									} else {
										segmentElements.current.delete(key);
									}
								}}
								disabled={
									sentence.language !== "de" ||
									segment.resolutionState === "Active"
								}
								aria-pressed={isSelected}
								aria-label={segmentAccessibleLabel(segment)}
								onBlur={() => setFocusedTarget(null)}
								onFocus={() =>
									setFocusedTarget({
										segmentKey: key,
										...(segment.attestationId
											? {
													attestationId:
														segment.attestationId,
												}
											: {}),
									})
								}
								onMouseEnter={() =>
									setHoveredTarget({
										segmentKey: key,
										...(segment.attestationId
											? {
													attestationId:
														segment.attestationId,
												}
											: {}),
									})
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
							</button>
						) : (
							<span
								key={segment.index}
								className="text-reader__plain-segment"
								data-source-context-member={
									isSourceContextMember || undefined
								}
								ref={(element) => {
									const key = segmentKey(
										sentence.sentenceId,
										segment.index,
									);
									if (element) {
										segmentElements.current.set(
											key,
											element,
										);
									} else {
										segmentElements.current.delete(key);
									}
								}}
							>
								{segment.text}
							</span>
						);
					})}
				</p>
			))}
		</article>
	);
}

function TextViewSkeleton() {
	return (
		<div className="text-reader text-reader--loading">
			<div
				className="mx-auto w-full max-w-5xl"
				role="status"
				aria-label="Loading text"
			>
				<Skeleton className="h-9 w-96 max-w-full" />
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
