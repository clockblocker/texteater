import { z } from "zod";
import type { Codec } from "../../../../../core/types";

const yesNoSchema = z.enum(["Yes", "No"]);
const booleanSchema = z.boolean();

export const yesNoAndBoolean = {
	fromInput: (v) => (v ? "Yes" : "No"),
	fromOutput: (v) => v === "Yes",
	inputSchema: booleanSchema,
	outputSchema: yesNoSchema,
} as const satisfies Codec<"Yes" | "No", boolean>;
