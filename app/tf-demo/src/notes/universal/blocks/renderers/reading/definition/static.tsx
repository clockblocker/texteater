import { NoteLinesSkeleton, NoteSection } from "lego";
import { useEffect, useRef } from "react";

import { segmentKey } from "@/hooks/use-segment-selection";
import { actuateSourceContextFocus } from "@/lib/source-context-focus";
import { ReaderSentence } from "@/views/reader-sentence";
import type { DefinitionCapabilities } from "../../../../note/capabilities";
import type { ReadingDefaultRenderer } from "../../../renderer";

type DefinitionText =
	Parameters<ReadingDefaultRenderer>[0]["noteData"]["definitionText"];

/**
 * The Reading's definition. In a Sheet it reads like a Sentence: every word
 * selects the way the reader's words do, and a Source Context that came from
 * this definition lands here with its members lit and the block set back.
 * A Card shows the bare prose. The block is loaded only once the definition
 * is both generated and segmented; until then it keeps its skeleton.
 */
export const renderReadingDefinition = (({
	noteData,
	PresentationCapabilities,
}) => {
	const { knowledgeSettings, presentation, definition } =
		PresentationCapabilities;
	if (!knowledgeSettings.definition) return null;
	const text = noteData.knowledge.definition;
	const definitionText: DefinitionText | undefined = noteData.definitionText;
	const generating =
		text === undefined && noteData.knowledgeState.activity === "Loading";
	if (text === undefined && !generating) return null;

	if (generating || definitionText?.state === "Pending") {
		return (
			<NoteSection
				aria-label="Definition"
				label="Definition"
				aria-busy="true"
			>
				<NoteLinesSkeleton
					className="px-2 py-1"
					widths={
						presentation === "Card"
							? ["w-full", "w-2/3"]
							: ["w-full", "w-11/12", "w-1/2"]
					}
				/>
			</NoteSection>
		);
	}

	if (definitionText?.state === "Failed") {
		return (
			<NoteSection aria-label="Definition" label="Definition">
				<div
					className="rounded-lg border border-destructive/40 px-2 py-1"
					role="alert"
				>
					<p className="leading-relaxed text-ink text-pretty">
						{text}
					</p>
					<p className="mt-1 text-sm text-destructive">
						{definitionText.failureMessage ??
							"This definition could not be segmented."}
					</p>
				</div>
			</NoteSection>
		);
	}

	if (
		definitionText?.state === "Ready" &&
		presentation === "Sheet" &&
		definition
	) {
		return (
			<NoteSection aria-label="Definition" label="Definition">
				<DefinitionSentence
					sentence={definitionText.sentence}
					capabilities={definition}
				/>
			</NoteSection>
		);
	}

	return (
		<NoteSection aria-label="Definition" label="Definition">
			<p className="px-2 py-1 leading-relaxed text-ink text-pretty">
				{text}
			</p>
		</NoteSection>
	);
}) satisfies ReadingDefaultRenderer;

function DefinitionSentence({
	sentence,
	capabilities,
}: {
	readonly sentence: Extract<DefinitionText, { state: "Ready" }>["sentence"];
	readonly capabilities: DefinitionCapabilities;
}) {
	const sentenceElement = useRef<HTMLParagraphElement | null>(null);
	const segmentElements = useRef(new Map<string, HTMLElement>());
	const focusAttestationId = capabilities.focus?.attestationId ?? null;
	const focusMemberIndices = focusAttestationId
		? sentence.segments
				.filter(
					(segment) => segment.attestationId === focusAttestationId,
				)
				.map(({ index }) => index)
		: [];
	const focused = focusMemberIndices.length > 0;

	useEffect(() => {
		if (!focused) return;
		let animations: Animation[] = [];
		const frame = window.requestAnimationFrame(() => {
			const paragraph = sentenceElement.current;
			if (!paragraph) return;
			const members = focusMemberIndices.flatMap((index) => {
				const element = segmentElements.current.get(
					segmentKey(sentence.sentenceId, index),
				);
				return element ? [element] : [];
			});
			animations = actuateSourceContextFocus(paragraph, members);
		});
		return () => {
			window.cancelAnimationFrame(frame);
			for (const animation of animations) animation.cancel();
		};
		// The focus is fixed for the life of this Presentation.
	}, [focused, focusAttestationId, sentence.sentenceId]);

	return (
		<div
			data-slot="definition-sentence"
			data-focused={focused || undefined}
			className="px-2 py-1 leading-relaxed text-pretty transition-opacity duration-150 data-[focused=true]:opacity-70 motion-reduce:transition-none"
		>
			<ReaderSentence
				sentence={sentence}
				className="text-reader__sentence"
				focusMemberIndices={focusMemberIndices}
				selectedSegmentKey={capabilities.selectedSegmentKey}
				onSegmentClick={(clicked, index, altKey, anchor) =>
					capabilities.selectSegment(
						clicked.sentenceId,
						index,
						altKey,
						anchor,
					)
				}
				onSentenceElement={(element) => {
					sentenceElement.current = element;
				}}
				onSegmentElement={(index, element) => {
					const key = segmentKey(sentence.sentenceId, index);
					if (element) segmentElements.current.set(key, element);
					else segmentElements.current.delete(key);
				}}
			/>
			{capabilities.error ? (
				<p className="mt-2 text-sm text-destructive" role="alert">
					{capabilities.error}
				</p>
			) : null}
		</div>
	);
}
