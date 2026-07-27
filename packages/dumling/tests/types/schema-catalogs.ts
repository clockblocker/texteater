import type { z } from "zod/v3";
import { getSchemaTreeFor, schemasFor } from "../../src/schema";
import type { Lemma, Selection, Surface } from "../../src/types/public-types";

schemasFor.de.entity.Lemma.Lexeme.ADJ() satisfies z.ZodType<
	Lemma<"de", "Lexeme", "ADJ">
>;

schemasFor.de.entity.Surface.Inflection.Lexeme.ADJ() satisfies z.ZodType<
	Surface<"de", "Inflection", "Lexeme", "ADJ">
>;

schemasFor.de.entity.Selection.Inflection.Lexeme.ADJ() satisfies z.ZodType<
	Selection<"de", "Inflection", "Lexeme", "ADJ">
>;

getSchemaTreeFor("en").descriptor.Lemma.Lexeme.NOUN satisfies z.ZodType<{
	language: "en";
	lemmaKind: "Lexeme";
	lemmaSubKind: "NOUN";
}>;

// @ts-expect-error ADP has no inflection surface schema in German.
schemasFor.de.entity.Surface.Inflection.Lexeme.ADP;

// @ts-expect-error schema trees only expose concrete lemma subkinds.
schemasFor.de.entity.Lemma.Lexeme.FOO;
