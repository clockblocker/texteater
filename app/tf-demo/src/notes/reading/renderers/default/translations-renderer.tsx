import { translationLanguageValues } from "dumrel";
import { Badge } from "@/components/ui/badge";
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
		<section className="flex flex-col gap-2" aria-labelledby="translations">
			<h2 id="translations" className="text-sm font-medium">
				Translations
			</h2>
			<div className="flex flex-wrap gap-2">
				{translations.map(({ language, value }) => (
					<Badge key={`${language}:${value}`} variant="secondary">
						{language}: {value}
					</Badge>
				))}
			</div>
		</section>
	);
}) satisfies ReadingNoteDefaultRenderer;
