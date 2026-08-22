import type { Attestation } from "dumling/types";
import type {
	GrammaticalInput,
	GrammaticalInteraction,
	GrammaticalResult,
	GrammaticalRoute,
	KnowledgeGenerationInput,
	KnowledgeGenerationRequest,
	KnowledgeGenerationResult,
	Section1Error,
	Segment,
	SegmentationDecision,
	SegmentationResult,
	SegmentedSentence,
	SegmentedSentenceId,
} from "../types.js";

export interface DumgenValidationRouteOutputMap {
	parseAsKnowledgeGenerationRequest: KnowledgeGenerationRequest;
	"parseAsKnowledgeGenerationInput:de": KnowledgeGenerationInput<"de">;
	parseAsKnowledgeGenerationResult: KnowledgeGenerationResult;
	parseAsSegmentedSentenceId: SegmentedSentenceId;
	parseAsSegment: Segment;
	"parseAsSegmentedSentence:de": SegmentedSentence<"de">;
	"parseAsSegmentedSentence:he": SegmentedSentence<"he">;
	parseAsSegmentationDecision: SegmentationDecision;
	parseAsSection1Error: Section1Error;
	parseAsSegmentationResult: SegmentationResult;
	"parseAsGrammaticalRoute:de": GrammaticalRoute<"de">;
	parseAsGrammaticalInteraction: GrammaticalInteraction;
	"parseAsGrammaticalInput:de": GrammaticalInput<"de">;
	"parseAsGrammaticalResult:de": GrammaticalResult<"de">;
}

export type DumgenValidationRouteKey = keyof DumgenValidationRouteOutputMap &
	string;

export type DumgenOperationalValidationRouteKey =
	| DumgenValidationRouteKey
	| "internal:GermanAttestation:de";

export type DumgenOperationalValidationRouteOutput<
	Key extends DumgenOperationalValidationRouteKey,
> = Key extends DumgenValidationRouteKey
	? DumgenValidationRouteOutputMap[Key]
	: Key extends "internal:GermanAttestation:de"
		? Attestation<"de">
		: never;
