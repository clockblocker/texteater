import { z } from "zod";
import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
} from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

export const DeNounFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		gender: DE_FEATURE_SCHEMA.gender.extract(["Fem", "Masc", "Neut"]),
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
