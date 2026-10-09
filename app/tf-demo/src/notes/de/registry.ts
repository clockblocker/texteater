import type { RendererRegistry } from "../universal/blocks/renderer-registry";
import { renderDefaultAttestationFusion } from "../universal/blocks/renderers/attestation/fusion/default";
import { renderDefaultAttestationHeading } from "../universal/blocks/renderers/attestation/heading/default";
import { renderDefaultAttestationRoutes } from "../universal/blocks/renderers/attestation/routes/default";
import { renderDefaultAttestationSource } from "../universal/blocks/renderers/attestation/source-contexts/default";
import { renderDefaultLemmaHeading } from "../universal/blocks/renderers/lemma/heading/default";
import { renderDefaultLemmaRoutes } from "../universal/blocks/renderers/lemma/routes/default";
import { renderReadingDefinition } from "../universal/blocks/renderers/reading/definition/static";
import { DefaultReadingHeadingRenderer } from "../universal/blocks/renderers/reading/heading/default";
import { renderReadingPersonalAnnotation } from "../universal/blocks/renderers/reading/personal-annotation/default";
import { renderDefaultReadingRelations } from "../universal/blocks/renderers/reading/relations/default";
import { renderDefaultReadingSourceContexts } from "../universal/blocks/renderers/reading/source-contexts/default";
import { renderDefaultReadingTranslations } from "../universal/blocks/renderers/reading/translations/default";
import { renderDefaultShadowHeading } from "../universal/blocks/renderers/shadow/heading/default";
import { renderDefaultShadowRelations } from "../universal/blocks/renderers/shadow/relations/default";
import { renderDefaultSurfaceHeading } from "../universal/blocks/renderers/surface/heading/default";
import { renderDefaultSurfaceRoutes } from "../universal/blocks/renderers/surface/routes/default";
import { renderHeadingDeLexemeNoun } from "./block-renderer-overrides/reading/heading/lexeme-noun";
import { renderHeadingDeLexemeVerb } from "./block-renderer-overrides/reading/heading/lexeme-verb";
import {
	renderDeAdpositionSourceContexts,
	renderDeAdpositionValency,
} from "./block-renderers/reading/valency/adposition";
import { renderDeReadingValency } from "./block-renderers/reading/valency/default";

const READING_BASE = {
	Heading: DefaultReadingHeadingRenderer,
	SourceContexts: renderDefaultReadingSourceContexts,
	Definition: renderReadingDefinition,
	Translations: renderDefaultReadingTranslations,
	PersonalAnnotation: renderReadingPersonalAnnotation,
};
const READING_RELATIONAL = {
	...READING_BASE,
	Relations: renderDefaultReadingRelations,
};
/** The routes whose Readings may hold a Valency Frame (Dumrel's valency policy). */
const READING_VALENT = {
	...READING_RELATIONAL,
	Valency: renderDeReadingValency,
};

/** An ADP renders its cases from dumcorpus's ADP Case Table instead of a frame. */
const READING_ADPOSITION = {
	...READING_RELATIONAL,
	SourceContexts: renderDeAdpositionSourceContexts,
	Valency: renderDeAdpositionValency,
};

const READING = {
	Lexeme: {
		ADJ: READING_VALENT,
		ADP: READING_ADPOSITION,
		ADV: READING_RELATIONAL,
		AUX: READING_RELATIONAL,
		CCONJ: READING_RELATIONAL,
		DET: READING_RELATIONAL,
		INTJ: READING_RELATIONAL,
		NOUN: { ...READING_VALENT, Heading: renderHeadingDeLexemeNoun },
		NUM: READING_RELATIONAL,
		PART: READING_RELATIONAL,
		PRON: READING_RELATIONAL,
		PROPN: READING_RELATIONAL,
		PUNCT: READING_BASE,
		SCONJ: READING_RELATIONAL,
		SYM: READING_RELATIONAL,
		VERB: { ...READING_VALENT, Heading: renderHeadingDeLexemeVerb },
	},
	Locution: {
		ADJ: READING_VALENT,
		ADP: READING_ADPOSITION,
		ADV: READING_RELATIONAL,
		CCONJ: READING_RELATIONAL,
		DET: READING_RELATIONAL,
		INTJ: READING_RELATIONAL,
		NOUN: READING_VALENT,
		NUM: READING_RELATIONAL,
		PRON: READING_RELATIONAL,
		SCONJ: READING_RELATIONAL,
		VERB: READING_VALENT,
	},
	Saying: {
		Saying: READING_RELATIONAL,
	},
	Morpheme: {
		Circumfix: READING_BASE,
		Duplifix: READING_BASE,
		Infix: READING_BASE,
		Interfix: READING_BASE,
		Prefix: READING_BASE,
		Root: READING_BASE,
		Suffix: READING_BASE,
		Suffixoid: READING_BASE,
	},
} satisfies RendererRegistry<"de", "Reading">;

const LEMMA_ROUTE = {
	Heading: renderDefaultLemmaHeading,
	Routes: renderDefaultLemmaRoutes,
};
const ATTESTATION_ROUTE = {
	Heading: renderDefaultAttestationHeading,
	SourceContexts: renderDefaultAttestationSource,
	Fusion: renderDefaultAttestationFusion,
	Routes: renderDefaultAttestationRoutes,
};
const SHADOW_ROUTE = {
	Heading: renderDefaultShadowHeading,
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
	},
	Locution: {
		ADJ: LEMMA_ROUTE,
		ADP: LEMMA_ROUTE,
		ADV: LEMMA_ROUTE,
		CCONJ: LEMMA_ROUTE,
		DET: LEMMA_ROUTE,
		INTJ: LEMMA_ROUTE,
		NOUN: LEMMA_ROUTE,
		NUM: LEMMA_ROUTE,
		PRON: LEMMA_ROUTE,
		SCONJ: LEMMA_ROUTE,
		VERB: LEMMA_ROUTE,
	},
	Saying: {
		Saying: LEMMA_ROUTE,
	},
	Morpheme: {
		Circumfix: LEMMA_ROUTE,
		Duplifix: LEMMA_ROUTE,
		Infix: LEMMA_ROUTE,
		Interfix: LEMMA_ROUTE,
		Prefix: LEMMA_ROUTE,
		Root: LEMMA_ROUTE,
		Suffix: LEMMA_ROUTE,
		Suffixoid: LEMMA_ROUTE,
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
	},
	Locution: {
		ADJ: ATTESTATION_ROUTE,
		ADP: ATTESTATION_ROUTE,
		ADV: ATTESTATION_ROUTE,
		CCONJ: ATTESTATION_ROUTE,
		DET: ATTESTATION_ROUTE,
		INTJ: ATTESTATION_ROUTE,
		NOUN: ATTESTATION_ROUTE,
		NUM: ATTESTATION_ROUTE,
		PRON: ATTESTATION_ROUTE,
		SCONJ: ATTESTATION_ROUTE,
		VERB: ATTESTATION_ROUTE,
	},
	Saying: {
		Saying: ATTESTATION_ROUTE,
	},
	Morpheme: {
		Circumfix: ATTESTATION_ROUTE,
		Duplifix: ATTESTATION_ROUTE,
		Infix: ATTESTATION_ROUTE,
		Interfix: ATTESTATION_ROUTE,
		Prefix: ATTESTATION_ROUTE,
		Root: ATTESTATION_ROUTE,
		Suffix: ATTESTATION_ROUTE,
		Suffixoid: ATTESTATION_ROUTE,
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
	},
	Locution: {
		ADJ: SHADOW_ROUTE,
		ADP: SHADOW_ROUTE,
		ADV: SHADOW_ROUTE,
		CCONJ: SHADOW_ROUTE,
		DET: SHADOW_ROUTE,
		INTJ: SHADOW_ROUTE,
		NOUN: SHADOW_ROUTE,
		NUM: SHADOW_ROUTE,
		PRON: SHADOW_ROUTE,
		SCONJ: SHADOW_ROUTE,
		VERB: SHADOW_ROUTE,
	},
	Saying: {
		Saying: SHADOW_ROUTE,
	},
	Morpheme: {
		Circumfix: SHADOW_ROUTE,
		Duplifix: SHADOW_ROUTE,
		Infix: SHADOW_ROUTE,
		Interfix: SHADOW_ROUTE,
		Prefix: SHADOW_ROUTE,
		Root: SHADOW_ROUTE,
		Suffix: SHADOW_ROUTE,
		Suffixoid: SHADOW_ROUTE,
	},
} satisfies RendererRegistry<"de", "Shadow">;
const SURFACE = {
	Heading: renderDefaultSurfaceHeading,
	Routes: renderDefaultSurfaceRoutes,
} satisfies RendererRegistry<"de", "Surface">;

export const DE_RENDERER_REGISTRY = {
	Reading: READING,
	Lemma: LEMMA,
	Surface: SURFACE,
	Attestation: ATTESTATION,
	Shadow: SHADOW,
} satisfies RendererRegistry<"de">;
