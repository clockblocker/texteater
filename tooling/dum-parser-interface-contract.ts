import type { ParsingError } from "../battery/common-utils/src/index";
import type {
	EnabledSegmentationLanguage,
	GrammaticalInput,
	GrammaticalInteraction,
	GrammaticalResolutionLanguage,
	GrammaticalResult,
	GrammaticalRoute,
	KnowledgeGenerationInput,
	KnowledgeGenerationLanguage,
	KnowledgeGenerationRequest,
	KnowledgeGenerationResult,
	Section1Error,
	Segment,
	SegmentationDecision,
	SegmentationResult,
	SegmentedSentence,
	SegmentedSentenceId,
} from "../battery/dumgen/src/types";

export type { DumdictParserInterface } from "./dumdict-parser-interface";
export type { DumlingParserInterface } from "./dumling-parser-interface";
export type { DumrelParserInterface } from "./dumrel-parser-interface";

type Parsed<Value> = Value | ParsingError<Value>;
type Parser<Value> = (input: unknown) => Parsed<Value>;
interface SharedParsingErrorExport {
	readonly ParsingError: typeof import("../battery/common-utils/src/index").ParsingError;
}

/** Declaration contract implemented by the future Dumgen package root. */
export interface DumgenParserInterface extends SharedParsingErrorExport {
	readonly parseAsKnowledgeGenerationRequest: Parser<KnowledgeGenerationRequest>;
	readonly parseAsKnowledgeGenerationInput: <
		const L extends KnowledgeGenerationLanguage,
	>(
		input: unknown,
		language: L,
	) => Parsed<KnowledgeGenerationInput<L>>;
	readonly parseAsKnowledgeGenerationResult: Parser<KnowledgeGenerationResult>;
	readonly parseAsSegmentedSentenceId: Parser<SegmentedSentenceId>;
	readonly parseAsSegment: Parser<Segment>;
	readonly parseAsSegmentedSentence: <
		const L extends EnabledSegmentationLanguage,
	>(
		input: unknown,
		language: L,
	) => Parsed<SegmentedSentence<L>>;
	readonly parseAsSegmentationDecision: Parser<SegmentationDecision>;
	readonly parseAsSection1Error: Parser<Section1Error>;
	readonly parseAsSegmentationResult: Parser<SegmentationResult>;
	readonly parseAsGrammaticalRoute: <
		const L extends GrammaticalResolutionLanguage,
	>(
		input: unknown,
		language: L,
	) => Parsed<GrammaticalRoute<L>>;
	readonly parseAsGrammaticalInteraction: Parser<GrammaticalInteraction>;
	readonly parseAsGrammaticalInput: <
		const L extends GrammaticalResolutionLanguage,
	>(
		input: unknown,
		language: L,
	) => Parsed<GrammaticalInput<L>>;
	readonly parseAsGrammaticalResult: <
		const L extends GrammaticalResolutionLanguage,
	>(
		input: unknown,
		language: L,
	) => Parsed<GrammaticalResult<L>>;
}

export const DUM_PARSER_INTERFACE_CONTRACT = {
	contractVersion: 1,
	inputParameter: "input: unknown",
	result: "Success | ParsingError<Success>",
	sharedErrorExport: "ParsingError",
	ordinaryValidationFailureThrows: false,
	exportLocation: "package-root",
	parserSubpath: null,
	packages: {
		dumling: {
			parseAsLemma: ["input", "language", "family", "kind"],
			parseAsSurface: [
				"input",
				"language",
				"surfaceKind",
				"family",
				"kind",
			],
			parseAsAttestation: [
				"input",
				"language",
				"surfaceKind",
				"family",
				"kind",
			],
			parseAsReading: ["input", "language", "family", "kind"],
		},
		dumrel: {
			parseAsKnowledgeSettings: ["input"],
			parseAsKnowledgeRequestMask: ["input"],
			parseAsMorphemeReadingReference: ["input"],
			parseAsUnitShadow: ["input"],
			parseAsLexicalUnitShadow: ["input"],
			parseAsLexemeUnitShadow: ["input"],
			parseAsMorphologicalTreeStructure: ["input"],
			parseAsMorphologicalTreeNode: ["input"],
			parseAsMorphologicalTree: ["input"],
			parseAsLexicalBreakdown: ["input"],
			parseAsSemanticRelations: ["input"],
			parseAsDirectSemanticRelationGraphEdge: ["input"],
			parseAsSemanticRelationGraphReading: ["input"],
			parseAsSemanticRelationGraph: ["input"],
			parseAsPendingSemanticRelation: ["input"],
			parseAsReadingKnowledge: ["input"],
			parseAsKnowledgeChange: ["input"],
			parseAsGrammaticalRelationClaim: ["input"],
			parseAsGrammaticalSeries: ["input"],
		},
		dumdict: {
			parseAsLemmaRecord: ["input", "language"],
			parseAsReadingEntry: ["input", "language"],
			parseAsSurfaceEntry: ["input", "language"],
			parseAsPendingSemanticRelationLocator: ["input", "language"],
			parseAsPendingSemanticRelationRecord: ["input", "language"],
			parseAsChangePrecondition: ["input", "language"],
			parseAsReadingPatchOp: ["input", "language"],
			parseAsPlannedChangeOp: ["input", "language"],
			parseAsDumdictPlan: ["input", "language"],
			parseAsCommitChangesRequest: ["input", "language"],
			parseAsCommitChangesResult: ["input"],
		},
		dumgen: {
			parseAsKnowledgeGenerationRequest: ["input"],
			parseAsKnowledgeGenerationInput: ["input", "language"],
			parseAsKnowledgeGenerationResult: ["input"],
			parseAsSegmentedSentenceId: ["input"],
			parseAsSegment: ["input"],
			parseAsSegmentedSentence: ["input", "language"],
			parseAsSegmentationDecision: ["input"],
			parseAsSection1Error: ["input"],
			parseAsSegmentationResult: ["input"],
			parseAsGrammaticalRoute: ["input", "language"],
			parseAsGrammaticalInteraction: ["input"],
			parseAsGrammaticalInput: ["input", "language"],
			parseAsGrammaticalResult: ["input", "language"],
		},
	},
} as const;
