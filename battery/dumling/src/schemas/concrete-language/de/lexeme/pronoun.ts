import type { Assert } from "common-utils";
import { z } from "zod";
import {
	germanPronounCoreError,
	isGermanPronounCore,
} from "../../../../validation/semantics.js";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import {
	FeatureBagKind,
	featureBagSchema,
	featureValueSetSchema,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

// LEO separates antecedent/possessor coordinates from the pronoun's own case.
// Attributive genitives fit extPos DET without borrowing the following noun's agreement.
// ADR 0018 chooses Core identity coordinates; LEO does not prescribe Lemma granularity.
// System ADR 0032: a pillar (personal, der-series, wer) sets case, number and
// gender in Core; a stem word (dieser, keiner, meiner) marks them on its Surfaces.
// A Lemma is decidable from the word and its sentence's grammar, never from
// what a pronoun refers to (ADR 0018, 2026-09-25): ihm serves er and es, so its
// gender is the set Masc, Neut, and possessor features describe the Surface.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/RelInter/RelPron-der-die-das.xml?lang=de
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Posses/index.html?lang=de
const gender = DE_FEATURE_SCHEMA.gender.extract(["Fem", "Masc", "Neut"]);
export const DePronounFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		case: DE_FEATURE_SCHEMA.case.extract(["Acc", "Dat", "Gen", "Nom"]),
		number: DE_FEATURE_SCHEMA.number.extract(["Plur", "Sing"]),
		extPos: DE_FEATURE_SCHEMA.extPos.extract(["DET"]),
		foreign: DE_FEATURE_SCHEMA.foreign,
		person: DE_FEATURE_SCHEMA.person.extract(["1", "2", "3"]),
		polite: DE_FEATURE_SCHEMA.polite.extract(["Form", "Infm"]),
		poss: DE_FEATURE_SCHEMA.poss,
		pronType: DE_FEATURE_SCHEMA.pronType.extract([
			"Dem",
			"Ind",
			"Int",
			"Neg",
			"Prs",
			"Rcp",
			"Rel",
			"Tot",
		]),
		gender: featureValueSetSchema(gender),
	}).refine(isGermanPronounCore, { error: germanPronounCoreError }),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			case: DE_FEATURE_SCHEMA.case.extract(["Acc", "Dat", "Gen", "Nom"]),
			gender,
			number: DE_FEATURE_SCHEMA.number.extract(["Plur", "Sing"]),
			"gender[psor]": featureValueSetSchema(gender),
			"number[psor]": DE_FEATURE_SCHEMA.number.extract(["Plur", "Sing"]),
			reflex: DE_FEATURE_SCHEMA.reflex,
		}),
	),
});

export type DePronounFeatureBags = z.infer<typeof DePronounFeatureBagsSchema>;

type _DePronounFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DePronounFeatureBags>
>;
