import { translationLanguageValues } from "dumrel";
import { NoteBone, NoteSection } from "lego";

import type { ReadingDefaultRenderer } from "../../../renderer";

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
					<span key={`${language}:${value}`} lang={language}>
						{language}: {value}
					</span>
				))}
			</div>
		</NoteSection>
	);
}) satisfies ReadingDefaultRenderer;
