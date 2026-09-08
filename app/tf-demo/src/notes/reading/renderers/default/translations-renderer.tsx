import { translationLanguageValues } from "dumrel";

import type { ReadingNoteDefaultRenderer } from "../../reading-note-render-context";

export const renderDefaultReadingTranslations = (({ note, capabilities }) => {
	const translations = translationLanguageValues.flatMap((language) =>
		capabilities.knowledgeSettings.translations[language]
			? (note.knowledge.translations?.[language] ?? []).map((value) => ({
					language,
					value,
				}))
			: [],
	);
	if (translations.length === 0) return null;

	return (
		<section className="reading-note__section" aria-label="Translations">
			<h2 className="reading-note__section-label">Translations</h2>
			<div className="flex flex-wrap gap-2">
				{translations.map(({ language, value }) => (
					<span key={`${language}:${value}`} lang={language}>
						{language}: {value}
					</span>
				))}
			</div>
		</section>
	);
}) satisfies ReadingNoteDefaultRenderer;
