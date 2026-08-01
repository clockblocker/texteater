export type SegmentKind =
	| "ResolvableText"
	| "OpaqueText"
	| "Whitespace"
	| "Punctuation";

export type Lemma = DumlingLemma<"de">;
export type Selection = DumlingSelection<"de">;
export type Surface = DumlingSurface<"de">;
export type Reading = DumdictReading<"de">;

export type EntityRepresentation = {
	selection: Selection;
	surface: Surface;
	reading: Reading;
	resolution: "dumgen";
	model: "gpt-5-nano";
};

export type Segment = {
	index: number;
	text: string;
	kind: SegmentKind;
	start: number;
	end: number;
};

export type SegmentationRequest = {
	text: string;
	selection: {
		start: number;
		end: number;
	};
};

export type SegmentationResponse = {
	decision: "Accepted" | "UnsupportedLanguage" | "Unintelligible";
	sentence: SegmentedSentence | null;
	generation: {
		model: "gpt-5-nano";
		prompt: "laboratory.segmentation.de.segment";
	};
};

export type SegmentedSentence = {
	id: string;
	language: "de";
	sourceText: string;
	selectedText: string;
	selection: {
		start: number;
		end: number;
	};
	segments: Segment[];
};

export type ClickResolutionRequest = {
	segmentedSentenceId: string;
	clickedSegmentIndex: number;
};

export type ClickResolutionResponse = {
	entity: EntityRepresentation;
	generation: {
		model: "gpt-5-nano";
		prompts: readonly [
			"laboratory.classification.de.selection",
			"laboratory.classification.de.surface",
			"laboratory.classification.de.lemma",
			"laboratory.classification.de.reading",
		];
	};
};

export type LaboratorySessionResponse = {
	sessionId: string;
};

import type { Reading as DumdictReading } from "dumdict";
import type {
	Lemma as DumlingLemma,
	Selection as DumlingSelection,
	Surface as DumlingSurface,
} from "dumling";
