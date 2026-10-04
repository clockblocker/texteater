import { z } from "zod";
import { FeatureBagKind, featureBags } from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

// A Foreign unit's only Core Feature is the language it comes from, always
// set. It never inflects: its one Surface is its Canonical Form (ADR 0045).
export const DeForeignFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: z.strictObject({
		sourceLang: DE_FEATURE_SCHEMA.sourceLang,
	}),
});
