export { ParsingError } from "dumval/runtime";
export { checkIfGrundform } from "./check-if-grundform.js";
export { GrundformAssessmentError } from "./grundform/result.js";
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
