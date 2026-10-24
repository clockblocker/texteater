import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { hebrewLanguage } from "../src/he/language.js";
import { accumulateTranslations } from "../src/knowledge/accumulate.js";
import type {
	AccumulateTranslationsInput,
	TranslationAccumulation,
} from "../src/knowledge/types.js";
import type { LanguageModules } from "../src/language-module.js";
import { defaultLunaConfiguration } from "../src/luna.js";
import { requestBudget, runOperation } from "./service-test-adapter.js";

const lemma = {
	unitKind: "Lemma",
	language: "he",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "ספר",
	coreFeatures: { abbr: null, gender: "Masc" },
} as const;
const input: AccumulateTranslationsInput<"he"> = {
	language: "he",
	reading: { unitKind: "Reading", lemma, emojiDescription: "📖" },
	attestation: {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "he",
			lemma,
			normalizedSurface: "ספר",
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
			inflectionalFeatures: { definite: "Ind", number: "Sing" },
		},
		members: [{ attested: "ספר", orthography: "Standard" }],
		realizationCoverage: "Full",
		articleEvidence: null,
	},
	sentence: { segments: [{ text: "ספר" }], target: [0] },
	translations: { ru: ["книга"] },
};
const neverAsk = async (): Promise<never> => {
	throw Error("Dispatch must not reach a model");
};
const models = {
	jev: { ask: neverAsk, model: "jev-1.13.0" },
	luna: { ask: neverAsk, configuration: defaultLunaConfiguration },
};
const run = (modules: LanguageModules, value = input) =>
	Effect.runPromise(
		runOperation(
			"knowledge.accumulateTranslations",
			{ budget: requestBudget(1), payloads: false },
			models,
			accumulateTranslations(value),
			modules,
		),
	);

test("translation accumulation dispatches the unchanged Hebrew occurrence to its language module", async () => {
	let received: AccumulateTranslationsInput<"he"> | undefined;
	const result: TranslationAccumulation<"he"> = {
		changes: [
			{
				kind: "Contribute",
				aspect: "translations",
				language: "ru",
				value: ["книжка"],
			},
		],
		failures: [],
	};
	const modules: LanguageModules = {
		he: {
			...hebrewLanguage,
			accumulateTranslations: (value) => {
				received = value;
				return Effect.succeed(result);
			},
		},
	};
	expect(await run(modules)).toBe(result);
	expect(received).toBe(input);
});

test("translation accumulation refuses an unregistered module before model calls", async () => {
	await expect(run({})).rejects.toThrow(
		"No translation accumulator registered",
	);
});
