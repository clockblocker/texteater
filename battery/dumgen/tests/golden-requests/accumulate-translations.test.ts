import { test } from "bun:test";
import type { AccumulateTranslationsInput } from "../../src/knowledge/types.js";
import { knowledgeInput } from "../knowledge/support.js";
import {
	expectGolden,
	type JevAnswerer,
	type LunaAnswerer,
	recorded,
} from "./support.js";

const noun = {
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Strauß",
	coreFeatures: { gender: "Masc" },
};

const verb = {
	family: "Lexeme",
	kind: "VERB",
	canonicalForm: "laufen",
	coreFeatures: { hasSepPrefix: null, lexicallyReflexive: null },
};

/** An accumulation input for a Reading of `shape` in one Sentence. */
function occurrence(
	shape: Parameters<typeof knowledgeInput>[0],
	emoji: string,
	text: string,
	target: readonly string[],
	translations: AccumulateTranslationsInput["translations"],
): AccumulateTranslationsInput {
	const { reading, attestation, sentence } = knowledgeInput(
		shape,
		emoji,
		text,
		target,
	);
	return { language: "de", reading, attestation, sentence, translations };
}

/** An accumulation input for the bouquet Reading in one Sentence. */
const bouquet = (translations: AccumulateTranslationsInput["translations"]) =>
	occurrence(
		noun,
		"💐",
		"Sie bekam einen Strauß zum Geburtstag.",
		["Strauß"],
		translations,
	);

/** jev's pick per translation language, from the request's state. */
const picking =
	(picks: Readonly<Record<string, string>>): JevAnswerer =>
	({ state }) =>
		picks[String(state.language)] ?? "NoMatch";

/** Luna's Sentence translation and equivalents per translation language. */
const writing =
	(equivalents: Readonly<Record<string, readonly string[]>>): LunaAnswerer =>
	({ input }) => {
		const { language } = input as { readonly language: string };
		return {
			sentence: `(${language}) She got a bunch of flowers for her birthday.`,
			equivalents: equivalents[language] ?? [],
		};
	};

const accumulate = (
	input: AccumulateTranslationsInput,
	answers: { readonly jev: JevAnswerer; readonly luna?: LunaAnswerer },
) =>
	recorded(
		(dumgen) => dumgen.knowledge.accumulateTranslations(input),
		answers,
	);

test("knowledge.accumulateTranslations sends the golden requests", async () => {
	await expectGolden("accumulate-translations", {
		// jev's pick ends the language; nothing is written.
		covered: await accumulate(
			bouquet({ en: ["bouquet", "bunch of flowers", "Bouquet "] }),
			{ jev: picking({ en: "t1" }) },
		),
		// Each language on its own: en after NoMatch, ru covered.
		added: await accumulate(
			bouquet({ en: ["bouquet"], ru: ["букет", "пучок"] }),
			{
				jev: picking({ ru: "t0" }),
				luna: writing({ en: ["Bunch  of Flowers", "posy", "posy"] }),
			},
		),
		// Luna writes only what the language holds: nothing is added.
		contained: await accumulate(
			bouquet({ en: ["bouquet", "bunch of flowers"] }),
			{ jev: picking({}), luna: writing({ en: ["Bouquet"] }) },
		),
		// Luna answers no equivalent: a failure value for its language.
		failed: await accumulate(bouquet({ en: ["bouquet"], ru: ["букет"] }), {
			jev: picking({}),
			luna: writing({ ru: ["цветы"] }),
		}),
		verb: await accumulate(
			occurrence(verb, "🏃", "Er läuft jeden Morgen.", ["läuft"], {
				en: ["run", "jog"],
				ru: ["бегать"],
			}),
			{
				jev: picking({ en: "t1" }),
				luna: writing({ ru: ["бегать", "бежать"] }),
			},
		),
	});
});
