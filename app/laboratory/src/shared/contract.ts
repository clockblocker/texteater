import type { Reading as DumdictReading } from "dumdict";
import type {
	Segment as DumgenSegment,
	SegmentedSentence as DumgenSegmentedSentence,
	GrammaticalRoute,
} from "dumgen";
import type {
	Lemma as DumlingLemma,
	Selection as DumlingSelection,
	Surface as DumlingSurface,
} from "dumling";

export type Lemma = DumlingLemma<"de">;
export type Selection = DumlingSelection<"de">;
export type Surface = DumlingSurface<"de">;
export type Reading = DumdictReading<"de">;
export type MemberOrthography = "Standard" | "Typo";

export type AnalysisTarget = GrammaticalRoute<"de"> & {
	readonly memberSegmentIndices: readonly number[];
};

export type EntityRepresentation = {
	selection: Selection;
	surface: Surface;
	reading: Reading;
	resolution: "dumgen";
	model: "gpt-5-nano";
};

export type Segment = DumgenSegment;

export type SegmentationRequest = {
	text: string;
};

export type SegmentationStageResult = {
	prompt: string;
	traceOrigin: "generated" | "cached";
	input: unknown;
	output: unknown;
	result: unknown;
};

export type SegmentationResponse = {
	decision: "Accepted" | "UnsupportedLanguage" | "Unintelligible";
	sentence: SegmentedSentence | null;
	stages: {
		intake: SegmentationStageResult;
		segmentation?: SegmentationStageResult;
	};
	generation: {
		model: "gpt-5-nano";
		prompts: string[];
	};
};

export type SegmentedSentence = DumgenSegmentedSentence<"de">;

export type ClickResolutionRequest = {
	segmentedSentenceId: string;
	clickedSegmentIndex: number;
};

export type ClassificationStageName = "target" | "grammatical" | "reading";

export type ClassificationStageResult = {
	prompt: string;
	traceOrigin: "generated" | "cached";
	input: unknown;
	output: unknown;
	result: unknown;
};

export type ResolutionDiagnostic = {
	stage: ClassificationStageName;
	kind: "Unresolved" | "DecisionMismatch" | "ResolutionRouteNotImplemented";
	message: string;
};

export type ClassificationGeneration = {
	model: "gpt-5-nano";
	prompts: string[];
	cache: "miss" | "member-hit";
	modelCalls: number;
};

export type ClickResolutionResponse =
	| {
			decision: "Resolved";
			target: AnalysisTarget;
			entity: EntityRepresentation;
			memberOrthographies: Record<number, MemberOrthography>;
			stages: Partial<
				Record<ClassificationStageName, ClassificationStageResult>
			>;
			diagnostics: ResolutionDiagnostic[];
			generation: ClassificationGeneration;
	  }
	| {
			decision: "NotImplemented";
			stage: "GrammaticalResolution";
			language: "de";
			family: AnalysisTarget["family"];
			kind: AnalysisTarget["kind"];
			target: AnalysisTarget;
			stages: Partial<
				Record<ClassificationStageName, ClassificationStageResult>
			>;
			diagnostics: ResolutionDiagnostic[];
			generation: ClassificationGeneration;
	  }
	| {
			decision: "Unresolved";
			target?: AnalysisTarget;
			stages: Partial<
				Record<ClassificationStageName, ClassificationStageResult>
			>;
			diagnostics: ResolutionDiagnostic[];
			generation: ClassificationGeneration;
	  };

export type LaboratorySessionResponse = {
	sessionId: string;
};
