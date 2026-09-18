import { Ipa, NoteTags, NoteTitle, NoteTitleLink, NoteTitleRow } from "lego";
import { type ReactNode, useId } from "react";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { coreGender } from "../../../../../../../shared/grammatical-gender";
import type { ReadingPresentationCapabilities } from "../../../../note/capabilities";
import type { ReadingDefaultRenderer } from "../../../renderer";
import { genderTone } from "../../common/feature-values";
import { NounArticle } from "../../common/noun-article";

export const DefaultReadingHeaderRenderer = (({
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
				lemmaId: Id<"lemmas">;
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
	const gender = coreGender(lemma);
	return (
		<header>
			<NoteTitleRow>
				<NoteTitle
					id={id}
					data-reading-title=""
					data-gender={
						typeof gender === "string" ? gender : undefined
					}
					tone={genderTone(lemma)}
				>
					<span className="text-ink">
						{note.reading.emojiDescription}{" "}
					</span>
					<NounArticle
						lemma={lemma}
						lemmaId={lemma.lemmaId}
						navigation={capabilities.nounArticle}
					/>
					<NoteTitleLink
						aria-label={`${lemma.canonicalForm}, open its Lemma`}
						onClick={() =>
							capabilities.follow({
								kind: "Lemma",
								lemmaId: lemma.lemmaId,
							})
						}
					>
						{title ?? lemma.canonicalForm}
					</NoteTitleLink>
				</NoteTitle>
				{capabilities.knowledgeSettings.transcription &&
				note.knowledge.transcription ? (
					<Ipa transcription={note.knowledge.transcription} />
				) : null}
			</NoteTitleRow>
			{capabilities.nounArticle?.error ? (
				<p role="alert" className="text-sm text-destructive">
					{capabilities.nounArticle.error}
				</p>
			) : null}
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
