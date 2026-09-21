import { z } from "zod";
import { PosSchema } from "../pos.js";
import { MorphemeKindSchema } from "./morpheme-kind.js";
import { PhrasemeKindSchema } from "./phraseme-kind.js";

export const LemmaKindSchema = z.enum([
	...PosSchema.options,
	...PhrasemeKindSchema.options,
	...MorphemeKindSchema.options,
]);
export const LemmaKind = LemmaKindSchema.enum;
export type LemmaKind = z.infer<typeof LemmaKindSchema>;
