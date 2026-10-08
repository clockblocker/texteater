import { lexeme, locution } from "../../src/de/stts/crosswalk.js";
import type { SttsRoute } from "../../src/de/stts/types.js";

lexeme("VERB");
locution("ADP");

// @ts-expect-error Circumfix is a Morpheme Kind, not a German Lexeme Kind.
lexeme("Circumfix");
// @ts-expect-error Prefix is a Morpheme Kind, not a German Locution Kind.
locution("Prefix");
// @ts-expect-error Transfix is a Hebrew Kind, which German lacks.
lexeme("Transfix");
// @ts-expect-error VREB is no Kind.
lexeme("VREB");

// @ts-expect-error A Lexeme Kind and a Morpheme Family don't make a route.
const uncorrelated: SttsRoute = { family: "Morpheme", kind: "NOUN" };
void uncorrelated;
