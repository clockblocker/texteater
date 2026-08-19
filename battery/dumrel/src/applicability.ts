import type { SupportedLanguage } from "dumling/types";
import { DE_REL_MAP } from "./applicability/de.js";
import { deepFreeze } from "./applicability/deep-freeze.js";
import type { RelMap } from "./applicability/types.js";
import {
	knowledgeRequestMaskSchema,
	knowledgeSettingsSchema,
	readingReferenceSchema,
} from "./schema.js";
import type {
	KnowledgeRequestMask,
	KnowledgeSettings,
	ReadingReference,
} from "./types.js";
import { semanticRelationValues } from "./vocabulary.js";

const relationMaps = {
	de: DE_REL_MAP,
	en: undefined,
	he: undefined,
} satisfies {
	[Language in SupportedLanguage]: RelMap<Language> | undefined;
};

export const DEFAULT_KNOWLEDGE_SETTINGS: KnowledgeSettings = deepFreeze(
	knowledgeSettingsSchema.parse({
		transcription: true,
		definition: true,
		translations: { en: true },
		morphologicalTree: true,
		lexicalBreakdown: true,
		semanticRelations: {
			synonym: true,
			nearSynonym: true,
			antonym: true,
			hypernym: true,
			hyponym: true,
			meronym: true,
			holonym: true,
		},
	}),
);

type RuntimeRelMap = Record<string, Record<string, KnowledgeRequestMask>>;

export function defaultKnowledgeRequestMask(
	reading: ReadingReference,
): KnowledgeRequestMask | undefined {
	const parsed = readingReferenceSchema.parse(reading);
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
	return knowledgeRequestMaskSchema.parse(mask);
}

export function intersectKnowledgeRequestMask(
	applicable: KnowledgeRequestMask,
	settings: KnowledgeSettings,
): KnowledgeRequestMask {
	const parsedMask = knowledgeRequestMaskSchema.parse(applicable);
	const parsedSettings = knowledgeSettingsSchema.parse(settings);
	const result: {
		transcription?: null;
		definition?: null;
		translations?: { en: null };
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
	if (
		parsedMask.translations?.en === null &&
		parsedSettings.translations.en
	) {
		result.translations = { en: null };
	}
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

	return knowledgeRequestMaskSchema.parse(result);
}
