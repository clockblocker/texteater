export { ParsingError } from "common-utils/validation";
export {
	canonicalFormKey,
	lemmaIdentityKey,
	readingIdentityKey,
	sameLemma,
	sameReading,
} from "./identity.js";
export { parseUnit } from "./parse-unit.js";
export { foldCase, normalizeForm } from "./validation/semantics.js";
export {
	isSyncreticUnit,
	isSyncretism,
	syncretismView,
	syncretize,
} from "./validation/syncretism.js";
