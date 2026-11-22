import {
	cn,
	Ipa,
	NoteBone,
	NoteTags,
	NoteTitle,
	NoteTitleLink,
	NoteTitleRow,
} from "lego";
import { type ReactNode, useId } from "react";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { coreGender } from "../../../../../../../shared/grammatical-gender";
import { formatLemmaMetadata } from "../../../../caption/metadata";
import type { ReadingPresentationCapabilities } from "../../../../note/capabilities";
import type { ReadingNotePending } from "../../../../note/data";
import {
	type CitationPart,
	citationText,
	citedNoteReading,
} from "../../../citation";
import type { ReadingDefaultRenderer } from "../../../renderer";
import { genderTone } from "../../common/feature-values";

export const DefaultReadingHeadingRenderer = (({
	noteData,
	PresentationCapabilities,
	Citation,
}) => (
	<ReadingHeading
		note={noteData}
		capabilities={PresentationCapabilities}
		citation={Citation(citedNoteReading(noteData))}
	/>
)) satisfies ReadingDefaultRenderer;

/**
 * A Reading Note's title: its emoji and its Citation (ADR 0052), which a
 * route may set as its own `title`, as a separable verb marks its prefix.
 */
export function ReadingHeading({
	note,
	capabilities,
	citation,
	title,
}: {
	note: {
		reading: {
			emojiDescription: string;
			lemma: {
				lemmaId: Id<"lemmas">;
				canonicalForm: string;
				language: string;
				family: string;
				kind: string;
				coreFeatures: Readonly<Record<string, unknown>>;
			};
		};
		knowledge: { transcription?: string | null };
		pending?: ReadingNotePending;
	};
	capabilities: ReadingPresentationCapabilities;
	citation: readonly CitationPart[];
	title?: ReactNode;
}) {
	const id = useId();
	const { lemma } = note.reading;
	const gender = coreGender(lemma);
	const pending = note.pending;
	const cited = citationText(citation);
	const headword = title ?? cited;
	return (
		<header>
			<NoteTitleRow>
				<NoteTitle
					id={id}
					data-reading-title=""
					data-gender={
						typeof gender === "string" ? gender : undefined
					}
					lang={lemma.language}
					tone={genderTone(lemma)}
				>
					{pending?.emojiDescription ? (
						<NoteBone
							aria-label="Loading icon"
							className="me-[0.35em] h-[0.9em] w-[1em] rounded-[0.3em]"
						/>
					) : (
						<span
							aria-hidden="true"
							className={cn(
								"me-[0.38em] inline-flex shrink-0 items-center text-[0.88em] leading-none translate-y-[-0.03em] text-ink",
								pending?.emojiArrived && "note-arrival",
							)}
						>
							{note.reading.emojiDescription}
						</span>
					)}
					{pending?.headword ? (
						<ResolvingHeadword {...pending.headword} />
					) : pending ? (
						<span
							data-reading-headword=""
							className={
								pending.headwordArrived
									? "note-arrival"
									: undefined
							}
						>
							{headword}
						</span>
					) : (
						<NoteTitleLink
							aria-label={`${cited}, open its Lemma`}
							onClick={() =>
								capabilities.follow({
									kind: "Lemma",
									lemmaId: lemma.lemmaId,
								})
							}
						>
							{headword}
						</NoteTitleLink>
					)}
				</NoteTitle>
				{capabilities.knowledgeSettings.transcription &&
				note.knowledge.transcription ? (
					<Ipa transcription={note.knowledge.transcription} />
				) : null}
			</NoteTitleRow>
		</header>
	);
}

/**
 * The words a click selected, standing in for the headword until Grammar
 * gives it: swept by the same band of light as the clicked word in the
 * reader while they resolve, and a bone before they are known.
 */
function ResolvingHeadword({
	words,
	resolving,
}: {
	readonly words: string | null;
	readonly resolving: boolean;
}) {
	if (words === null)
		return (
			<NoteBone
				tone="headword"
				aria-label="Loading headword"
				className="h-[0.8em] w-28"
			/>
		);
	return (
		<span
			data-reading-headword=""
			data-resolving={resolving || undefined}
			className={
				resolving
					? "word-sheen bg-ink bg-clip-text text-transparent motion-reduce:animate-none motion-reduce:bg-none motion-reduce:text-word-resolving"
					: undefined
			}
		>
			{words}
		</span>
	);
}

/**
 * The Heading of a Reading Note before a route lays it out, or once its
 * Session failed: the clicked words, behind the emoji's bone while they
 * resolve.
 */
export function ResolvingReadingHeading({
	words,
	resolving,
}: {
	readonly words: string | null;
	readonly resolving: boolean;
}) {
	return (
		<header>
			<NoteTitleRow>
				<NoteTitle data-reading-title="">
					{resolving ? (
						<NoteBone
							aria-label="Loading icon"
							className="me-[0.35em] h-[0.9em] w-[1em] rounded-[0.3em]"
						/>
					) : null}
					<ResolvingHeadword words={words} resolving={resolving} />
				</NoteTitle>
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
			{formatLemmaMetadata(lemma).map((item) => (
				<span key={item}>{item}</span>
			))}
		</NoteTags>
	);
}
