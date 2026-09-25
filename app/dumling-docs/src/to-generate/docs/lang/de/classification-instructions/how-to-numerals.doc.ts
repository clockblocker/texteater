import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const fuenften = specExample("de/er-wog-vielleicht-ein-halbes-lot", 3);
const keinem = specExample("de/mit-keinem-wort-erwaehnte-sie-den-plan");
const einmal = specExample("de/sieh-einmal-hier-steht-er", 1);
const zweien = specExample("de/und-minz-und-maunz-die-schreien", 4);
const viele = specExample("de/viele-kamen-zu-spaet");

const document = defineLanguageOverlayPage({
	description: "Classification notes for German numeral-like attestations.",
	family: "scope",
	order: 111,
	subject: "how-to-numerals",
	title: "How To Handle Numerals",
	body: `Follow UD precisely when classifying.`,
	examples: [zweien, fuenften, einmal],
	subsections: [
		{
			body: "Numeral-adjacent quantifiers can still be `DET` or `PRON` when that is their real behavior.",
			examples: [keinem, viele],
		},
	],
});

export default document;
