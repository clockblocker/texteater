import { afterAll, describe, expect, test } from "bun:test";
import { closeTestingSessions, inferredType } from "prinfer/testing";
import type { DeNounFeatureBags as SourceDeNounFeatureBags } from "../../src/schemas/concrete-language/de/lexeme/noun.js";
import type {
	UniversalFeatureBag as SourceUniversalFeatureBag,
	UniversalFeatureBags as SourceUniversalFeatureBags,
} from "../../src/schemas/universal/features/catalog.js";

afterAll(closeTestingSessions);

export type DeNounFeatureBags = SourceDeNounFeatureBags;
export type UniversalFeatureBag = SourceUniversalFeatureBag;
export type UniversalFeatureBags = SourceUniversalFeatureBags;

describe("Feature Bag inference", () => {
	test("keeps German noun Feature Bags readable", async () => {
		expect(
			await inferredType(import.meta.url, {
				name: "DeNounFeatureBags",
				full: true,
				backend: "typescript7",
			}),
		).toMatchInlineSnapshot(
			`"type DeNounFeatureBags = { core: { gender: "Fem" | "Masc" | "Neut" | null; hyph: "Yes" | null; }; inflectional: { case: "Acc" | "Dat" | "Gen" | "Nom" | null; number: "Plur" | "Sing" | null; }; }"`,
		);
	}, 30_000);

	test("keeps the universal Feature Bag readable", async () => {
		expect(
			await inferredType(import.meta.url, {
				name: "UniversalFeatureBag",
				full: true,
				backend: "typescript7",
			}),
		).toMatchInlineSnapshot(
			`"type UniversalFeatureBag = { abbr?: FeatureValueSet<"Yes"> | null | undefined; adpType?: FeatureValueSet<"Circ" | "Post" | "Prep" | "Voc"> | null | undefined; animacy?: FeatureValueSet<"Anim" | "Hum" | "Inan" | "Nhum"> | null | undefined; aspect?: FeatureValueSet<"Hab" | "Imp" | "Iter" | "Perf" | "Prog" | "Prosp"> | null | undefined; case?: FeatureValueSet<"Abe" | "Abl" | "Acc" | "Add" | "Ade" | "All" | "Ben" | "Cau" | "Cmp" | "Cns" | "Com" | "Dat" | "Del" | "Dis" | "Ela" | "Equ" | "Ess" | "Gen" | "Ill" | "Ine" | "Ins" | "Lat" | "Loc" | "Nom" | "Par" | "Per" | "Sbe" | "Sbl" | "Spl" | "Sub" | "Sup" | "Tem" | "Ter"> | null | undefined; clusivity?: FeatureValueSet<"Ex" | "In"> | null | undefined; conjType?: FeatureValueSet<"Comp" | "Oper"> | null | undefined; definite?: FeatureValueSet<"Com" | "Cons" | "Def" | "Ind" | "Spec"> | null | undefined; degree?: FeatureValueSet<"Abs" | "Aug" | "Cmp" | "Dim" | "Equ" | "Pos" | "Sup"> | null | undefined; deixis?: FeatureValueSet<"Abv" | "Bel" | "Even" | "Med" | "Nvis" | "Prox" | "Remt"> | null | undefined; deixisRef?: FeatureValueSet<"1" | "2"> | null | undefined; discourseFormulaRole?: FeatureValueSet<"Acknowledgment" | "Apology" | "Farewell" | "Greeting" | "Initiation" | "Reaction" | "Refusal" | "Request" | "Thanks" | "Transition"> | null | undefined; evident?: FeatureValueSet<"Fh" | "Nfh"> | null | undefined; extPos?: FeatureValueSet<"ADJ" | "ADP" | "ADV" | "AUX" | "CCONJ" | "DET" | "INTJ" | "PRON" | "PROPN" | "SCONJ"> | null | undefined; foreign?: FeatureValueSet<"Yes"> | null | undefined; gender?: FeatureValueSet<"Com" | "Fem" | "Masc" | "Neut"> | null | undefined; "gender[psor]"?: FeatureValueSet<"Com" | "Fem" | "Masc" | "Neut"> | null | undefined; governedCase?: FeatureValueSet<"Abe" | "Abl" | "Acc" | "Add" | "Ade" | "All" | "Ben" | "Cau" | "Cmp" | "Cns" | "Com" | "Dat" | "Del" | "Dis" | "Ela" | "Equ" | "Ess" | "Gen" | "Ill" | "Ine" | "Ins" | "Lat" | "Loc" | "Nom" | "Par" | "Per" | "Sbe" | "Sbl" | "Spl" | "Sub" | "Sup" | "Tem" | "Ter"> | null | undefined; hasGovPrep?: FeatureValueSet<string> | null | undefined; hasSepPrefix?: FeatureValueSet<string> | null | undefined; hebBinyan?: FeatureValueSet<"HIFIL" | "HITPAEL" | "HUFAL" | "NIFAL" | "PAAL" | "PIEL" | "PUAL"> | null | undefined; hebExistential?: FeatureValueSet<"Yes"> | null | undefined; hyph?: FeatureValueSet<"Yes"> | null | undefined; lexicallyReflexive?: FeatureValueSet<"Yes"> | null | undefined; mood?: FeatureValueSet<"Adm" | "Cnd" | "Des" | "Imp" | "Ind" | "Int" | "Irr" | "Jus" | "Nec" | "Opt" | "Pot" | "Prp" | "Qot" | "Sub"> | null | undefined; nounClass?: FeatureValueSet<"Bantu1" | "Bantu10" | "Bantu11" | "Bantu12" | "Bantu13" | "Bantu14" | "Bantu15" | "Bantu16" | "Bantu17" | "Bantu18" | "Bantu19" | "Bantu2" | "Bantu20" | "Bantu21" | "Bantu22" | "Bantu23" | "Bantu3" | "Bantu4" | "Bantu5" | "Bantu6" | "Bantu7" | "Bantu8" | "Bantu9" | "Wol1" | "Wol10" | "Wol11" | "Wol12" | "Wol2" | "Wol3" | "Wol4" | "Wol5" | "Wol6" | "Wol7" | "Wol8" | "Wol9"> | null | undefined; numForm?: FeatureValueSet<"Combi" | "Digit" | "Roman" | "Word"> | null | undefined; numType?: FeatureValueSet<"Card" | "Dist" | "Frac" | "Mult" | "Ord" | "Range" | "Sets"> | null | undefined; number?: FeatureValueSet<"Coll" | "Count" | "Dual" | "Grpa" | "Grpl" | "Inv" | "Pauc" | "Plur" | "Ptan" | "Sing" | "Tri"> | null | undefined; "number[psor]"?: FeatureValueSet<"Coll" | "Count" | "Dual" | "Grpa" | "Grpl" | "Inv" | "Pauc" | "Plur" | "Ptan" | "Sing" | "Tri"> | null | undefined; partType?: FeatureValueSet<"Inf" | "Mod" | "Res" | "Vbp"> | null | undefined; person?: FeatureValueSet<"0" | "1" | "2" | "3" | "4"> | null | undefined; phrasal?: FeatureValueSet<"Yes"> | null | undefined; polarity?: FeatureValueSet<"Neg" | "Pos"> | null | undefined; polite?: FeatureValueSet<"Elev" | "Form" | "Humb" | "Infm"> | null | undefined; poss?: FeatureValueSet<"Yes"> | null | undefined; prefix?: FeatureValueSet<"Yes"> | null | undefined; pronType?: FeatureValueSet<"Art" | "Dem" | "Emp" | "Exc" | "Ind" | "Int" | "Neg" | "Prs" | "Rcp" | "Rel" | "Tot"> | null | undefined; punctType?: FeatureValueSet<"Brck" | "Colo" | "Comm" | "Dash" | "Elip" | "Excl" | "Peri" | "Qest" | "Quot"> | null | undefined; referenceGender?: FeatureValueSet<"Com" | "Fem" | "Masc" | "Neut"> | null | undefined; referenceNumber?: FeatureValueSet<"Coll" | "Count" | "Dual" | "Grpa" | "Grpl" | "Inv" | "Pauc" | "Plur" | "Ptan" | "Sing" | "Tri"> | null | undefined; reflex?: FeatureValueSet<"Yes"> | null | undefined; style?: FeatureValueSet<"Arch" | "Coll" | "Expr" | "Form" | "Rare" | "Slng" | "Vrnc" | "Vulg"> | null | undefined; tense?: FeatureValueSet<"Fut" | "Imp" | "Past" | "Pqp" | "Pres"> | null | undefined; variant?: FeatureValueSet<"Short"> | null | undefined; verbForm?: FeatureValueSet<"Conv" | "Fin" | "Gdv" | "Ger" | "Inf" | "Part" | "Sup" | "Vnoun"> | null | undefined; verbType?: FeatureValueSet<"Aux" | "Cop" | "Light" | "Mod" | "Quasi"> | null | undefined; voice?: FeatureValueSet<"Act" | "Antip" | "Bfoc" | "Cau" | "Dir" | "Inv" | "Lfoc" | "Mid" | "Pass" | "Rcp"> | null | undefined; }"`,
		);
	}, 30_000);

	test("keeps the universal Feature Bags container readable", async () => {
		expect(
			await inferredType(import.meta.url, {
				name: "UniversalFeatureBags",
				full: true,
				backend: "typescript7",
			}),
		).toMatchInlineSnapshot(
			`"type UniversalFeatureBags = { core: UniversalFeatureBag; inflectional?: UniversalFeatureBag | undefined; }"`,
		);
	}, 30_000);
});
