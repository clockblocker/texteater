import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { requestBudget, runOperation } from "../src/call.js";
import { germanLanguage } from "../src/de/language.js";
import {
	type LanguageModules,
	languageModuleOf,
} from "../src/language-module.js";

test("module lookup refuses inherited names instead of dispatching to object prototypes", () => {
	expect(languageModuleOf({}, "toString" as "de")).toBeUndefined();
});

import { isSegmentLanguage } from "../src/languages.js";
import { defaultLunaConfiguration } from "../src/luna.js";
import { resolveReading } from "../src/resolve/reading.js";
import type { ResolveReadingInput } from "../src/resolve/types.js";
import { segmentRouteOf } from "../src/segment/segmented-sentence.js";
import { fakeJev, fakeLuna, sentenceOf, unitOf } from "./resolve/support.js";

test("language support is read from the module registry", () => {
	expect(isSegmentLanguage("de")).toBe(true);
	expect(isSegmentLanguage("he")).toBe(true);
	expect(isSegmentLanguage("en")).toBe(false);
	expect(isSegmentLanguage("toString")).toBe(false);
});

test("a validated Hebrew route remains Hebrew at the shared segmentation boundary", () => {
	expect(
		segmentRouteOf({ language: "he", family: "Lexeme", kind: "NOUN" }),
	).toEqual({
		language: "he",
		family: "Lexeme",
		kind: "NOUN",
	});
});

const input: ResolveReadingInput = {
	attestation: {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "de",
			lemma: {
				unitKind: "Lemma",
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Buch",
				coreFeatures: { gender: "Neut" },
			},
			normalizedSurface: "Buch",
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
			inflectionalFeatures: null,
		},
		members: [{ attested: "Buch", orthography: "Standard" }],
		realizationCoverage: "Full",
		articleEvidence: null,
		valencyEvidence: [],
	},
	sentence: sentenceOf("Buch"),
	unit: unitOf([0], "Lexeme/NOUN"),
	candidates: [],
};

// A registered handler, not a model mock: shared Reading dispatch must invoke
// the language module just as grammar and Knowledge already do.
test("Reading dispatch invokes the registered language handler without reaching German models", async () => {
	const models = {
		jev: { ask: fakeJev().ask, model: "jev-1.13.0" },
		luna: { ask: fakeLuna().ask, configuration: defaultLunaConfiguration },
	};
	let received: ResolveReadingInput | undefined;
	const modules: LanguageModules = {
		de: {
			...germanLanguage({}),
			resolveReading: (_scope, _models, value) => {
				received = value;
				return Effect.succeed({
					_tag: "Reuse",
					emojiDescription: "📚",
				});
			},
		},
	};
	const result = await Effect.runPromise(
		runOperation(
			"resolve.reading",
			{
				budget: requestBudget(1),
				payloads: false,
			},
			(scope) => resolveReading(scope, models, modules, input),
		),
	);
	expect(result).toEqual({ _tag: "Reuse", emojiDescription: "📚" });
	expect(received).toBe(input);
});
