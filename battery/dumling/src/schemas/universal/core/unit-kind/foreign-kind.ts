import { z } from "zod";

/** The Foreign Family has one Kind: foreign material has no part of speech in the text's language (ADR 0045). */
export const ForeignKindSchema = z.enum(["Foreign"]);
