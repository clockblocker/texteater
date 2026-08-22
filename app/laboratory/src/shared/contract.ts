import type {
	Segment as DumgenSegment,
	SegmentedSentence as DumgenSegmentedSentence,
	EnabledSegmentationLanguage,
	GrammaticalInteraction,
	GrammaticalRoute,
} from "dumgen";
import type {
	Attestation as DumlingAttestation,
	Lemma as DumlingLemma,
	Reading as DumlingReading,
	Surface as DumlingSurface,
} from "dumling";

export type Attestation = DumlingAttestation<"de">;
export type Lemma = DumlingLemma<"de">;
export type Surface = DumlingSurface<"de">;
export type Reading = DumlingReading<"de">;
export type MemberOrthography = Attestation["members"][number]["orthography"];

export type AnalysisTarget = GrammaticalRoute<"de"> & {
	readonly memberSegmentIndices: readonly number[];
};

export type EntityRepresentation = {
	attestation: Attestation;
	reading: Reading;
	resolution: "dumgen";
	model: "gpt-5.6-luna";
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
		model: "gpt-5.6-luna";
		prompts: string[];
	};
};

export type SegmentedSentence = {
	readonly [Language in EnabledSegmentationLanguage]: DumgenSegmentedSentence<Language>;
}[EnabledSegmentationLanguage];
export type GermanSegmentedSentence = DumgenSegmentedSentence<"de">;

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
	kind:
		| "Unresolved"
		| "CatalogMiss"
		| "DecisionMismatch"
		| "ResolutionRouteNotImplemented";
	message: string;
};

export type ClassificationGeneration = {
	model: "gpt-5.6-luna";
	prompts: string[];
	cache: "miss" | "member-hit";
	modelCalls: number;
};

export type ClickResolutionResponse =
	| {
			decision: "Resolved";
			target: AnalysisTarget;
			interaction: GrammaticalInteraction;
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
			stage: "Lemma" | "Reading";
			reason: "MemberNotCatalogued" | "InventoryNotLoaded";
			language: "de";
			family: AnalysisTarget["family"];
			kind: AnalysisTarget["kind"];
			target: AnalysisTarget;
			candidate: Lemma | Reading;
			stages: Partial<
				Record<ClassificationStageName, ClassificationStageResult>
			>;
			diagnostics: ResolutionDiagnostic[];
			generation: ClassificationGeneration;
	  };

export type LaboratorySessionResponse = {
	sessionId: string;
};
