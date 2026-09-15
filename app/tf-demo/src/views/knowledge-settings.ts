import type * as Dumrel from "dumrel/types";
import type { KnowledgePreferences } from "../../shared/knowledge-preferences";

export type KnowledgeSettingPath =
	| "transcription"
	| "definition"
	| `translations.${Dumrel.TranslationLanguage}`
	| "morphologicalTree"
	| "lexicalBreakdown"
	| `semanticRelations.${Dumrel.DirectSemanticRelation}`;

export function withKnowledgeSetting(
	settings: KnowledgePreferences,
	path: KnowledgeSettingPath,
	enabled: boolean,
): KnowledgePreferences {
	if (path === "transcription" || path === "definition") {
		return { ...settings, [path]: enabled };
	}
	if (path.startsWith("translations.")) {
		const language = path.slice(
			"translations.".length,
		) as Dumrel.TranslationLanguage;
		return {
			...settings,
			translations: { ...settings.translations, [language]: enabled },
		};
	}
	if (path === "morphologicalTree" || path === "lexicalBreakdown") {
		return { ...settings, [path]: enabled };
	}
	const relation = path.slice(
		"semanticRelations.".length,
	) as Dumrel.DirectSemanticRelation;
	return {
		...settings,
		semanticRelations: {
			...settings.semanticRelations,
			[relation]: enabled,
		},
	};
}

export function knowledgeSettingValue(
	settings: KnowledgePreferences,
	path: KnowledgeSettingPath,
): boolean {
	if (path.startsWith("translations.")) {
		const language = path.slice(
			"translations.".length,
		) as Dumrel.TranslationLanguage;
		return settings.translations[language];
	}
	if (path.startsWith("semanticRelations.")) {
		const relation = path.slice(
			"semanticRelations.".length,
		) as Dumrel.DirectSemanticRelation;
		return settings.semanticRelations[relation];
	}
	switch (path) {
		case "transcription":
			return settings.transcription;
		case "definition":
			return settings.definition;
		case "morphologicalTree":
			return settings.morphologicalTree;
		case "lexicalBreakdown":
			return settings.lexicalBreakdown;
	}
	throw new Error(`Unsupported Knowledge setting: ${path}`);
}
