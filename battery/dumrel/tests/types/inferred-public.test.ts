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
export type MorphologicalTree = NonNullable<
	Dumrel.ReadingKnowledge["morphologicalTree"]
>;
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
const hover = { full: false, backend: "typescript7" } as const;
const inferred = (name: string, options: typeof full | typeof hover = full) =>
	inferredType(import.meta.url, { name, ...options });

describe("public Dumrel types read as their Domain names", () => {
	test("a Pending Semantic Relation names its relation and Unit Shadow", () => {
		expect(inferred("PendingSemanticRelation")).toMatchInlineSnapshot(
			`"type PendingSemanticRelation = { relation: DirectSemanticRelation; target: UnitShadow; }"`,
		);
		expect(inferred("DirectSemanticRelation")).toMatchInlineSnapshot(
			`"type DirectSemanticRelation = "antonym" | "endonym" | "holonym" | "hypernym" | "nearAntonym" | "nearSynonym" | "synonym""`,
		);
	}, 30_000);

	test("Reading Knowledge lists its aspects by their public types", () => {
		expect(inferred("ReadingKnowledge")).toMatchInlineSnapshot(
			`"type ReadingKnowledge = { transcription?: string | undefined; definition?: string | undefined; translations?: { en?: string[] | undefined; ru?: string[] | undefined; } | undefined; morphologicalTree?: MorphologicalTree | undefined; semanticRelations?: SemanticRelations | undefined; valency?: ValencySlot[] | undefined; participleSource?: ParticipleSource | undefined; plural?: NounPlural | undefined; conjugationClass?: ConjugationClasses | undefined; locutionType?: LocutionType | undefined; sayingType?: SayingType | undefined; formulaRole?: FormulaRole | undefined; }"`,
		);
		expect(inferred("MorphologicalTree")).toMatchInlineSnapshot(
			`"type MorphologicalTree = { root: { nodeKind: "structure"; children: MorphologicalTreeNode[]; }; }"`,
		);
		expect(inferred("ValencySlot")).toMatchInlineSnapshot(
			`"type ValencySlot = { status: ValencySlotStatus; complements: ValencyComplement[]; }"`,
		);
		expect(inferred("ValencyComplement")).toMatchInlineSnapshot(
			`"type ValencyComplement = { kind: "Case"; governedCase: "Acc" | "Dat" | "Gen" | "Nom"; referent: ValencyReferent; } | { kind: "Preposition"; preposition: { unitKind: "Lemma"; language: "de"; family: "Lexeme"; kind: "ADP"; canonicalForm: string; coreFeatures: Record<string, never>; }; governedCase: GovernedCase; referent: ValencyReferent; } | { kind: "Adverbial"; standIn: "Irgendwie" | "IrgendwieLange" | "IrgendwieViel" | "Irgendwo" | "Irgendwohin"; } | { kind: "Predicative"; of: "Object" | "Subject"; marker: "Als" | "Für" | "None"; } | { kind: "Clause"; form: "BareInfinitive" | "Dass" | "Ob" | "W" | "ZuInfinitive"; correlate?: "Optional" | "Required" | undefined; } | { kind: "Subject"; referent: ValencyReferent; } | { kind: "DirectObject"; referent: ValencyReferent; } | { kind: "Preposition"; preposition: { unitKind: "Lemma"; language: "he"; family: "Lexeme"; kind: "ADP"; canonicalForm: string; coreFeatures: { abbr: "Yes" | null; case: "Acc" | "Gen" | null; }; }; referent: ValencyReferent; } | { kind: "Subject"; referent: ValencyReferent; } | { kind: "DirectObject"; referent: ValencyReferent; } | { kind: "IndirectObject"; referent: ValencyReferent; } | { kind: "Preposition"; preposition: { unitKind: "Lemma"; language: "en"; family: "Lexeme"; kind: "ADP"; canonicalForm: string; coreFeatures: { abbr: "Yes" | null; extPos: "ADP" | "ADV" | "SCONJ" | null; }; }; referent: ValencyReferent; }"`,
		);
	}, 30_000);

	test("Knowledge Settings and Request Masks spell out every aspect", () => {
		expect(inferred("KnowledgeSettings")).toMatchInlineSnapshot(
			`"type KnowledgeSettings = { transcription?: boolean | undefined; definition?: boolean | undefined; morphologicalTree?: boolean | undefined; valency?: boolean | undefined; participleSource?: boolean | undefined; plural?: boolean | undefined; conjugationClass?: boolean | undefined; locutionType?: boolean | undefined; sayingType?: boolean | undefined; formulaRole?: boolean | undefined; translations?: { en?: boolean | undefined; ru?: boolean | undefined; } | undefined; semanticRelations?: { synonym?: boolean | undefined; nearSynonym?: boolean | undefined; antonym?: boolean | undefined; nearAntonym?: boolean | undefined; hypernym?: boolean | undefined; hyponym?: boolean | undefined; meronym?: boolean | undefined; holonym?: boolean | undefined; endonym?: boolean | undefined; exonym?: boolean | undefined; } | undefined; }"`,
		);
		expect(inferred("KnowledgeRequestMask")).toMatchInlineSnapshot(
			`"type KnowledgeRequestMask = { transcription?: null | undefined; definition?: null | undefined; morphologicalTree?: null | undefined; valency?: null | undefined; participleSource?: null | undefined; plural?: null | undefined; conjugationClass?: null | undefined; locutionType?: null | undefined; sayingType?: null | undefined; formulaRole?: null | undefined; translations?: { en?: null | undefined; ru?: null | undefined; } | undefined; semanticRelations?: { synonym?: null | undefined; nearSynonym?: null | undefined; antonym?: null | undefined; nearAntonym?: null | undefined; hypernym?: null | undefined; hyponym?: null | undefined; meronym?: null | undefined; holonym?: null | undefined; endonym?: null | undefined; exonym?: null | undefined; } | undefined; }"`,
		);
	}, 30_000);

	test("a Knowledge Change reads as its branches", () => {
		expect(inferred("KnowledgeChange", hover)).toMatchInlineSnapshot(
			`"type KnowledgeChange = { kind: "Contribute" | "Correct"; aspect: "definition" | "transcription"; value: string; } | { kind: "Retract"; aspect: "definition" | "transcription"; } | { kind: "Contribute" | "Correct"; aspect: "translations"; language: TranslationLanguage; value: string[]; } | ... 18 more ... | { ...; }"`,
		);
		expect(inferred("ScalarKnowledgeChange")).toMatchInlineSnapshot(
			`"type ScalarKnowledgeChange = { kind: "Contribute" | "Correct"; aspect: "definition" | "transcription"; value: string; } | { kind: "Retract"; aspect: "definition" | "transcription"; } | { kind: "Contribute" | "Correct"; aspect: "translations"; language: TranslationLanguage; value: string[]; } | { kind: "Retract"; aspect: "translations"; language: TranslationLanguage; } | { kind: "Contribute" | "Correct"; aspect: "valency"; value: ValencySlot[]; } | { kind: "Retract"; aspect: "valency"; complement?: ValencyComplement | undefined; } | { kind: "Contribute" | "Correct"; aspect: "participleSource"; value: ParticipleSource; } | { kind: "Retract"; aspect: "participleSource"; } | { kind: "Contribute" | "Correct"; aspect: "plural"; value: NounPlural; } | { kind: "Retract"; aspect: "plural"; } | { kind: "Contribute" | "Correct"; aspect: "conjugationClass"; value: ConjugationClasses; } | { kind: "Retract"; aspect: "conjugationClass"; } | { kind: "Contribute" | "Correct"; aspect: "locutionType"; value: LocutionType; } | { kind: "Contribute" | "Correct"; aspect: "sayingType"; value: SayingType; } | { kind: "Contribute" | "Correct"; aspect: "formulaRole"; value: FormulaRole; } | { kind: "Retract"; aspect: "formulaRole" | "locutionType" | "sayingType"; } | { kind: "Contribute" | "Correct"; aspect: "morphologicalTree"; value: MorphologicalTree; } | { kind: "Retract"; aspect: "morphologicalTree"; }"`,
		);
		expect(inferred("NounSynonymTargetCoordinates")).toMatchInlineSnapshot(
			`"type NounSynonymTargetCoordinates = { language: "de"; family: "Lexeme" | "Locution"; }"`,
		);
	}, 30_000);
});
