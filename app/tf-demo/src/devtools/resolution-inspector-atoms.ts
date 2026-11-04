import * as Schema from "effect/Schema";
import { localStorageAtom } from "@/lib/local-storage-atoms";

/**
 * Whether the resolution inspector lists only runs that generated, hiding
 * stored-result selections. It persists across reloads.
 */
export const generatingOnlyAtom = localStorageAtom({
	key: "tf-demo:resolution-inspector:generating-only",
	schema: Schema.Boolean,
	defaultValue: () => false,
});
