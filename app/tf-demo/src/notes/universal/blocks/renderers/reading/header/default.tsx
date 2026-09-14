import {
	Ipa,
	NoteTags,
	NoteTitle,
	NoteTitleRow,
	type NoteTitleTone,
} from "lego";
import { type ReactNode, useId } from "react";
import type { ReadingPresentationCapabilities } from "../../../../note/capabilities";
import type { ReadingDefaultRenderer } from "../../../renderer";

export const renderDefaultReadingHeader = (({
	noteData,
	PresentationCapabilities,
}) => (
	<ReadingHeader note={noteData} capabilities={PresentationCapabilities} />
)) satisfies ReadingDefaultRenderer;

const GENDER_TONES: Readonly<Record<string, NoteTitleTone>> = {
	Fem: "feminine",
	Masc: "masculine",
	Neut: "neuter",
};

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
	const gender = lemma.coreFeatures.gender;
	return (
		<header>
			<NoteTitleRow>
				<NoteTitle
					id={id}
					data-reading-title=""
					data-gender={
						typeof gender === "string" ? gender : undefined
					}
					tone={
						typeof gender === "string"
							? GENDER_TONES[gender]
							: undefined
					}
				>
					<span className="text-ink">
						{note.reading.emojiDescription}{" "}
					</span>
					{title ?? lemma.canonicalForm}
				</NoteTitle>
				{capabilities.knowledgeSettings.transcription &&
				note.knowledge.transcription ? (
					<Ipa transcription={note.knowledge.transcription} />
				) : null}
			</NoteTitleRow>
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
		<NoteTags>
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
		</NoteTags>
	);
}
