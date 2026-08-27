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
import { cn } from "@/lib/utils";
import { NotFoundView } from "@/views/not-found-view";
import { segmentSelectionDeckCards } from "@/views/segment-selection-deck";
import { useWorkspaceInteraction } from "@/workspace/workspace-controller";
import { api } from "../../convex/_generated/api";

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
			segments: sentence.segments.map((segment) => ({
				...segment,
				isClicked: false,
				isResolutionMember: false,
			})),
		})) ?? [];
	const error =
		interactionError ??
		mutationMessage(selectSegment.error) ??
		mutationMessage(textQuery.error);

	async function handleSegmentSelection(
		sentence: SentenceView,
		clickedSegmentIndex: number,
		altKey: boolean,
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
			presentCards(segmentSelectionDeckCards(requestId, result));
		} catch (cause) {
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
			isResolving={selectSegment.isPending}
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
	isResolving,
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
	readonly isResolving: boolean;
	readonly selectedSegmentKey: string | null;
	readonly onSegmentClick: (
		sentence: SentenceView,
		clickedSegmentIndex: number,
		altKey: boolean,
	) => Promise<void>;
	readonly notice?: string | null;
	readonly error?: string | null;
}) {
	return (
		<div className="flex-1 bg-background px-4 py-8 sm:px-6 sm:py-12">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
				<SentenceList
					sentences={sentences}
					focus={focus}
					isResolving={isResolving}
					selectedSegmentKey={selectedSegmentKey}
					onSegmentClick={onSegmentClick}
				/>

				{focus.kind === "Missing" ? (
					<p className="text-sm text-muted-foreground" role="status">
						This Source Context is no longer available. The Text is
						still open, and no new resolution was started.
					</p>
				) : null}

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
			</div>
		</div>
	);
}

export function SentenceList({
	sentences,
	focus,
	isResolving,
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
	isResolving: boolean;
	selectedSegmentKey: string | null;
	onSegmentClick: (
		sentence: SentenceView,
		clickedSegmentIndex: number,
		altKey: boolean,
	) => Promise<void>;
}) {
	const sentenceElements = useRef(new Map<string, HTMLParagraphElement>());
	const segmentElements = useRef(new Map<string, HTMLElement>());
	const focusKey =
		focus.kind === "Occurrence"
			? `${focus.attestationId}:${focus.sentenceId}:${focus.memberSegmentIndices.join(",")}`
			: focus.kind;

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
		<article className="flex flex-col gap-5" aria-label="Text">
			{sentences.map((sentence) => (
				<p
					key={sentence.sentenceId}
					className="text-xl leading-loose sm:text-2xl"
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
						const isSelected =
							segment.isClicked ||
							selectedSegmentKey ===
								segmentKey(sentence.sentenceId, segment.index);

						return segment.kind === "ResolvableText" ? (
							<button
								key={segment.index}
								type="button"
								className={cn(
									"-mx-0.5 cursor-pointer appearance-none rounded-sm border-0 bg-transparent px-0.5 py-0 align-baseline text-inherit transition-colors [font:inherit] leading-[1.35] hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-pressed:bg-primary aria-pressed:text-primary-foreground disabled:pointer-events-none",
									isSourceContextMember && "bg-[#4d8ce6]/25",
								)}
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
								disabled={
									isResolving || sentence.language !== "de"
								}
								aria-pressed={isSelected}
								onClick={(event) =>
									void onSegmentClick(
										sentence,
										segment.index,
										event.altKey,
									)
								}
							>
								{segment.text}
							</button>
						) : (
							<span
								key={segment.index}
								className={cn(
									isSourceContextMember && "bg-[#4d8ce6]/25",
								)}
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
		<div className="flex-1 bg-background px-4 py-8 sm:px-6 sm:py-12">
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
