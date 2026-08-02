import { describe, expect, test } from "bun:test";
import { runCodegen } from "codegen";
import { z } from "zod";

import {
	defineExperiment,
	defineGoldenCaseCollection,
	defineGoldenCaseGroup,
	defineGoldenCorpus,
	defineLocalDemonstrations,
	definePromptSource,
} from "../../src/promptsmith/assembly";
import { systemPromptRecipe } from "../../src/promptsmith/assembly/generate-system-prompts";
import { corpus as readingResolutionCorpus } from "../../src/promptsmith/laboratory/prompt-source/reading-resolution/de/golden-corpus/corpus";
import {
	demonstrations as readingResolutionDemonstrations,
	promptSource as readingResolutionPromptSource,
} from "../../src/promptsmith/laboratory/prompt-source/reading-resolution/de/prompt-source";

const inputSchema = z.strictObject({ text: z.string().min(1) });
const outputSchema = z.strictObject({ value: z.string().min(1) });

type Case = {
	readonly input: { readonly text: string };
	readonly idealOutput: { readonly value: string };
	readonly explanation?: string;
	readonly contaminationKeys?: readonly string[];
};

function corpus(
	cases: Readonly<Record<string, Case>>,
	options: {
		readonly route?: string;
		readonly groups?: Readonly<
			Record<string, Readonly<Record<string, Case>>>
		>;
		readonly fingerprintInput?: (input: {
			readonly text: string;
		}) => string;
	} = {},
) {
	const groups = Object.fromEntries(
		Object.entries(options.groups ?? {}).map(([name, groupCases]) => [
			name,
			defineGoldenCaseGroup(groupCases),
		]),
	);
	return defineGoldenCorpus({
		route: options.route ?? "test/route",
		inputSchema,
		outputSchema,
		collections: {
			test: defineGoldenCaseCollection(import.meta.url, {
				groups,
				cases,
			}),
		},
		...(options.fingerprintInput === undefined
			? {}
			: { fingerprintInput: options.fingerprintInput }),
	});
}

function promptSource(
	goldenCorpus: ReturnType<typeof corpus>,
	ids: readonly string[],
) {
	return definePromptSource({
		route: goldenCorpus.route,
		inputSchema,
		outputSchema,
		body: "Do the thing.",
		goldenCorpus,
		demonstrations: goldenCorpus.select(ids),
	});
}

describe("Golden Corpus", () => {
	test("parses cases and rejects malformed corpus content", () => {
		expect(() =>
			corpus({
				invalid: { input: { text: "" }, idealOutput: { value: "x" } },
			}),
		).toThrow(/invalid input/);
		expect(() =>
			corpus({
				first: { input: { text: "same" }, idealOutput: { value: "a" } },
				second: {
					input: { text: "same" },
					idealOutput: { value: "b" },
				},
			}),
		).toThrow(/duplicate exact parsed-input fingerprints.*first.*second/);
		expect(() =>
			corpus(
				{
					known: {
						input: { text: "known" },
						idealOutput: { value: "x" },
					},
				},
				{
					groups: {
						invalid: {
							known: {
								input: { text: "duplicate" },
								idealOutput: { value: "x" },
							},
						},
					},
				},
			),
		).toThrow(
			/repeats case ID "known".*group "invalid".*collection "test"/,
		);
		expect(() =>
			corpus({
				invalid: {
					input: { text: "key" },
					idealOutput: { value: "x" },
					contaminationKeys: [" "],
				},
			}),
		).toThrow(/invalid contamination key/);
		expect(() =>
			corpus({
				invalid: {
					input: { text: "duplicate-key" },
					idealOutput: { value: "x" },
					contaminationKeys: ["shared", " shared "],
				},
			}),
		).toThrow(/repeats contamination key "shared"/);
		const normalized = corpus({
			normalized: {
				input: { text: "normalized-key" },
				idealOutput: { value: "x" },
				contaminationKeys: [" shared "],
			},
		});
		expect(normalized.cases.normalized?.contaminationKeys).toEqual([
			"shared",
		]);
		expect(() =>
			corpus({
				invalid: {
					input: { text: "explanation" },
					idealOutput: { value: "x" },
					explanation: "  ",
				},
			}),
		).toThrow(/empty explanation/);
		expect(() =>
			corpus({
				" ": { input: { text: "id" }, idealOutput: { value: "x" } },
			}),
		).toThrow(/Golden Case ID must not be empty/);

		const first = defineGoldenCaseCollection("first.ts", {
			cases: {
				shared: {
					input: { text: "first" },
					idealOutput: { value: "x" },
				},
			},
		});
		const second = defineGoldenCaseCollection("second.ts", {
			groups: {
				related: defineGoldenCaseGroup({
					shared: {
						input: { text: "second" },
						idealOutput: { value: "x" },
					},
				}),
			},
			cases: {},
		});
		expect(() =>
			defineGoldenCorpus({
				route: "test/route",
				inputSchema,
				outputSchema,
				collections: { first, second },
			}),
		).toThrow(
			/repeats case ID "shared".*collection "first".*collection "second" group "related"/,
		);
	});

	test("implements immutable, ordered CaseSelection algebra", () => {
		const goldenCorpus = corpus({
			a: { input: { text: "a" }, idealOutput: { value: "a" } },
			b: { input: { text: "b" }, idealOutput: { value: "b" } },
			c: { input: { text: "c" }, idealOutput: { value: "c" } },
		});
		const left = goldenCorpus.select(["b", "a"]);
		const right = goldenCorpus.select(["a", "c"]);

		expect(left.ids).toEqual(["b", "a"]);
		expect(left.union(right).ids).toEqual(["b", "a", "c"]);
		expect(left.intersection(right).ids).toEqual(["a"]);
		expect(left.difference(right).ids).toEqual(["b"]);
		expect(goldenCorpus.collections.test.ids).toEqual(["a", "b", "c"]);
		expect(left.isDisjointFrom(right)).toBe(false);
		expect(left.isEmpty).toBe(false);
		expect(goldenCorpus.select([]).isEmpty).toBe(true);
		expect(Object.isFrozen(left.ids)).toBe(true);
		expect(Object.isFrozen(left.cases)).toBe(true);
		expect(Object.isFrozen(left.cases[0])).toBe(true);
		expect(Object.isFrozen(goldenCorpus.collections)).toBe(true);

		const groupedCorpus = corpus(
			{ c: { input: { text: "c" }, idealOutput: { value: "c" } } },
			{
				groups: {
					related: {
						a: {
							input: { text: "a" },
							idealOutput: { value: "a" },
						},
						b: {
							input: { text: "b" },
							idealOutput: { value: "b" },
						},
					},
				},
			},
		);
		expect(groupedCorpus.collections.test.ids).toEqual(["a", "b", "c"]);
		expect(groupedCorpus.groups.test.related?.ids).toEqual(["a", "b"]);

		const other = corpus({
			a: { input: { text: "other" }, idealOutput: { value: "a" } },
		});
		expect(() => left.union(other.select(["a"]))).toThrow(
			/different Golden Corpora/,
		);
	});
});

describe("Prompt Experiments", () => {
	test("runs the complete ADP collection not used as demonstrations", () => {
		const evaluation = readingResolutionCorpus.collections.adp.difference(
			readingResolutionDemonstrations,
		);

		expect(evaluation.ids).toEqual([
			"reading-de-adp-um-clock-time",
			"reading-de-adp-nach-sensory-characteristic",
			"reading-de-adp-vor-broad-precedence",
			"reading-de-adp-vor-cause",
			"reading-de-adp-gegen-counteraction",
			"reading-de-adp-gegen-approximation",
		]);
		expect(() =>
			defineExperiment({
				promptSource: readingResolutionPromptSource,
				evaluation,
				evaluator: () => true,
			}),
		).not.toThrow();
	});

	test("binds evaluation selections to the Prompt Source's canonical corpus", () => {
		const canonical = corpus({
			demo: { input: { text: "demo" }, idealOutput: { value: "x" } },
		});
		const foreign = corpus({
			eval: { input: { text: "eval" }, idealOutput: { value: "x" } },
		});
		expect(() =>
			defineExperiment({
				promptSource: promptSource(canonical, ["demo"]),
				evaluation: foreign.select(["eval"]),
				evaluator: () => true,
			}),
		).toThrow(/canonical Golden Corpus.*foreign corpus/);
	});

	test("rejects every contamination channel", () => {
		const idCorpus = corpus({
			shared: { input: { text: "same-id" }, idealOutput: { value: "x" } },
		});
		expect(() =>
			defineExperiment({
				promptSource: promptSource(idCorpus, ["shared"]),
				evaluation: idCorpus.select(["shared"]),
				evaluator: () => true,
			}),
		).toThrow(/"shared".*"shared".*case ID/);

		const exactCorpus = corpus({
			eval: { input: { text: "same" }, idealOutput: { value: "x" } },
		});
		const localDemonstrations = defineLocalDemonstrations({
			inputSchema,
			outputSchema,
			cases: [{ input: { text: "same" }, idealOutput: { value: "x" } }],
		});
		const exactPromptSource = definePromptSource({
			route: exactCorpus.route,
			inputSchema,
			outputSchema,
			body: "Do the thing.",
			goldenCorpus: exactCorpus,
			demonstrations: localDemonstrations,
		});
		expect(() =>
			defineExperiment({
				promptSource: exactPromptSource,
				evaluation: exactCorpus.select(["eval"]),
				evaluator: () => true,
			}),
		).toThrow(
			/local demonstration 1.*"eval".*exact parsed-input fingerprint/,
		);

		const fingerprint = (input: { readonly text: string }) =>
			input.text.toLowerCase();
		const routeCorpus = corpus(
			{
				demo: { input: { text: "SAME" }, idealOutput: { value: "x" } },
				eval: { input: { text: "same" }, idealOutput: { value: "x" } },
			},
			{ fingerprintInput: fingerprint },
		);
		expect(() =>
			defineExperiment({
				promptSource: promptSource(routeCorpus, ["demo"]),
				evaluation: routeCorpus.select(["eval"]),
				evaluator: () => true,
			}),
		).toThrow(/"demo".*"eval".*route-specific fingerprint/);

		const keyCorpus = corpus({
			demo: {
				input: { text: "demo" },
				idealOutput: { value: "x" },
				contaminationKeys: ["shared-stimulus"],
			},
			eval: {
				input: { text: "eval" },
				idealOutput: { value: "x" },
				contaminationKeys: ["shared-stimulus"],
			},
		});
		expect(() =>
			defineExperiment({
				promptSource: promptSource(keyCorpus, ["demo"]),
				evaluation: keyCorpus.select(["eval"]),
				evaluator: () => true,
			}),
		).toThrow(/"demo".*"eval".*contamination key/);
	});

	test("validates local demonstrations and held-out-only corpora", () => {
		expect(() =>
			defineLocalDemonstrations({
				inputSchema,
				outputSchema,
				cases: [{ input: { text: "" }, idealOutput: { value: "x" } }],
			}),
		).toThrow(/local demonstration 1 has invalid input/);

		const heldOutCorpus = corpus({
			eval: { input: { text: "eval" }, idealOutput: { value: "x" } },
		});
		const zeroShotSource = definePromptSource({
			route: heldOutCorpus.route,
			inputSchema,
			outputSchema,
			body: "Do the thing.",
			goldenCorpus: heldOutCorpus,
		});
		expect(() =>
			defineExperiment({
				promptSource: zeroShotSource,
				evaluation: heldOutCorpus.select(["eval"]),
				evaluator: () => true,
			}),
		).not.toThrow();

		const otherInputSchema = z.strictObject({ text: z.string().min(1) });
		expect(() =>
			defineExperiment({
				promptSource: {
					...zeroShotSource,
					inputSchema: otherInputSchema,
				},
				evaluation: heldOutCorpus.select(["eval"]),
				evaluator: () => true,
			} as never),
		).toThrow(/share the same schema instances/);
	});

	test("does not treat composition groups as contamination", () => {
		const goldenCorpus = corpus(
			{},
			{
				groups: {
					related: {
						demo: {
							input: { text: "demo" },
							idealOutput: { value: "x" },
						},
						eval: {
							input: { text: "eval" },
							idealOutput: { value: "x" },
						},
					},
				},
			},
		);
		expect(goldenCorpus.groups.test.related?.ids).toEqual(["demo", "eval"]);
		expect(() =>
			defineExperiment({
				promptSource: promptSource(goldenCorpus, ["demo"]),
				evaluation: goldenCorpus.select(["eval"]),
				evaluator: () => true,
			}),
		).not.toThrow();
	});

	test("derives generated provenance from selected demonstration modules", async () => {
		const result = await runCodegen(systemPromptRecipe, { mode: "check" });
		const localArtifact = result.plan.artifacts.find(
			({ meta }) => meta.route === "segmentation/de",
		);
		const localPaths =
			localArtifact?.provenance.flatMap((provenance) =>
				provenance.kind === "source" ? [provenance.path] : [],
			) ?? [];
		expect(localPaths.some((path) => path.includes("golden-corpus"))).toBe(
			false,
		);

		const artifact = result.plan.artifacts.find(
			({ meta }) => meta.route === "reading-resolution/de",
		);
		expect(artifact).toBeDefined();
		const paths =
			artifact?.provenance.flatMap((provenance) =>
				provenance.kind === "source" ? [provenance.path] : [],
			) ?? [];
		expect(paths.some((path) => path.endsWith("prompt-source.ts"))).toBe(
			true,
		);
		expect(paths.some((path) => path.endsWith("schemas.ts"))).toBe(true);
		expect(
			paths.some((path) => path.endsWith("golden-corpus/corpus.ts")),
		).toBe(true);
		expect(paths.some((path) => path.endsWith("cases/lexeme.ts"))).toBe(
			true,
		);
		expect(paths.some((path) => path.endsWith("cases/adp.ts"))).toBe(true);
		expect(paths.some((path) => path.endsWith("cases/phraseme.ts"))).toBe(
			false,
		);
	});
});
