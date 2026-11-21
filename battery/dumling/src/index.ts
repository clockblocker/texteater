export {
	canonicalFormKey,
	foldCase,
	lemmaIdentityKey,
	readingIdentityKey,
	sameLemma,
	sameReading,
} from "./identity.js";
export { parseUnit } from "./parse-unit.js";
export { routeOf } from "./route-of.js";
export {
	cellBundleOf,
	cellKeyOf,
	parseTableSchemaFor,
} from "./table-schema.js";
export { normalizeForm } from "./validation/semantics.js";
export {
	isSyncreticUnit,
	isSyncretism,
	syncretismView,
	syncretize,
} from "./validation/syncretism.js";
export { zeroEndingCanonicalForm } from "./zero-ending.js";
