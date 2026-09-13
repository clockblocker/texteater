import type { Assert } from "common-utils";
import { z } from "zod";
import {
	FeatureBagKind,
	type IsUniversalFeatureBags,
} from "../../../universal/index.js";
import {
	DE_FEATURE_SCHEMA,
	DeVerbalInflectionalFeatureBagSchema,
} from "../de-feature-catalog.js";

const DeAuxiliaryCoreFeatureBagSchema = z.strictObject({
	verbType: DE_FEATURE_SCHEMA.modalVerbType.nullable(),
});

export const DeAuxiliaryFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: DeAuxiliaryCoreFeatureBagSchema,
	[FeatureBagKind.Inflectional]: DeVerbalInflectionalFeatureBagSchema,
});

export type DeAuxiliaryFeatureBags = z.infer<
	typeof DeAuxiliaryFeatureBagsSchema
>;

type _DeAuxiliaryFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeAuxiliaryFeatureBags>
>;
