import { translationLanguageValues, translationText } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { NoteBone, NoteSection, noteLabelClassName } from "lego";
import { Fragment, type ReactNode } from "react";

import type { ReadingDefaultRenderer } from "../../../renderer";
import { ValencyPreposition, ValencySlot } from "../../../valency-pieces";

type TranslationLanguage = (typeof translationLanguageValues)[number];

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
	const card = PresentationCapabilities.presentation === "Card";

	if (rows.length === 0) {
		// Translations are being generated: hold their rows so the block does
		// not appear from nowhere once they land.
		return (
			<NoteSection
				aria-label="Translations"
				label="Translations"
				aria-busy="true"
			>
				{card ? (
					<div className="flex flex-wrap gap-2">
						{enabled.map((language) => (
							<span key={language} className="inline-flex gap-1">
								<span className="text-ink-muted">
									{language}:
								</span>
								<NoteBone className={boneWidth(language)} />
							</span>
						))}
					</div>
				) : (
					<TranslationRows>
						{enabled.map((language) => (
							<TranslationRow key={language} language={language}>
								<NoteBone className={boneWidth(language)} />
							</TranslationRow>
						))}
					</TranslationRows>
				)}
			</NoteSection>
		);
	}

	return (
		<NoteSection aria-label="Translations" label="Translations">
			{card ? (
				<div className="flex flex-wrap gap-2">
					{rows.flatMap(({ language, values }) =>
						values.map((value) => (
							<span
								key={`${language}:${translationText(value)}`}
								lang={language}
							>
								{language}:{" "}
								<TranslationPieces translation={value} />
							</span>
						)),
					)}
				</div>
			) : (
				<TranslationRows>
					{rows.map(({ language, values }) => (
						<TranslationRow key={language} language={language}>
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
						</TranslationRow>
					))}
				</TranslationRows>
			)}
		</NoteSection>
	);
}) satisfies ReadingDefaultRenderer;

function boneWidth(language: TranslationLanguage): string {
	return language === "en" ? "w-16" : "w-20";
}

/**
 * A Sheet's translations: one row per language. The language's tag sits on
 * the Note's leading edge, and its translations start 1.75rem in, where a
 * quoted passage and a relation's word do.
 */
function TranslationRows({ children }: { readonly children: ReactNode }) {
	return (
		<dl className="grid grid-cols-[minmax(1.75rem,auto)_minmax(0,1fr)] items-baseline gap-y-1">
			{children}
		</dl>
	);
}

function TranslationRow({
	language,
	children,
}: {
	readonly language: TranslationLanguage;
	readonly children: ReactNode;
}) {
	return (
		<div className="contents">
			<dt className={noteLabelClassName}>{language}</dt>
			<dd lang={language} className="text-pretty">
				{children}
			</dd>
		</div>
	);
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
			return <ValencySlot>{text}</ValencySlot>;
	}
}
