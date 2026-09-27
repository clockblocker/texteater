import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import {
	FeatureBagKind,
	featureBagSchema,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

// A DET Locution (was für ein) is a stem: one Lemma whose Surfaces mark case,
// number and gender, under the closed-class rule (ADR 0039).
export const DeDeterminerLocutionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			case: DE_FEATURE_SCHEMA.case.extract(["Acc", "Dat", "Gen", "Nom"]),
			gender: DE_FEATURE_SCHEMA.gender.extract(["Fem", "Masc", "Neut"]),
			number: DE_FEATURE_SCHEMA.number.extract(["Plur", "Sing"]),
		}),
	),
});

export type DeDeterminerLocutionFeatureBags = z.infer<
	typeof DeDeterminerLocutionFeatureBagsSchema
>;

type _DeDeterminerLocutionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeDeterminerLocutionFeatureBags>
>;
