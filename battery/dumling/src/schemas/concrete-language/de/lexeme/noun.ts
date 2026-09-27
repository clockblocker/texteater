import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

export const DeNounFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		gender: DE_FEATURE_SCHEMA.gender.extract(["Fem", "Masc", "Neut"]),
		hyph: DE_FEATURE_SCHEMA.hyph,
	}),
	// A noun Surface is the noun's own form; its article is an attested
	// member, not a feature (ADR 0040). A noun whose Lemma has no gender,
	// such as an adjectival noun for a person, marks on a singular Surface
	// the gender its form shows (der Reisende).
	[FeatureBagKind.Inflectional]: z.strictObject({
		case: DE_FEATURE_SCHEMA.case
			.extract(["Acc", "Dat", "Gen", "Nom"])
			.nullable(),
		gender: DE_FEATURE_SCHEMA.gender
			.extract(["Fem", "Masc", "Neut"])
			.nullable(),
		number: DE_FEATURE_SCHEMA.number.extract(["Plur", "Sing"]).nullable(),
	}),
});

export type DeNounFeatureBags = z.infer<typeof DeNounFeatureBagsSchema>;

type _DeNounFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeNounFeatureBags>
>;
