import { z } from "zod";
import { PosSchema } from "../pos.js";
import { MorphemeKindSchema } from "./morpheme-kind.js";
import { SayingKindSchema } from "./saying-kind.js";

/** Lexeme and Locution Kinds are both UPOS tags. */
export const LemmaKindSchema = z.enum([
	...PosSchema.options,
	...SayingKindSchema.options,
	...MorphemeKindSchema.options,
]);
export const LemmaKind = LemmaKindSchema.enum;
export type LemmaKind = z.infer<typeof LemmaKindSchema>;
