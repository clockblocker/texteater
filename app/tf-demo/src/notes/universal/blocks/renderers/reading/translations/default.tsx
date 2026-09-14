import { translationLanguageValues } from "dumrel";
import { NoteSection } from "lego";

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
	if (translations.length === 0) return null;

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
