import type { LemmaKindFor } from "dumling/types";
import type { ReactElement } from "react";

import type {
	GrammaticalNoteKind,
	GrammaticalNoteRenderContext,
	NoteBlockRendererRegistry,
	NoteFamilyFor,
} from "../note-block-renderer-registry";
import type { UnitReadingFamilyFor } from "../reading";
import { renderHeaderDeLexemeVerb } from "../reading/de/renderer-overrides/lexeme/verb/header/header-de-lexeme-verb-renderer";
import {
	renderDefaultReadingHeader,
	renderDefaultReadingRelations,
	renderDefaultReadingSourceContexts,
	renderDefaultReadingTranslations,
	renderReadingDefinition,
} from "../reading/default-renderers";
import type { RouteNoteDefaultRenderer } from "../route";
import { renderDefaultRouteNoteHeader } from "../route/renderers/default/header-renderer";
import { renderDefaultRouteNoteRoutes } from "../route/renderers/default/routes-renderer";
import type { ShadowNoteDefaultRenderer } from "../shadow";
import { renderDefaultShadowNoteHeader } from "../shadow/renderers/default/header-renderer";
import { renderDefaultShadowNoteRelations } from "../shadow/renderers/default/relations-renderer";
import {
	renderDefaultSurfaceNoteHeader,
	renderDefaultSurfaceNoteRoutes,
} from "../surface/default-renderers";

const READING_BASE_RENDERERS = {
	Header: renderDefaultReadingHeader,
	SourceContexts: renderDefaultReadingSourceContexts,
	Definition: renderReadingDefinition,
	Translations: renderDefaultReadingTranslations,
};
const READING_RELATIONAL_RENDERERS = {
	...READING_BASE_RENDERERS,
	Relations: renderDefaultReadingRelations,
};

export const DE_READING_NOTE_RENDERER_REGISTRY = {
	Lexeme: {
		ADJ: READING_RELATIONAL_RENDERERS,
		ADP: READING_RELATIONAL_RENDERERS,
		ADV: READING_RELATIONAL_RENDERERS,
		AUX: READING_RELATIONAL_RENDERERS,
		CCONJ: READING_RELATIONAL_RENDERERS,
		DET: READING_RELATIONAL_RENDERERS,
		INTJ: READING_RELATIONAL_RENDERERS,
		NOUN: READING_RELATIONAL_RENDERERS,
		NUM: READING_RELATIONAL_RENDERERS,
		PART: READING_RELATIONAL_RENDERERS,
		PRON: READING_RELATIONAL_RENDERERS,
		PROPN: READING_RELATIONAL_RENDERERS,
		PUNCT: READING_BASE_RENDERERS,
		SCONJ: READING_RELATIONAL_RENDERERS,
		SYM: READING_RELATIONAL_RENDERERS,
		VERB: {
			...READING_RELATIONAL_RENDERERS,
			Header: renderHeaderDeLexemeVerb,
		},
		X: READING_BASE_RENDERERS,
	},
	Phraseme: {
		Aphorism: READING_RELATIONAL_RENDERERS,
		Collocation: READING_RELATIONAL_RENDERERS,
		DiscourseFormula: READING_RELATIONAL_RENDERERS,
		Idiom: READING_RELATIONAL_RENDERERS,
		Proverb: READING_RELATIONAL_RENDERERS,
	},
	Morpheme: {
		Circumfix: READING_BASE_RENDERERS,
		Clitic: READING_BASE_RENDERERS,
		Duplifix: READING_BASE_RENDERERS,
		Infix: READING_BASE_RENDERERS,
		Interfix: READING_BASE_RENDERERS,
		Prefix: READING_BASE_RENDERERS,
		Root: READING_BASE_RENDERERS,
		Suffix: READING_BASE_RENDERERS,
		Suffixoid: READING_BASE_RENDERERS,
		ToneMarking: READING_BASE_RENDERERS,
		Transfix: READING_BASE_RENDERERS,
	},
} satisfies NoteBlockRendererRegistry<"de", "Reading">;

type GenericGrammaticalRenderer<N extends GrammaticalNoteKind> = <
	F extends NoteFamilyFor<"de", N>,
	K extends LemmaKindFor<"de", F>,
>(
	context: GrammaticalNoteRenderContext<"de", N, F, K>,
) => ReactElement | null;

function adaptRouteRenderer<N extends "Lemma" | "Attestation">(
	renderer: RouteNoteDefaultRenderer,
): GenericGrammaticalRenderer<N> {
	return <F extends NoteFamilyFor<"de", N>, K extends LemmaKindFor<"de", F>>(
		context: GrammaticalNoteRenderContext<"de", N, F, K>,
	) =>
		renderer({
			note: context.noteData,
			capabilities: context.PresentationCapabilities,
		});
}

function adaptShadowRenderer(
	renderer: ShadowNoteDefaultRenderer,
): GenericGrammaticalRenderer<"Shadow"> {
	return <
		F extends UnitReadingFamilyFor<"de">,
		K extends LemmaKindFor<"de", F>,
	>(
		context: GrammaticalNoteRenderContext<"de", "Shadow", F, K>,
	) =>
		renderer({
			note: context.noteData,
			capabilities: context.PresentationCapabilities,
		});
}

const LEMMA_RENDERERS = {
	Header: adaptRouteRenderer<"Lemma">(renderDefaultRouteNoteHeader),
	Routes: adaptRouteRenderer<"Lemma">(renderDefaultRouteNoteRoutes),
};
const ATTESTATION_RENDERERS = {
	Header: adaptRouteRenderer<"Attestation">(renderDefaultRouteNoteHeader),
	Routes: adaptRouteRenderer<"Attestation">(renderDefaultRouteNoteRoutes),
};
const SHADOW_RENDERERS = {
	Header: adaptShadowRenderer(renderDefaultShadowNoteHeader),
	Relations: adaptShadowRenderer(renderDefaultShadowNoteRelations),
};

function allGermanUnitRoutes<
	N extends GrammaticalNoteKind,
	R extends Partial<
		Record<
			import("../note-block-kind").NoteBlockKind,
			GenericGrammaticalRenderer<N>
		>
	>,
>(renderers: R): NoteBlockRendererRegistry<"de", N> {
	return {
		Lexeme: {
			ADJ: renderers,
			ADP: renderers,
			ADV: renderers,
			AUX: renderers,
			CCONJ: renderers,
			DET: renderers,
			INTJ: renderers,
			NOUN: renderers,
			NUM: renderers,
			PART: renderers,
			PRON: renderers,
			PROPN: renderers,
			PUNCT: renderers,
			SCONJ: renderers,
			SYM: renderers,
			VERB: renderers,
			X: renderers,
		},
		Phraseme: {
			Aphorism: renderers,
			Collocation: renderers,
			DiscourseFormula: renderers,
			Idiom: renderers,
			Proverb: renderers,
		},
		Morpheme: {
			Circumfix: renderers,
			Clitic: renderers,
			Duplifix: renderers,
			Infix: renderers,
			Interfix: renderers,
			Prefix: renderers,
			Root: renderers,
			Suffix: renderers,
			Suffixoid: renderers,
			ToneMarking: renderers,
			Transfix: renderers,
		},
	} as unknown as NoteBlockRendererRegistry<"de", N>;
}

export const DE_LEMMA_NOTE_RENDERER_REGISTRY = allGermanUnitRoutes<
	"Lemma",
	typeof LEMMA_RENDERERS
>(LEMMA_RENDERERS) satisfies NoteBlockRendererRegistry<"de", "Lemma">;
export const DE_ATTESTATION_NOTE_RENDERER_REGISTRY = allGermanUnitRoutes<
	"Attestation",
	typeof ATTESTATION_RENDERERS
>(ATTESTATION_RENDERERS) satisfies NoteBlockRendererRegistry<
	"de",
	"Attestation"
>;
export const DE_SHADOW_NOTE_RENDERER_REGISTRY = allGermanUnitRoutes<
	"Shadow",
	typeof SHADOW_RENDERERS
>(SHADOW_RENDERERS) satisfies NoteBlockRendererRegistry<"de", "Shadow">;

export const DE_SURFACE_NOTE_RENDERER_REGISTRY = {
	Header: renderDefaultSurfaceNoteHeader,
	Routes: renderDefaultSurfaceNoteRoutes,
} satisfies NoteBlockRendererRegistry<"de", "Surface">;

export const DE_NOTE_BLOCK_RENDERER_REGISTRY = {
	Reading: DE_READING_NOTE_RENDERER_REGISTRY,
	Lemma: DE_LEMMA_NOTE_RENDERER_REGISTRY,
	Surface: DE_SURFACE_NOTE_RENDERER_REGISTRY,
	Attestation: DE_ATTESTATION_NOTE_RENDERER_REGISTRY,
	Shadow: DE_SHADOW_NOTE_RENDERER_REGISTRY,
} satisfies NoteBlockRendererRegistry<"de">;
