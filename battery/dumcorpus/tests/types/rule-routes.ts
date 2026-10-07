import { lexeme, locution } from "../../src/de/rules.js";

lexeme("VERB", "NOUN");
locution("VERB", "ADP");

// @ts-expect-error Circumfix is a Morpheme Kind, not a German Lexeme Kind.
lexeme("Circumfix");
// @ts-expect-error Prefix is a Morpheme Kind, not a German Locution Kind.
locution("Prefix");
// @ts-expect-error VREB is no Kind.
lexeme("VREB");
