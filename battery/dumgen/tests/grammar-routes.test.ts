import { expect, test } from "bun:test";
import { getExperiment } from "dumgen/development";
import { Effect } from "effect";
import { grammarFixture } from "../src/testing.js";
import type { OperationTrace } from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";
import { validateEncounter } from "../src/universal/validation.js";

const examples = [
	["lexeme/noun", "NOUN", "grammar-de-noun-demo-suspended-kinderbuecher"],
	["lexeme/noun", "NOUN", "grammar-de-noun-dev-suspended-typo"],
	["lexeme/noun", "NOUN", "grammar-de-noun-dev-variant-photographie"],
	["phraseme/idiom", "Idiom", "grammar-de-idiom-handtuch-ellipsis-partial"],
	["phraseme/idiom", "Idiom", "grammar-de-idiom-nagel-passive-full"],
	[
		"phraseme/discourse-formula",
		"DiscourseFormula",
		"grammar-de-discourse-formula-demo-es-tut-mir-partial",
	],
	[
		"phraseme/discourse-formula",
		"DiscourseFormula",
		"grammar-de-discourse-formula-dev-guten-morgen-casing-typo",
	],
	["phraseme/proverb", "Proverb", "grammar-de-proverb-demo-grube-partial"],
	["lexeme/other", "X", "grammar-de-x-demo-typo-watevr"],
	[
		"phraseme/collocation",
		"Collocation",
		"grammar-de-coll-anerkennung-participle-typo-full",
	],
] as const;
for (const [route, kind, id] of examples)
	test(`${id}: bounded judgments and only requested missing text`, async () => {
		const golden = getExperiment(`grammatical-resolution/de/${route}`)
			.source.goldenCorpus?.cases[id];
		if (!golden) throw Error(`Missing ${id}`);
		const input = golden.input as {
			markedContext: string;
			members: string[];
		};
		const segments = input.markedContext
			.split(/(<TARGET>.*?<\/TARGET>)/gu)
			.filter(Boolean)
			.map((text) => ({
				kind: text.startsWith("<TARGET>")
					? "ResolvableText"
					: "OpaqueText",
				text: text.startsWith("<TARGET>") ? text.slice(8, -9) : text,
			}));
		const target = {
			family: route.startsWith("lexeme/") ? "Lexeme" : "Phraseme",
			kind,
			memberSegmentIndices: segments.flatMap((segment, index) =>
				segment.kind === "ResolvableText" ? [index] : [],
			),
		};
		const traces: OperationTrace[] = [];
		const output = await Effect.runPromise(
			createDumgen({
				...grammarFixture(golden.idealOutput),
				onOperation: (trace) => traces.push(trace),
			}).resolveGrammar({
				...validateEncounter({
					sentence: { id, language: "de", segments },
					target,
				}),
				contextAvailable: false,
			}),
		);
		const expected = golden.idealOutput as {
			lemma: { canonicalForm: string };
			normalizedMembers: string[];
			realizationCoverage: "Full" | "Partial";
		};
		expect(output.surface.lemma.canonicalForm).toBe(
			expected.lemma.canonicalForm,
		);
		expect(output.surface.normalizedSurface).toBe(
			expected.normalizedMembers.join(" "),
		);
		expect(output.realizationCoverage).toBe(expected.realizationCoverage);
		expect(output.members.map((member) => member.attested)).toEqual(
			input.members,
		);
		const trace = traces[0];
		expect(trace?.calls[0]?.executor).toBe("TypeSafe");
		for (const call of trace?.calls ?? [])
			if (call.request.stage === "generateCanonicalForm") {
				expect(call.request.input).toBeString();
				expect(call.output).toBe(expected.lemma.canonicalForm);
			} else if (call.executor === "Luna") {
				const requested = (
					call.request.input as { needed: Record<string, string> }
				).needed;
				expect(
					Object.keys(requested).every(
						(key) =>
							key === "canonicalForm" ||
							key.startsWith("member_"),
					),
				).toBe(true);
				expect(Object.keys(call.output as object).sort()).toEqual(
					Object.keys(requested).sort(),
				);
			}
	});
