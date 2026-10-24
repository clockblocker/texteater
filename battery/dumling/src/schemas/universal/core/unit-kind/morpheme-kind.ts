import { z } from "zod";

/**
 * The Morpheme Kinds, the school labels of a Morphemic Breakdown among them
 * (system ADR 0051). Each language picks the Kinds that apply to it.
 * `Ending` is a word's inflectional ending in its Canonical Form, a zero
 * ending included; German picks it.
 */
export const MorphemeKindSchema = z.enum([
	"Root",
	"Prefix",
	"Suffix",
	"Suffixoid",
	"Infix",
	"Circumfix",
	"Interfix",
	"Ending",
	"Transfix",
	"ToneMarking",
	"Duplifix",
]);
