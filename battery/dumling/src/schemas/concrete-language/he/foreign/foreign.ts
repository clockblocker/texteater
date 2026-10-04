import { z } from "zod";
import { FeatureBagKind, featureBags } from "../../../universal/index.js";
import { HE_FEATURE_SCHEMA } from "../he-feature-catalog.js";

// A Foreign unit's only Core Feature is the language it comes from, always
// set. It never inflects: its one Surface is its Canonical Form (ADR 0045).
export const HeForeignFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: z.strictObject({
		sourceLang: HE_FEATURE_SCHEMA.sourceLang,
	}),
});
