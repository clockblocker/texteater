import type { RendererRegistry } from "../universal/blocks/renderer-registry";
import { renderEmptyBlock } from "../universal/blocks/renderers/common/empty";
import { renderReadingDefinition } from "../universal/blocks/renderers/reading/definition/default";
import { renderDefaultReadingHeader } from "../universal/blocks/renderers/reading/header/default";
import { renderDefaultReadingRelations } from "../universal/blocks/renderers/reading/relations/default";
import { renderDefaultReadingSourceContexts } from "../universal/blocks/renderers/reading/source-contexts/default";
import { renderDefaultReadingTranslations } from "../universal/blocks/renderers/reading/translations/default";
import { renderHeaderDeLexemeVerb } from "./block-renderer-overrides/reading/header/lexeme-verb";

const READING_BASE = {
	Header: renderDefaultReadingHeader,
	SourceContexts: renderDefaultReadingSourceContexts,
	Definition: renderReadingDefinition,
	Translations: renderDefaultReadingTranslations,
};
const READING_RELATIONAL = {
	...READING_BASE,
	Relations: renderDefaultReadingRelations,
};

const READING = {
	Lexeme: {
		ADJ: READING_RELATIONAL,
		ADP: READING_RELATIONAL,
		ADV: READING_RELATIONAL,
		AUX: READING_RELATIONAL,
		CCONJ: READING_RELATIONAL,
		DET: READING_RELATIONAL,
		INTJ: READING_RELATIONAL,
		NOUN: READING_RELATIONAL,
		NUM: READING_RELATIONAL,
		PART: READING_RELATIONAL,
		PRON: READING_RELATIONAL,
		PROPN: READING_RELATIONAL,
		PUNCT: READING_BASE,
		SCONJ: READING_RELATIONAL,
		SYM: READING_RELATIONAL,
		VERB: { ...READING_RELATIONAL, Header: renderHeaderDeLexemeVerb },
		X: READING_BASE,
	},
	Phraseme: {
		Aphorism: READING_RELATIONAL,
		Collocation: READING_RELATIONAL,
		DiscourseFormula: READING_RELATIONAL,
		Idiom: READING_RELATIONAL,
		Proverb: READING_RELATIONAL,
	},
	Morpheme: {
		Circumfix: READING_BASE,
		Clitic: READING_BASE,
		Duplifix: READING_BASE,
		Infix: READING_BASE,
		Interfix: READING_BASE,
		Prefix: READING_BASE,
		Root: READING_BASE,
		Suffix: READING_BASE,
		Suffixoid: READING_BASE,
		ToneMarking: READING_BASE,
		Transfix: READING_BASE,
	},
} satisfies RendererRegistry<"de", "Reading">;

const EMPTY_LEMMA_ROUTE = {
	Header: renderEmptyBlock,
	Routes: renderEmptyBlock,
};
const EMPTY_ATTESTATION_ROUTE = {
	Header: renderEmptyBlock,
	Routes: renderEmptyBlock,
};
const EMPTY_SHADOW_ROUTE = {
	Header: renderEmptyBlock,
	Relations: renderEmptyBlock,
};

const LEMMA = {
	Lexeme: {
		ADJ: EMPTY_LEMMA_ROUTE,
		ADP: EMPTY_LEMMA_ROUTE,
		ADV: EMPTY_LEMMA_ROUTE,
		AUX: EMPTY_LEMMA_ROUTE,
		CCONJ: EMPTY_LEMMA_ROUTE,
		DET: EMPTY_LEMMA_ROUTE,
		INTJ: EMPTY_LEMMA_ROUTE,
		NOUN: EMPTY_LEMMA_ROUTE,
		NUM: EMPTY_LEMMA_ROUTE,
		PART: EMPTY_LEMMA_ROUTE,
		PRON: EMPTY_LEMMA_ROUTE,
		PROPN: EMPTY_LEMMA_ROUTE,
		PUNCT: EMPTY_LEMMA_ROUTE,
		SCONJ: EMPTY_LEMMA_ROUTE,
		SYM: EMPTY_LEMMA_ROUTE,
		VERB: EMPTY_LEMMA_ROUTE,
		X: EMPTY_LEMMA_ROUTE,
	},
	Phraseme: {
		Aphorism: EMPTY_LEMMA_ROUTE,
		Collocation: EMPTY_LEMMA_ROUTE,
		DiscourseFormula: EMPTY_LEMMA_ROUTE,
		Idiom: EMPTY_LEMMA_ROUTE,
		Proverb: EMPTY_LEMMA_ROUTE,
	},
	Morpheme: {
		Circumfix: EMPTY_LEMMA_ROUTE,
		Clitic: EMPTY_LEMMA_ROUTE,
		Duplifix: EMPTY_LEMMA_ROUTE,
		Infix: EMPTY_LEMMA_ROUTE,
		Interfix: EMPTY_LEMMA_ROUTE,
		Prefix: EMPTY_LEMMA_ROUTE,
		Root: EMPTY_LEMMA_ROUTE,
		Suffix: EMPTY_LEMMA_ROUTE,
		Suffixoid: EMPTY_LEMMA_ROUTE,
		ToneMarking: EMPTY_LEMMA_ROUTE,
		Transfix: EMPTY_LEMMA_ROUTE,
	},
} satisfies RendererRegistry<"de", "Lemma">;
const ATTESTATION = {
	Lexeme: {
		ADJ: EMPTY_ATTESTATION_ROUTE,
		ADP: EMPTY_ATTESTATION_ROUTE,
		ADV: EMPTY_ATTESTATION_ROUTE,
		AUX: EMPTY_ATTESTATION_ROUTE,
		CCONJ: EMPTY_ATTESTATION_ROUTE,
		DET: EMPTY_ATTESTATION_ROUTE,
		INTJ: EMPTY_ATTESTATION_ROUTE,
		NOUN: EMPTY_ATTESTATION_ROUTE,
		NUM: EMPTY_ATTESTATION_ROUTE,
		PART: EMPTY_ATTESTATION_ROUTE,
		PRON: EMPTY_ATTESTATION_ROUTE,
		PROPN: EMPTY_ATTESTATION_ROUTE,
		PUNCT: EMPTY_ATTESTATION_ROUTE,
		SCONJ: EMPTY_ATTESTATION_ROUTE,
		SYM: EMPTY_ATTESTATION_ROUTE,
		VERB: EMPTY_ATTESTATION_ROUTE,
		X: EMPTY_ATTESTATION_ROUTE,
	},
	Phraseme: {
		Aphorism: EMPTY_ATTESTATION_ROUTE,
		Collocation: EMPTY_ATTESTATION_ROUTE,
		DiscourseFormula: EMPTY_ATTESTATION_ROUTE,
		Idiom: EMPTY_ATTESTATION_ROUTE,
		Proverb: EMPTY_ATTESTATION_ROUTE,
	},
	Morpheme: {
		Circumfix: EMPTY_ATTESTATION_ROUTE,
		Clitic: EMPTY_ATTESTATION_ROUTE,
		Duplifix: EMPTY_ATTESTATION_ROUTE,
		Infix: EMPTY_ATTESTATION_ROUTE,
		Interfix: EMPTY_ATTESTATION_ROUTE,
		Prefix: EMPTY_ATTESTATION_ROUTE,
		Root: EMPTY_ATTESTATION_ROUTE,
		Suffix: EMPTY_ATTESTATION_ROUTE,
		Suffixoid: EMPTY_ATTESTATION_ROUTE,
		ToneMarking: EMPTY_ATTESTATION_ROUTE,
		Transfix: EMPTY_ATTESTATION_ROUTE,
	},
} satisfies RendererRegistry<"de", "Attestation">;
const SHADOW = {
	Lexeme: {
		ADJ: EMPTY_SHADOW_ROUTE,
		ADP: EMPTY_SHADOW_ROUTE,
		ADV: EMPTY_SHADOW_ROUTE,
		AUX: EMPTY_SHADOW_ROUTE,
		CCONJ: EMPTY_SHADOW_ROUTE,
		DET: EMPTY_SHADOW_ROUTE,
		INTJ: EMPTY_SHADOW_ROUTE,
		NOUN: EMPTY_SHADOW_ROUTE,
		NUM: EMPTY_SHADOW_ROUTE,
		PART: EMPTY_SHADOW_ROUTE,
		PRON: EMPTY_SHADOW_ROUTE,
		PROPN: EMPTY_SHADOW_ROUTE,
		PUNCT: EMPTY_SHADOW_ROUTE,
		SCONJ: EMPTY_SHADOW_ROUTE,
		SYM: EMPTY_SHADOW_ROUTE,
		VERB: EMPTY_SHADOW_ROUTE,
		X: EMPTY_SHADOW_ROUTE,
	},
	Phraseme: {
		Aphorism: EMPTY_SHADOW_ROUTE,
		Collocation: EMPTY_SHADOW_ROUTE,
		DiscourseFormula: EMPTY_SHADOW_ROUTE,
		Idiom: EMPTY_SHADOW_ROUTE,
		Proverb: EMPTY_SHADOW_ROUTE,
	},
	Morpheme: {
		Circumfix: EMPTY_SHADOW_ROUTE,
		Clitic: EMPTY_SHADOW_ROUTE,
		Duplifix: EMPTY_SHADOW_ROUTE,
		Infix: EMPTY_SHADOW_ROUTE,
		Interfix: EMPTY_SHADOW_ROUTE,
		Prefix: EMPTY_SHADOW_ROUTE,
		Root: EMPTY_SHADOW_ROUTE,
		Suffix: EMPTY_SHADOW_ROUTE,
		Suffixoid: EMPTY_SHADOW_ROUTE,
		ToneMarking: EMPTY_SHADOW_ROUTE,
		Transfix: EMPTY_SHADOW_ROUTE,
	},
} satisfies RendererRegistry<"de", "Shadow">;
const SURFACE = {
	Header: renderEmptyBlock,
	Routes: renderEmptyBlock,
} satisfies RendererRegistry<"de", "Surface">;

export const DE_RENDERER_REGISTRY = {
	Reading: READING,
	Lemma: LEMMA,
	Surface: SURFACE,
	Attestation: ATTESTATION,
	Shadow: SHADOW,
} satisfies RendererRegistry<"de">;
