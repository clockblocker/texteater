import type { RendererRegistry } from "../universal/blocks/renderer-registry";
import { renderDefaultAttestationHeader } from "../universal/blocks/renderers/attestation/header/default";
import { renderDefaultAttestationRoutes } from "../universal/blocks/renderers/attestation/routes/default";
import { renderDefaultAttestationSource } from "../universal/blocks/renderers/attestation/source-contexts/default";
import { renderDefaultLemmaHeader } from "../universal/blocks/renderers/lemma/header/default";
import { renderDefaultLemmaRoutes } from "../universal/blocks/renderers/lemma/routes/default";
import { renderReadingDefinition } from "../universal/blocks/renderers/reading/definition/default";
import { renderDefaultReadingHeader } from "../universal/blocks/renderers/reading/header/default";
import { renderDefaultReadingRelations } from "../universal/blocks/renderers/reading/relations/default";
import { renderDefaultReadingSourceContexts } from "../universal/blocks/renderers/reading/source-contexts/default";
import { renderDefaultReadingTranslations } from "../universal/blocks/renderers/reading/translations/default";
import { renderDefaultShadowHeader } from "../universal/blocks/renderers/shadow/header/default";
import { renderDefaultShadowRelations } from "../universal/blocks/renderers/shadow/relations/default";
import { renderDefaultSurfaceHeader } from "../universal/blocks/renderers/surface/header/default";
import { renderDefaultSurfaceRoutes } from "../universal/blocks/renderers/surface/routes/default";
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
		Transfix: READING_BASE,
	},
} satisfies RendererRegistry<"de", "Reading">;

const LEMMA_ROUTE = {
	Header: renderDefaultLemmaHeader,
	Routes: renderDefaultLemmaRoutes,
};
const ATTESTATION_ROUTE = {
	Header: renderDefaultAttestationHeader,
	SourceContexts: renderDefaultAttestationSource,
	Routes: renderDefaultAttestationRoutes,
};
const SHADOW_ROUTE = {
	Header: renderDefaultShadowHeader,
	Relations: renderDefaultShadowRelations,
};

const LEMMA = {
	Lexeme: {
		ADJ: LEMMA_ROUTE,
		ADP: LEMMA_ROUTE,
		ADV: LEMMA_ROUTE,
		AUX: LEMMA_ROUTE,
		CCONJ: LEMMA_ROUTE,
		DET: LEMMA_ROUTE,
		INTJ: LEMMA_ROUTE,
		NOUN: LEMMA_ROUTE,
		NUM: LEMMA_ROUTE,
		PART: LEMMA_ROUTE,
		PRON: LEMMA_ROUTE,
		PROPN: LEMMA_ROUTE,
		PUNCT: LEMMA_ROUTE,
		SCONJ: LEMMA_ROUTE,
		SYM: LEMMA_ROUTE,
		VERB: LEMMA_ROUTE,
		X: LEMMA_ROUTE,
	},
	Phraseme: {
		Aphorism: LEMMA_ROUTE,
		Collocation: LEMMA_ROUTE,
		DiscourseFormula: LEMMA_ROUTE,
		Idiom: LEMMA_ROUTE,
		Proverb: LEMMA_ROUTE,
	},
	Morpheme: {
		Circumfix: LEMMA_ROUTE,
		Clitic: LEMMA_ROUTE,
		Duplifix: LEMMA_ROUTE,
		Infix: LEMMA_ROUTE,
		Interfix: LEMMA_ROUTE,
		Prefix: LEMMA_ROUTE,
		Root: LEMMA_ROUTE,
		Suffix: LEMMA_ROUTE,
		Suffixoid: LEMMA_ROUTE,
		Transfix: LEMMA_ROUTE,
	},
} satisfies RendererRegistry<"de", "Lemma">;
const ATTESTATION = {
	Lexeme: {
		ADJ: ATTESTATION_ROUTE,
		ADP: ATTESTATION_ROUTE,
		ADV: ATTESTATION_ROUTE,
		AUX: ATTESTATION_ROUTE,
		CCONJ: ATTESTATION_ROUTE,
		DET: ATTESTATION_ROUTE,
		INTJ: ATTESTATION_ROUTE,
		NOUN: ATTESTATION_ROUTE,
		NUM: ATTESTATION_ROUTE,
		PART: ATTESTATION_ROUTE,
		PRON: ATTESTATION_ROUTE,
		PROPN: ATTESTATION_ROUTE,
		PUNCT: ATTESTATION_ROUTE,
		SCONJ: ATTESTATION_ROUTE,
		SYM: ATTESTATION_ROUTE,
		VERB: ATTESTATION_ROUTE,
		X: ATTESTATION_ROUTE,
	},
	Phraseme: {
		Aphorism: ATTESTATION_ROUTE,
		Collocation: ATTESTATION_ROUTE,
		DiscourseFormula: ATTESTATION_ROUTE,
		Idiom: ATTESTATION_ROUTE,
		Proverb: ATTESTATION_ROUTE,
	},
	Morpheme: {
		Circumfix: ATTESTATION_ROUTE,
		Clitic: ATTESTATION_ROUTE,
		Duplifix: ATTESTATION_ROUTE,
		Infix: ATTESTATION_ROUTE,
		Interfix: ATTESTATION_ROUTE,
		Prefix: ATTESTATION_ROUTE,
		Root: ATTESTATION_ROUTE,
		Suffix: ATTESTATION_ROUTE,
		Suffixoid: ATTESTATION_ROUTE,
		Transfix: ATTESTATION_ROUTE,
	},
} satisfies RendererRegistry<"de", "Attestation">;
const SHADOW = {
	Lexeme: {
		ADJ: SHADOW_ROUTE,
		ADP: SHADOW_ROUTE,
		ADV: SHADOW_ROUTE,
		AUX: SHADOW_ROUTE,
		CCONJ: SHADOW_ROUTE,
		DET: SHADOW_ROUTE,
		INTJ: SHADOW_ROUTE,
		NOUN: SHADOW_ROUTE,
		NUM: SHADOW_ROUTE,
		PART: SHADOW_ROUTE,
		PRON: SHADOW_ROUTE,
		PROPN: SHADOW_ROUTE,
		PUNCT: SHADOW_ROUTE,
		SCONJ: SHADOW_ROUTE,
		SYM: SHADOW_ROUTE,
		VERB: SHADOW_ROUTE,
		X: SHADOW_ROUTE,
	},
	Phraseme: {
		Aphorism: SHADOW_ROUTE,
		Collocation: SHADOW_ROUTE,
		DiscourseFormula: SHADOW_ROUTE,
		Idiom: SHADOW_ROUTE,
		Proverb: SHADOW_ROUTE,
	},
	Morpheme: {
		Circumfix: SHADOW_ROUTE,
		Clitic: SHADOW_ROUTE,
		Duplifix: SHADOW_ROUTE,
		Infix: SHADOW_ROUTE,
		Interfix: SHADOW_ROUTE,
		Prefix: SHADOW_ROUTE,
		Root: SHADOW_ROUTE,
		Suffix: SHADOW_ROUTE,
		Suffixoid: SHADOW_ROUTE,
		Transfix: SHADOW_ROUTE,
	},
} satisfies RendererRegistry<"de", "Shadow">;
const SURFACE = {
	Header: renderDefaultSurfaceHeader,
	Routes: renderDefaultSurfaceRoutes,
} satisfies RendererRegistry<"de", "Surface">;

export const DE_RENDERER_REGISTRY = {
	Reading: READING,
	Lemma: LEMMA,
	Surface: SURFACE,
	Attestation: ATTESTATION,
	Shadow: SHADOW,
} satisfies RendererRegistry<"de">;
