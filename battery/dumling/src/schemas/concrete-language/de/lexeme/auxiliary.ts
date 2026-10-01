import type { Assert } from "common-utils";
import { z } from "zod";
import {
	FeatureBagKind,
	featureBagSchema,
	type IsUniversalFeatureBags,
} from "../../../universal/index.js";
import { DeVerbalInflectionalFeatureBagSchema } from "../de-feature-catalog.js";

// AUX is sein, haben and werden, recipient-passive bekommen and causative
// lassen, in grammatical function only. Modals are VERBs (ADR 0026).
export const DeAuxiliaryFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: DeVerbalInflectionalFeatureBagSchema,
});

export type DeAuxiliaryFeatureBags = z.infer<
	typeof DeAuxiliaryFeatureBagsSchema
>;

type _DeAuxiliaryFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeAuxiliaryFeatureBags>
>;
