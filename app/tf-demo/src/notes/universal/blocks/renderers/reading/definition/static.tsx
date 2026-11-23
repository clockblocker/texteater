import { NoteLinesSkeleton, NoteProse, NoteSection } from "lego";

import { ReaderSentence } from "@/views/reader-sentence";
import type { DefinitionCapabilities } from "../../../../note/capabilities";
import type { ReadingDefaultRenderer } from "../../../renderer";

type DefinitionText =
	Parameters<ReadingDefaultRenderer>[0]["noteData"]["definitionText"];

/**
 * The Reading's definition. When `definition` selection capability is present
 * (Sheet), it reads like a Sentence whose words select like the reader's;
 * otherwise it renders bare prose through the exact same `NoteProse` molecule.
 */
export const renderReadingDefinition = (({
	noteData,
	PresentationCapabilities,
}) => {
	const { knowledgeSettings, definition } = PresentationCapabilities;
	if (!knowledgeSettings.definition) return null;
	const language = noteData.reading.lemma.language;
	const text = noteData.knowledge.definition;
	const definitionText: DefinitionText | undefined = noteData.definitionText;
	const generating =
		text === undefined && noteData.knowledgeState.activity === "Loading";
	if (text === undefined && !generating) return null;

	if (generating || definitionText?.state === "Pending") {
		return (
			<NoteSection label="Definition" aria-busy="true">
				<NoteLinesSkeleton
					className="max-w-[36rem]"
					widths={["w-full", "w-11/12", "w-1/2"]}
				/>
			</NoteSection>
		);
	}

	if (definitionText?.state === "Failed") {
		return (
			<NoteSection label="Definition">
				<div
					className="rounded-lg border border-destructive/40 px-2 py-1"
					role="alert"
				>
					<NoteProse as="div" lang={language} dir="auto">
						{text}
					</NoteProse>
					<p className="mt-1 text-sm text-destructive">
						{definitionText.failureMessage ??
							"This definition could not be segmented."}
					</p>
				</div>
			</NoteSection>
		);
	}

	if (definitionText?.state === "Ready" && definition) {
		return (
			<NoteSection label="Definition">
				<DefinitionSentence
					sentence={definitionText.sentence}
					language={language}
					capabilities={definition}
				/>
			</NoteSection>
		);
	}

	return (
		<NoteSection label="Definition">
			<NoteProse as="div" lang={language} dir="auto">
				{text}
			</NoteProse>
		</NoteSection>
	);
}) satisfies ReadingDefaultRenderer;

function DefinitionSentence({
	sentence,
	language,
	capabilities,
}: {
	readonly sentence: Extract<DefinitionText, { state: "Ready" }>["sentence"];
	readonly language: string;
	readonly capabilities: DefinitionCapabilities;
}) {
	return (
		<NoteProse
			as="div"
			data-slot="definition-sentence"
			lang={language}
			dir="auto"
		>
			<ReaderSentence
				sentence={sentence}
				className="text-reader__sentence"
				selectedSegmentKey={capabilities.selectedSegmentKey}
				onSegmentClick={(clicked, index, anchor) =>
					capabilities.selectSegment(
						clicked.sentenceId,
						index,
						anchor,
					)
				}
			/>
			{capabilities.error ? (
				<p className="mt-2 text-sm text-destructive" role="alert">
					{capabilities.error}
				</p>
			) : null}
		</NoteProse>
	);
}
