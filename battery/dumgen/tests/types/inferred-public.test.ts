import { afterAll, describe, expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import type { Effect } from "effect";
import { closeTestingSessions, inferredType } from "prinfer/testing";
import type {
	ComparisonInput,
	Dumgen,
	DumgenOptions,
	Encounter,
	KnowledgeFailure,
	KnowledgeInput,
	KnowledgeProduction,
	Segment,
	SegmentationDecision,
	SegmentKind,
} from "../../src/types.js";

afterAll(closeTestingSessions);

declare const dumgen: Dumgen;
declare const nounKnowledgeInput: Extract<
	KnowledgeInput<"de">,
	{ reading: Dumling.Reading<"de", "Lexeme", "NOUN"> }
>;
// Never called: it only lets the checker infer the operation's result type.
const produceNounKnowledge = () => dumgen.produceKnowledge(nounKnowledgeInput);

export type PublicSegment = Segment;
export type PublicSegmentKind = SegmentKind;
export type AcceptedGermanSegmentation = Extract<
	SegmentationDecision,
	{ decision: "Accepted"; language: "de" }
>;
// Wrapped so the hover shows whether the Sentence keeps its public name.
export type GermanEncounterSentence = {
	sentence: Encounter<"de">["sentence"];
};
export type GermanNounTarget = Extract<
	Encounter<"de">["target"],
	{ kind: "NOUN" }
>;
export type GermanAdjectiveComparisonInput = Extract<
	ComparisonInput<"de">,
	{ lemma: { kind: "ADJ" } }
>;
export type GermanNounKnowledgeInput = typeof nounKnowledgeInput;
type GermanKnowledgeProduction = KnowledgeProduction<"de">;
export type GermanKnowledgeFailures = GermanKnowledgeProduction["failures"];
export type GermanKnowledgeChangeAspects =
	GermanKnowledgeProduction["changes"][number]["aspect"];
export type GermanPendingRelations =
	GermanKnowledgeProduction["pendingRelations"];
type ProducedNounKnowledge = Effect.Effect.Success<
	ReturnType<typeof produceNounKnowledge>
>;
export type ProducedNounPendingTargetLanguage =
	ProducedNounKnowledge["pendingRelations"][number]["target"]["language"];
export type PublicKnowledgeFailure = KnowledgeFailure;
export type KnowledgeContribution = Parameters<
	NonNullable<DumgenOptions["onKnowledgeContribution"]>
>[0];

const full = { full: true, backend: "typescript7" } as const;
const hover = { backend: "typescript7" } as const;
const inferred = (name: string, options: typeof full | typeof hover = full) =>
	inferredType(import.meta.url, { name, ...options });

describe("public Dumgen types read as their Domain names", () => {
	test("Segments and Segmentation Decisions spell out their kinds", async () => {
		expect(await inferred("PublicSegment")).toMatchInlineSnapshot(
			`"type PublicSegment = { kind: "OpaqueText" | "Punctuation" | "ResolvableText" | "Whitespace"; text: string; }"`,
		);
		expect(await inferred("PublicSegmentKind")).toMatchInlineSnapshot(
			`"type PublicSegmentKind = "OpaqueText" | "Punctuation" | "ResolvableText" | "Whitespace""`,
		);
		expect(
			await inferred("AcceptedGermanSegmentation"),
		).toMatchInlineSnapshot(
			`"type AcceptedGermanSegmentation = { decision: "Accepted"; language: "de"; sentence: { id: string; language: "de"; segments: Segment[]; }; }"`,
		);
	}, 30_000);

	test("operation inputs keep the Encounter readable", async () => {
		expect(await inferred("GermanEncounterSentence")).toMatchInlineSnapshot(
			`"type GermanEncounterSentence = { sentence: SegmentedSentence<"de">; }"`,
		);
		expect(await inferred("GermanNounTarget")).toMatchInlineSnapshot(
			`"type GermanNounTarget = { readonly family: "Lexeme"; readonly kind: "NOUN"; readonly memberSegmentIndices: readonly [number, ...number[]]; }"`,
		);
		expect(
			await inferred("GermanAdjectiveComparisonInput"),
		).toMatchInlineSnapshot(
			`"type GermanAdjectiveComparisonInput = { readonly encounter: { readonly sentence: SegmentedSentence<"de">; readonly target: { readonly family: "Lexeme"; readonly kind: "ADJ"; readonly memberSegmentIndices: readonly [number, ...number[]]; }; }; readonly lemma: { unitKind: "Lemma"; language: "de"; family: "Lexeme"; kind: "ADJ"; canonicalForm: string; coreFeatures: { abbr: "Yes" | null; foreign: "Yes" | null; numType: "Card" | "Ord" | null; variant: "Short" | null; }; }; readonly candidates: readonly string[]; }"`,
		);
		expect(
			await inferred("GermanNounKnowledgeInput"),
		).toMatchInlineSnapshot(
			`"type GermanNounKnowledgeInput = { readonly encounter: { readonly sentence: SegmentedSentence<"de">; readonly target: { readonly family: "Lexeme"; readonly kind: "NOUN"; readonly memberSegmentIndices: readonly [number, ...number[]]; }; }; readonly reading: { unitKind: "Reading"; lemma: { unitKind: "Lemma"; language: "de"; family: "Lexeme"; kind: "NOUN"; canonicalForm: string; coreFeatures: { gender: "Fem" | "Masc" | "Neut" | null; hyph: "Yes" | null; }; }; emojiDescription: string; }; readonly request: KnowledgeRequestMask; readonly attestedGovernment?: { preposition: string; case: GovernedCase; }[] | undefined; }"`,
		);
	}, 30_000);

	test("Knowledge Production names its failures and Dumrel changes", async () => {
		expect(await inferred("GermanKnowledgeFailures")).toMatchInlineSnapshot(
			`"type GermanKnowledgeFailures = readonly KnowledgeFailure[]"`,
		);
		expect(await inferred("PublicKnowledgeFailure")).toMatchInlineSnapshot(
			`"type PublicKnowledgeFailure = { aspect: "definition" | "lexicalBreakdown" | "morphologicalTree" | "participleSource" | "semanticRelations" | "transcription" | "translations" | "valency"; leaf?: string | undefined; candidate?: string | undefined; code: "CatalogMiss" | "InvalidInput" | "InvalidModelOutput" | "NotImplemented" | "ProviderFailure" | "Unresolved"; message: string; }"`,
		);
		expect(
			await inferred("GermanKnowledgeChangeAspects"),
		).toMatchInlineSnapshot(
			`"type GermanKnowledgeChangeAspects = "definition" | "lexicalBreakdown" | "morphologicalTree" | "participleSource" | "semanticRelations" | "transcription" | "translations" | "valency""`,
		);
		expect(await inferred("GermanPendingRelations")).toMatchInlineSnapshot(
			`"type GermanPendingRelations = readonly (PendingSemanticRelation & { target: { language: "de"; }; })[]"`,
		);
		expect(
			await inferred("ProducedNounPendingTargetLanguage"),
		).toMatchInlineSnapshot(
			`"type ProducedNounPendingTargetLanguage = "de""`,
		);
		expect(
			await inferred("KnowledgeContribution", hover),
		).toMatchInlineSnapshot(
			`"type KnowledgeContribution = readonly KnowledgeChange[]"`,
		);
	}, 30_000);
});
