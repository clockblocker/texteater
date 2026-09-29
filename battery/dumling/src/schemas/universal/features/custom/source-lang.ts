import { z } from "zod";

/**
 * The language a Foreign unit comes from, as a lowercase ISO 639 code of two
 * or three letters (`en`, `fr`, `la`, `yi`, `grc`), or `und` when it can't be
 * told (`ok`, `lol`). Any ISO 639 language may appear, not only the languages
 * Dumling supports, so only the code's shape is checked (ADR 0045).
 */
export const SourceLangSchema = z.string().regex(/^[a-z]{2,3}$/u);
