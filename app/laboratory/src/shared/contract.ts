import type {
	Segment as DumgenSegment,
	SegmentedSentence as DumgenSentence,
	AnalysisTarget as DumgenTarget,
	Encounter,
	ModelExchange,
	OperationTrace,
} from "dumgen/types";
import type * as Dumling from "dumling/types";
export type Attestation = Dumling.Attestation<"de">;
export type Lemma = Dumling.Lemma<"de">;
export type Surface = Dumling.Surface<"de">;
export type Reading = Dumling.Reading<"de">;
export type MemberOrthography = Attestation["members"][number]["orthography"];

export type AnalysisTarget = DumgenTarget<"de">;

export type EntityRepresentation = {
	attestation: Attestation;
	reading: Reading;
	resolution: "dumgen";
	model: string;
};

export type Segment = DumgenSegment;

export type SegmentationRequest = {
	text: string;
};

export type SegmentationStageResult = {
	prompt: string;
	traceOrigin: "generated" | "deterministic" | "cached";
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
		model: string;
		prompts: string[];
	};
};

export type SegmentedSentence =
	| DumgenSentence<"de">
	| DumgenSentence<"en">
	| DumgenSentence<"he">;
export type GermanSegmentedSentence = DumgenSentence<"de">;

export type ClickResolutionRequest = {
	segmentedSentenceId: string;
	clickedSegmentIndex: number;
	target?: AnalysisTarget;
};

export type ClassificationStageName = "target" | "grammatical" | "reading";

export type ClassificationStageResult = {
	prompt: string;
	traceOrigin: "generated" | "cached" | "supplied" | "authored";
	input: unknown;
	output: unknown;
	result: unknown;
	calls?: readonly ModelExchange[];
	operations?: readonly OperationTrace[];
};

export type ResolutionDiagnostic = {
	stage: ClassificationStageName;
	kind:
		| "Unresolved"
		| "CatalogMiss"
		| "DecisionMismatch"
		| "ResolutionRouteNotImplemented";
	message: string;
};

export type ClassificationGeneration = {
	model: string;
	prompts: string[];
	cache: "miss" | "member-hit";
	modelCalls: number;
};

export type ClickResolutionResponse =
	| {
			decision: "Resolved";
			target: AnalysisTarget;
			encounter: Encounter<"de">;
			entity: EntityRepresentation;
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
	  }
	| {
			decision: "CatalogMiss";
			stage: string;
			message: string;
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
