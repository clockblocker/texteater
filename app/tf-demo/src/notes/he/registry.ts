import type { RendererRegistry } from "../universal/blocks/renderer-registry";
import { renderDefaultAttestationFusion } from "../universal/blocks/renderers/attestation/fusion/default";
import { renderDefaultAttestationHeading } from "../universal/blocks/renderers/attestation/heading/default";
import { renderDefaultAttestationRoutes } from "../universal/blocks/renderers/attestation/routes/default";
import { renderDefaultAttestationSource } from "../universal/blocks/renderers/attestation/source-contexts/default";
import { renderDefaultLemmaRoutes } from "../universal/blocks/renderers/lemma/routes/default";
import { renderReadingDefinition } from "../universal/blocks/renderers/reading/definition/static";
import { renderReadingPersonalAnnotation } from "../universal/blocks/renderers/reading/personal-annotation/default";
import { renderDefaultReadingRelations } from "../universal/blocks/renderers/reading/relations/default";
import { renderDefaultReadingSourceContexts } from "../universal/blocks/renderers/reading/source-contexts/default";
import { renderDefaultReadingTranslations } from "../universal/blocks/renderers/reading/translations/default";
import { renderDefaultShadowHeading } from "../universal/blocks/renderers/shadow/heading/default";
import { renderDefaultShadowRelations } from "../universal/blocks/renderers/shadow/relations/default";
import { renderDefaultSurfaceRoutes } from "../universal/blocks/renderers/surface/routes/default";
import { renderHebrewLemmaHeading } from "./blocks/lemma-heading";
import { renderHebrewParadigm } from "./blocks/paradigm";
import { renderHebrewReadingHeading } from "./blocks/reading-heading";
import { renderHebrewSurfaceHeading } from "./blocks/surface-heading";

const READING = {
	Heading: renderHebrewReadingHeading,
	SourceContexts: renderDefaultReadingSourceContexts,
	Definition: renderReadingDefinition,
	Translations: renderDefaultReadingTranslations,
	Relations: renderDefaultReadingRelations,
	PersonalAnnotation: renderReadingPersonalAnnotation,
};
const INFLECTED_READING = { ...READING, Paradigm: renderHebrewParadigm };
const LEMMA = {
	Heading: renderHebrewLemmaHeading,
	Routes: renderDefaultLemmaRoutes,
};
const ATTESTATION = {
	Heading: renderDefaultAttestationHeading,
	SourceContexts: renderDefaultAttestationSource,
	Fusion: renderDefaultAttestationFusion,
	Routes: renderDefaultAttestationRoutes,
};
const SHADOW = {
	Heading: renderDefaultShadowHeading,
	Relations: renderDefaultShadowRelations,
};

/** Hebrew owns its supported routes; universal blocks own no Hebrew rules. */
export const HE_RENDERER_REGISTRY = {
	Reading: {
		Lexeme: {
			ADJ: INFLECTED_READING,
			ADP: READING,
			ADV: READING,
			AUX: INFLECTED_READING,
			CCONJ: READING,
			DET: INFLECTED_READING,
			INTJ: READING,
			NOUN: INFLECTED_READING,
			NUM: INFLECTED_READING,
			PART: READING,
			PRON: INFLECTED_READING,
			PROPN: INFLECTED_READING,
			PUNCT: READING,
			SCONJ: READING,
			SYM: READING,
			VERB: INFLECTED_READING,
		},
		Locution: { ADV: READING, INTJ: READING },
		Saying: { Saying: READING },
		Morpheme: {
			Circumfix: READING,
			Duplifix: READING,
			Infix: READING,
			Interfix: READING,
			Prefix: READING,
			Root: READING,
			Suffix: READING,
			Suffixoid: READING,
			Transfix: READING,
		},
	},
	Lemma: {
		Lexeme: {
			ADJ: LEMMA,
			ADP: LEMMA,
			ADV: LEMMA,
			AUX: LEMMA,
			CCONJ: LEMMA,
			DET: LEMMA,
			INTJ: LEMMA,
			NOUN: LEMMA,
			NUM: LEMMA,
			PART: LEMMA,
			PRON: LEMMA,
			PROPN: LEMMA,
			PUNCT: LEMMA,
			SCONJ: LEMMA,
			SYM: LEMMA,
			VERB: LEMMA,
		},
		Locution: { ADV: LEMMA, INTJ: LEMMA },
		Saying: { Saying: LEMMA },
		Morpheme: {
			Circumfix: LEMMA,
			Duplifix: LEMMA,
			Infix: LEMMA,
			Interfix: LEMMA,
			Prefix: LEMMA,
			Root: LEMMA,
			Suffix: LEMMA,
			Suffixoid: LEMMA,
			Transfix: LEMMA,
		},
	},
	Attestation: {
		Lexeme: {
			ADJ: ATTESTATION,
			ADP: ATTESTATION,
			ADV: ATTESTATION,
			AUX: ATTESTATION,
			CCONJ: ATTESTATION,
			DET: ATTESTATION,
			INTJ: ATTESTATION,
			NOUN: ATTESTATION,
			NUM: ATTESTATION,
			PART: ATTESTATION,
			PRON: ATTESTATION,
			PROPN: ATTESTATION,
			PUNCT: ATTESTATION,
			SCONJ: ATTESTATION,
			SYM: ATTESTATION,
			VERB: ATTESTATION,
		},
		Locution: { ADV: ATTESTATION, INTJ: ATTESTATION },
		Saying: { Saying: ATTESTATION },
		Morpheme: {
			Circumfix: ATTESTATION,
			Duplifix: ATTESTATION,
			Infix: ATTESTATION,
			Interfix: ATTESTATION,
			Prefix: ATTESTATION,
			Root: ATTESTATION,
			Suffix: ATTESTATION,
			Suffixoid: ATTESTATION,
			Transfix: ATTESTATION,
		},
	},
	Shadow: {
		Lexeme: {
			ADJ: SHADOW,
			ADP: SHADOW,
			ADV: SHADOW,
			AUX: SHADOW,
			CCONJ: SHADOW,
			DET: SHADOW,
			INTJ: SHADOW,
			NOUN: SHADOW,
			NUM: SHADOW,
			PART: SHADOW,
			PRON: SHADOW,
			PROPN: SHADOW,
			PUNCT: SHADOW,
			SCONJ: SHADOW,
			SYM: SHADOW,
			VERB: SHADOW,
		},
		Locution: { ADV: SHADOW, INTJ: SHADOW },
		Saying: { Saying: SHADOW },
		Morpheme: {
			Circumfix: SHADOW,
			Duplifix: SHADOW,
			Infix: SHADOW,
			Interfix: SHADOW,
			Prefix: SHADOW,
			Root: SHADOW,
			Suffix: SHADOW,
			Suffixoid: SHADOW,
			Transfix: SHADOW,
		},
	},
	Surface: {
		Heading: renderHebrewSurfaceHeading,
		Routes: renderDefaultSurfaceRoutes,
	},
} satisfies RendererRegistry<"he">;
