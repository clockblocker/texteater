import { type ReactNode, useId } from "react";
import type { ReadingPresentationCapabilities } from "../../../../note/capabilities";
import type { ReadingDefaultRenderer } from "../../../renderer";
import { Ipa } from "../../common/ipa";

export const renderDefaultReadingHeader = (({
	noteData,
	PresentationCapabilities,
}) => (
	<ReadingHeader note={noteData} capabilities={PresentationCapabilities} />
)) satisfies ReadingDefaultRenderer;

export function ReadingHeader({
	note,
	capabilities,
	title,
}: {
	note: {
		reading: {
			emojiDescription: string;
			lemma: {
				canonicalForm: string;
				language: string;
				family: string;
				kind: string;
				coreFeatures: Readonly<Record<string, unknown>>;
			};
		};
		knowledge: { transcription?: string | null };
	};
	capabilities: ReadingPresentationCapabilities;
	title?: ReactNode;
}) {
	const id = useId();
	const { lemma } = note.reading;
	return (
		<header className="reading-note__header">
			<div className="reading-note__title-row">
				<h1
					id={id}
					data-reading-title=""
					data-gender={
						typeof lemma.coreFeatures.gender === "string"
							? lemma.coreFeatures.gender
							: undefined
					}
				>
					<span className="reading-note__emoji">
						{note.reading.emojiDescription}{" "}
					</span>
					{title ?? lemma.canonicalForm}
				</h1>
				{capabilities.knowledgeSettings.transcription &&
				note.knowledge.transcription ? (
					<Ipa transcription={note.knowledge.transcription} />
				) : null}
			</div>
		</header>
	);
}

export function ReadingMetadata({
	lemma,
}: {
	lemma: {
		language: string;
		family: string;
		kind: string;
		coreFeatures: Readonly<Record<string, unknown>>;
	};
}) {
	return (
		<footer className="reading-note__tags">
			<span>{lemma.language}</span>
			<span>{lemma.family}</span>
			<span>{lemma.kind}</span>
			{Object.entries(lemma.coreFeatures).flatMap(([name, value]) =>
				value == null
					? []
					: [
							<span key={name}>
								{name}: {String(value)}
							</span>,
						],
			)}
		</footer>
	);
}
