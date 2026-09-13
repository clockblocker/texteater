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
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

export const DePronounFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		case: DE_FEATURE_SCHEMA.case.extract(["Acc", "Dat", "Gen", "Nom"]),
		number: DE_FEATURE_SCHEMA.number.extract(["Plur", "Sing"]),
		"gender[psor]": DE_FEATURE_SCHEMA.gender.extract([
			"Fem",
			"Masc",
			"Neut",
		]),
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
		gender: DE_FEATURE_SCHEMA.gender.extract(["Fem", "Masc", "Neut"]),
		referenceNumber: DE_FEATURE_SCHEMA.number.extract(["Plur", "Sing"]),
	}).refine(isGermanPronounCore, { error: germanPronounCoreError }),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			reflex: DE_FEATURE_SCHEMA.reflex,
		}),
	),
});

export type DePronounFeatureBags = z.infer<typeof DePronounFeatureBagsSchema>;

type _DePronounFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DePronounFeatureBags>
>;
