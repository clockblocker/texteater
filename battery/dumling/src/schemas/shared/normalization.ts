import { z } from "zod";
import { normalizeNfc } from "../../validation-semantics.js";

export function normalizedStringSchema() {
	return z.string().min(1).overwrite(normalizeNfc);
}
