import { Badge } from "@/components/ui/badge";
import type { ReadingNoteDefaultRenderer } from "../../reading-note-render-context";

export const renderDefaultReadingTranslations = (({ note, capabilities }) => {
	const translations = note.knowledge.translations?.en ?? [];
	if (
		!capabilities.knowledgeSettings.translations.en ||
		translations.length === 0
	) {
		return null;
	}

	return (
		<section className="flex flex-col gap-2" aria-labelledby="translations">
			<h2 id="translations" className="text-sm font-medium">
				Translations
			</h2>
			<div className="flex flex-wrap gap-2">
				{translations.map((value) => (
					<Badge key={`en:${value}`} variant="secondary">
						en: {value}
					</Badge>
				))}
			</div>
		</section>
	);
}) satisfies ReadingNoteDefaultRenderer;
