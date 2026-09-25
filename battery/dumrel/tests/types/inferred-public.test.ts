import { afterAll, describe, expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import { closeTestingSessions, inferredType } from "prinfer/testing";

afterAll(closeTestingSessions);

type NounReading = Dumling.Reading<"de", "Lexeme", "NOUN">;

export type PendingSemanticRelation = Dumrel.PendingSemanticRelation;
export type DirectSemanticRelation = Dumrel.DirectSemanticRelation;
export type ReadingKnowledge = Dumrel.ReadingKnowledge;
export type KnowledgeSettings = Dumrel.KnowledgeSettings;
export type KnowledgeRequestMask = Dumrel.KnowledgeRequestMask;
export type MorphologicalTree = Dumrel.MorphologicalTree;
export type ValencySlot = Dumrel.ValencySlot;
export type ValencyComplement = Dumrel.ValencyComplement;
export type KnowledgeChange = Dumrel.KnowledgeChange;
export type ScalarKnowledgeChange = Exclude<
	Dumrel.KnowledgeChange,
	{ aspect: "semanticRelations" }
>;
type NounSynonymReadingChange = Extract<
	Dumrel.KnowledgeChange<NounReading>,
	{
		kind: "Contribute" | "Correct";
		relation: "synonym";
		targetKind: "reading";
	}
>;
export type NounSynonymTargetCoordinates = Pick<
	NounSynonymReadingChange["value"][number]["lemma"],
	"language" | "family"
>;

const full = { full: true, backend: "typescript7" } as const;
const hover = { backend: "typescript7" } as const;
const inferred = (name: string, options: typeof full | typeof hover = full) =>
	inferredType(import.meta.url, { name, ...options });

describe("public Dumrel types read as their Domain names", () => {
	test("a Pending Semantic Relation names its relation and Unit Shadow", async () => {
		expect(await inferred("PendingSemanticRelation")).toMatchInlineSnapshot(
			`"type PendingSemanticRelation = { relation: DirectSemanticRelation; target: UnitShadow; }"`,
		);
		expect(await inferred("DirectSemanticRelation")).toMatchInlineSnapshot(
			`"type DirectSemanticRelation = "antonym" | "holonym" | "hypernym" | "nearAntonym" | "nearSynonym" | "synonym""`,
		);
	}, 30_000);

	test("Reading Knowledge lists its aspects by their public types", async () => {
		expect(await inferred("ReadingKnowledge")).toMatchInlineSnapshot(
			`"type ReadingKnowledge = { transcription?: string | undefined; definition?: string | undefined; translations?: { en?: string[] | undefined; ru?: string[] | undefined; } | undefined; morphologicalTree?: MorphologicalTree | undefined; lexicalBreakdown?: [LexemeUnitShadow, LexemeUnitShadow, ...LexemeUnitShadow[]] | undefined; semanticRelations?: SemanticRelations | undefined; valency?: ValencySlot[] | undefined; participleSource?: ParticipleSource | undefined; }"`,
		);
		expect(await inferred("MorphologicalTree")).toMatchInlineSnapshot(
			`"type MorphologicalTree = { root: { nodeKind: "structure"; children: MorphologicalTreeNode[]; }; }"`,
		);
		expect(await inferred("ValencySlot")).toMatchInlineSnapshot(
			`"type ValencySlot = { status: ValencySlotStatus; complement: ValencyComplement; }"`,
		);
		expect(await inferred("ValencyComplement")).toMatchInlineSnapshot(
			`"type ValencyComplement = { kind: "Case"; case: "Acc" | "Dat" | "Gen" | "Nom"; referent: ValencyReferent; } | { kind: "Preposition"; preposition: { unitKind: "Lemma"; language: "de"; family: "Lexeme"; kind: "ADP"; canonicalForm: string; coreFeatures: { abbr: "Yes" | null; adpType: "Circ" | "Post" | "Prep" | null; extPos: "ADV" | "SCONJ" | null; foreign: "Yes" | null; governedCase: "Abe" | "Abl" | "Acc" | "Add" | "Ade" | "All" | "Ben" | "Cau" | "Cmp" | "Cns" | "Com" | "Dat" | "Del" | "Dis" | "Ela" | "Equ" | "Ess" | "Gen" | "Ill" | "Ine" | "Ins" | "Lat" | "Loc" | "Nom" | "Par" | "Per" | "Sbe" | "Sbl" | "Spl" | "Sub" | "Sup" | "Tem" | "Ter" | null; partType: "Vbp" | null; }; } | { unitKind: "Lemma"; language: "en"; family: "Lexeme"; kind: "ADP"; canonicalForm: string; coreFeatures: { abbr: "Yes" | null; extPos: "ADP" | "ADV" | "SCONJ" | null; }; } | { unitKind: "Lemma"; language: "he"; family: "Lexeme"; kind: "ADP"; canonicalForm: string; coreFeatures: { abbr: "Yes" | null; case: "Acc" | "Gen" | null; }; }; case: GovernedCase; referent: ValencyReferent; }"`,
		);
	}, 30_000);

	test("Knowledge Settings and Request Masks spell out every aspect", async () => {
		expect(await inferred("KnowledgeSettings")).toMatchInlineSnapshot(
			`"type KnowledgeSettings = { transcription?: boolean | undefined; definition?: boolean | undefined; morphologicalTree?: boolean | undefined; lexicalBreakdown?: boolean | undefined; valency?: boolean | undefined; participleSource?: boolean | undefined; translations?: { en?: boolean | undefined; ru?: boolean | undefined; } | undefined; semanticRelations?: { synonym?: boolean | undefined; nearSynonym?: boolean | undefined; antonym?: boolean | undefined; nearAntonym?: boolean | undefined; hypernym?: boolean | undefined; hyponym?: boolean | undefined; meronym?: boolean | undefined; holonym?: boolean | undefined; } | undefined; }"`,
		);
		expect(await inferred("KnowledgeRequestMask")).toMatchInlineSnapshot(
			`"type KnowledgeRequestMask = { transcription?: null | undefined; definition?: null | undefined; morphologicalTree?: null | undefined; lexicalBreakdown?: null | undefined; valency?: null | undefined; participleSource?: null | undefined; translations?: { en?: null | undefined; ru?: null | undefined; } | undefined; semanticRelations?: { synonym?: null | undefined; nearSynonym?: null | undefined; antonym?: null | undefined; nearAntonym?: null | undefined; hypernym?: null | undefined; hyponym?: null | undefined; meronym?: null | undefined; holonym?: null | undefined; } | undefined; }"`,
		);
	}, 30_000);

	test("a Knowledge Change reads as its branches", async () => {
		expect(await inferred("KnowledgeChange", hover)).toMatchInlineSnapshot(
			`"type KnowledgeChange = { kind: "Contribute" | "Correct"; aspect: "definition" | "transcription"; value: string; } | { kind: "Retract"; aspect: "definition" | "transcription"; } | { kind: "Contribute" | "Correct"; aspect: "translations"; language: TranslationLanguage; value: string[]; } | ... 11 more ... | { ...; }"`,
		);
		expect(await inferred("ScalarKnowledgeChange")).toMatchInlineSnapshot(
			`"type ScalarKnowledgeChange = { kind: "Contribute" | "Correct"; aspect: "definition" | "transcription"; value: string; } | { kind: "Retract"; aspect: "definition" | "transcription"; } | { kind: "Contribute" | "Correct"; aspect: "translations"; language: TranslationLanguage; value: string[]; } | { kind: "Retract"; aspect: "translations"; language: TranslationLanguage; } | { kind: "Contribute" | "Correct"; aspect: "valency"; value: ValencySlot[]; } | { kind: "Retract"; aspect: "valency"; complement?: ValencyComplement | undefined; } | { kind: "Contribute" | "Correct"; aspect: "participleSource"; value: ParticipleSource; } | { kind: "Retract"; aspect: "participleSource"; } | { kind: "Contribute" | "Correct"; aspect: "morphologicalTree"; value: MorphologicalTree; } | { kind: "Contribute" | "Correct"; aspect: "lexicalBreakdown"; value: [LexemeUnitShadow, LexemeUnitShadow, ...LexemeUnitShadow[]]; } | { kind: "Retract"; aspect: "lexicalBreakdown" | "morphologicalTree"; }"`,
		);
		expect(
			await inferred("NounSynonymTargetCoordinates"),
		).toMatchInlineSnapshot(
			`"type NounSynonymTargetCoordinates = { language: "de"; family: "Lexeme"; }"`,
		);
	}, 30_000);
});
