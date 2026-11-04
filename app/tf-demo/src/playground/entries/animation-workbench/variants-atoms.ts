import * as Schema from "effect/Schema";
import { localStorageAtom } from "@/lib/local-storage-atoms";
import { VariantSchema } from "./variants";

/**
 * The workbench's saved variants, kept across reloads. A knob a narrowed
 * range no longer allows is dropped; a variant that is not one at all reads
 * the whole list as empty until the next save.
 */
export const variantsAtom = localStorageAtom({
	key: "deck-motion-variants-v1",
	schema: Schema.Array(VariantSchema),
	defaultValue: () => [],
});
