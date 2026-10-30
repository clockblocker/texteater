import { translationLanguageValues, translationText } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { NoteBone, NoteSection } from "lego";
import { Fragment, type ReactNode } from "react";

import type { ReadingDefaultRenderer } from "../../../renderer";
import { ValencyPreposition, ValencySlot } from "../../../valency-pieces";

export const renderDefaultReadingTranslations = (({
	noteData,
	PresentationCapabilities,
}) => {
	const translations = translationLanguageValues.flatMap((language) =>
		PresentationCapabilities.knowledgeSettings.translations[language]
			? (noteData.knowledge.translations?.[language] ?? []).map(
					(value) => ({
						language,
						value,
					}),
				)
			: [],
	);
	const enabled = translationLanguageValues.filter(
		(language) =>
			PresentationCapabilities.knowledgeSettings.translations[language],
	);
	const generating =
		noteData.knowledge.translations === undefined &&
		noteData.knowledgeState.activity === "Loading";
	if (translations.length === 0 && (!generating || enabled.length === 0))
		return null;

	if (translations.length === 0) {
		// Translations are being generated: hold their row so the block does
		// not appear from nowhere once they land.
		return (
			<NoteSection
				aria-label="Translations"
				label="Translations"
				aria-busy="true"
			>
				<div className="flex flex-wrap gap-2">
					{enabled.map((language) => (
						<span key={language} className="inline-flex gap-1">
							<span className="text-ink-muted">{language}:</span>
							<NoteBone
								className={language === "en" ? "w-16" : "w-20"}
							/>
						</span>
					))}
				</div>
			</NoteSection>
		);
	}

	return (
		<NoteSection aria-label="Translations" label="Translations">
			<div className="flex flex-wrap gap-2">
				{translations.map(({ language, value }) => (
					<span
						key={`${language}:${translationText(value)}`}
						lang={language}
					>
						{language}: <TranslationPieces translation={value} />
					</span>
				))}
			</div>
		</NoteSection>
	);
}) satisfies ReadingDefaultRenderer;

/**
 * A Translation's pieces, a space apart: its Preposition and Slot in the
 * styles the German Valency Line prints its own in, its Text plain
 * (ADR 0055).
 */
function TranslationPieces({
	translation,
}: {
	readonly translation: Dumrel.Translation;
}) {
	return translation.map((piece, index) => (
		<Fragment key={`${index}:${piece.kind}`}>
			{index > 0 ? " " : null}
			{renderPiece(piece)}
		</Fragment>
	));
}

function renderPiece({ kind, text }: Dumrel.TranslationPiece): ReactNode {
	switch (kind) {
		case "Text":
			return text;
		case "Preposition":
			return <ValencyPreposition>{text}</ValencyPreposition>;
		case "Slot":
			return <ValencySlot>{text}</ValencySlot>;
	}
}
