import type { SupportedLanguage } from "dumling/types";
import { DE_REL_MAP } from "./applicability/de.js";
import type { RelMap } from "./applicability/types.js";
import {
	ParsingError,
	parseAsKnowledgeRequestMask,
	parseAsKnowledgeSettings,
	parseReadingReferenceForApplicability,
	unwrapDumrelParse,
} from "./parsing/lightweight-parsers.js";
import type {
	KnowledgeRequestMask,
	KnowledgeSettings,
	ReadingReference,
} from "./types.js";
import {
	semanticRelationValues,
	translationLanguageValues,
} from "./vocabulary.js";

export { DEFAULT_KNOWLEDGE_SETTINGS } from "./settings.js";

const relationMaps = {
	de: DE_REL_MAP,
	en: undefined,
	he: undefined,
} satisfies {
	[Language in SupportedLanguage]: RelMap<Language> | undefined;
};

type RuntimeRelMap = Record<string, Record<string, KnowledgeRequestMask>>;

export function defaultKnowledgeRequestMask(
	reading: ReadingReference,
): KnowledgeRequestMask | undefined {
	const parsed = parseReadingReference(reading);
	const language = parsed.lemma.language;
	const configured = relationMaps[language];
	if (configured === undefined) return undefined;

	const runtimeMap = configured as unknown as RuntimeRelMap;
	const mask = runtimeMap[parsed.lemma.family]?.[parsed.lemma.kind];
	if (mask === undefined) {
		throw new Error(
			`No Knowledge applicability for ${language}/${parsed.lemma.family}/${parsed.lemma.kind}.`,
		);
	}
	return unwrapDumrelParse(parseAsKnowledgeRequestMask(mask));
}

export function intersectKnowledgeRequestMask(
	applicable: KnowledgeRequestMask,
	settings: KnowledgeSettings,
): KnowledgeRequestMask {
	const parsedMask = unwrapDumrelParse(
		parseAsKnowledgeRequestMask(applicable),
	);
	const parsedSettings = unwrapDumrelParse(
		parseAsKnowledgeSettings(settings),
	);
	const result: {
		transcription?: null;
		definition?: null;
		translations?: Partial<
			Record<(typeof translationLanguageValues)[number], null>
		>;
		morphologicalTree?: null;
		lexicalBreakdown?: null;
		semanticRelations?: Partial<
			Record<(typeof semanticRelationValues)[number], null>
		>;
	} = {};

	if (parsedMask.transcription === null && parsedSettings.transcription) {
		result.transcription = null;
	}
	if (parsedMask.definition === null && parsedSettings.definition) {
		result.definition = null;
	}
	const translations: Partial<
		Record<(typeof translationLanguageValues)[number], null>
	> = {};
	for (const language of translationLanguageValues) {
		if (
			parsedMask.translations?.[language] === null &&
			parsedSettings.translations[language]
		) {
			translations[language] = null;
		}
	}
	if (Object.keys(translations).length > 0)
		result.translations = translations;
	if (
		parsedMask.morphologicalTree === null &&
		parsedSettings.morphologicalTree
	) {
		result.morphologicalTree = null;
	}
	if (
		parsedMask.lexicalBreakdown === null &&
		parsedSettings.lexicalBreakdown
	) {
		result.lexicalBreakdown = null;
	}

	const relations: Partial<
		Record<(typeof semanticRelationValues)[number], null>
	> = {};
	for (const relation of semanticRelationValues) {
		if (
			parsedMask.semanticRelations?.[relation] === null &&
			parsedSettings.semanticRelations[relation]
		) {
			relations[relation] = null;
		}
	}
	if (Object.keys(relations).length > 0) result.semanticRelations = relations;

	return unwrapDumrelParse(parseAsKnowledgeRequestMask(result));
}

function parseReadingReference(reading: ReadingReference): ReadingReference {
	const parsed = parseReadingReferenceForApplicability(reading);
	if (parsed instanceof ParsingError) throw parsed;
	return parsed;
}
