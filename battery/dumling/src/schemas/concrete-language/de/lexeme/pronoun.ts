import {
	germanPronounCoreError,
	isGermanPronounCore,
} from "../../../../validation/semantics.js";
import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
	featureValueSetSchema,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

// LEO separates antecedent/possessor coordinates from the pronoun's own case.
// System ADR 0044 chooses Core identity coordinates; LEO does not prescribe Lemma granularity.
// System ADR 0032: a pillar (personal, der-series) sets case, number and
// gender in Core; a stem word (dieser, keiner, meiner, wer) marks them on its Surfaces.
// wer and was fix their inherent gender in Core, Masc and Neut, and mark case
// on the Surface.
// A cell whose form er and es share (ihm, seiner), and der-series dem and
// dessen, stays split by gender, and the referent decides between them (system
// ADR 0044). A referent no text settles attests the form's Syncretism (system
// ADR 0046).
// Possessor features describe a possessive's Surface: sein- serves Masc and Neut.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/RelInter/RelPron-der-die-das.xml?lang=de
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Posses/index.html?lang=de
export const DePronounFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		case: DE_FEATURE_SCHEMA.case,
		number: DE_FEATURE_SCHEMA.number,
		person: DE_FEATURE_SCHEMA.person,
		polite: DE_FEATURE_SCHEMA.polite,
		poss: DE_FEATURE_SCHEMA.poss,
		// Art is DET only (system ADR 0032, 0040).
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
		gender: DE_FEATURE_SCHEMA.gender,
	}).refine(isGermanPronounCore, { error: germanPronounCoreError }),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			case: DE_FEATURE_SCHEMA.case,
			gender: DE_FEATURE_SCHEMA.gender,
			number: DE_FEATURE_SCHEMA.number,
			"gender[psor]": featureValueSetSchema(DE_FEATURE_SCHEMA.gender),
			"number[psor]": DE_FEATURE_SCHEMA.number,
		}),
	),
});
