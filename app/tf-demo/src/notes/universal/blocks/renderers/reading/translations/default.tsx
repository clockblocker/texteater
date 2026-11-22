import { translationLanguageValues, translationText } from "dumrel";
import type * as Dumrel from "dumrel/types";
import {
	NoteBone,
	NoteSection,
	NoteTranslationList,
	NoteTranslationRow,
} from "lego";
import { Fragment, type ReactNode } from "react";

import type { ReadingDefaultRenderer } from "../../../renderer";
import { ValencyPreposition, ValencySlot } from "../../../valency-pieces";

type TranslationLanguage = (typeof translationLanguageValues)[number];

/**
 * Renders a Reading's translations using one shared molecule across Card and
 * Sheet forms: grouped uppercase `EN`/`RU` rows separated by `·`. Space-aware
 * single-line tightening in Card is expressed declaratively on
 * `NoteTranslationList`, with no forked Card/Sheet DOM trees.
 */
export const renderDefaultReadingTranslations = (({
	noteData,
	PresentationCapabilities,
}) => {
	const enabled = translationLanguageValues.filter(
		(language) =>
			PresentationCapabilities.knowledgeSettings.translations[language],
	);
	const rows = enabled.flatMap((language) => {
		const values = noteData.knowledge.translations?.[language] ?? [];
		return values.length > 0 ? [{ language, values }] : [];
	});
	const generating =
		noteData.knowledge.translations === undefined &&
		noteData.knowledgeState.activity === "Loading";
	if (rows.length === 0 && (!generating || enabled.length === 0)) return null;

	if (rows.length === 0) {
		// Translations are being generated: hold their rows so the block does
		// not appear from nowhere once they land.
		return (
			<NoteSection label="Translations" aria-busy="true">
				<NoteTranslationList>
					{enabled.map((language) => (
						<NoteTranslationRow key={language} language={language}>
							<NoteBone className={boneWidth(language)} />
						</NoteTranslationRow>
					))}
				</NoteTranslationList>
			</NoteSection>
		);
	}

	return (
		<NoteSection label="Translations">
			<NoteTranslationList>
				{rows.map(({ language, values }) => (
					<NoteTranslationRow key={language} language={language}>
						{values.map((value, index) => (
							<Fragment key={translationText(value)}>
								{index > 0 ? (
									<span className="text-ink-faint">
										{" · "}
									</span>
								) : null}
								<TranslationPieces translation={value} />
							</Fragment>
						))}
					</NoteTranslationRow>
				))}
			</NoteTranslationList>
		</NoteSection>
	);
}) satisfies ReadingDefaultRenderer;

function boneWidth(language: TranslationLanguage): string {
	return language === "en" ? "w-16" : "w-20";
}

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
			return <ValencySlot variant="gloss">{text}</ValencySlot>;
	}
}
