import { expect, test } from "bun:test";
import type * as Dumrel from "dumrel/types";
import {
	knowledgeInput,
	knowledgeJev,
	knowledgeLuna,
	produceOnce,
} from "./support.js";

const verb = (canonicalForm: string, hasSepPrefix: string | null = null) => ({
	family: "Lexeme",
	kind: "VERB",
	canonicalForm,
	coreFeatures: { hasSepPrefix },
});

/** What Luna writes for `melken` 🐄: two Präterita, and its other parts. */
const melken = {
	preterite: ["molk", "melkte"],
	presentSingular: {
		first: ["melke"],
		second: ["melkst", "milkst"],
		third: ["melkt", "milkt"],
	},
	pastParticiple: ["gemolken", "gemelkt"],
	subjunctivePast: ["mölke", "melkte"],
};

type Dimension =
	| "preterite"
	| "present1"
	| "present2"
	| "present3"
	| "pastParticiple"
	| "subjunctivePast";

const every: readonly Dimension[] = [
	"preterite",
	"present1",
	"present2",
	"present3",
	"pastParticiple",
	"subjunctivePast",
];

const run = (
	lemma: ReturnType<typeof verb>,
	written: unknown,
	dimensions: readonly Dimension[],
) => {
	const luna = knowledgeLuna({ verbForms: written ?? null });
	return produceOnce(
		{ jev: knowledgeJev().ask, luna: luna.ask },
		knowledgeInput(lemma, "🐄", "Sie molk es.", ["molk"], {
			request: {},
			paradigm: { dimensions },
		}),
	).then((produced) => ({ ...produced, luna }));
};

/** What each produced dimension licenses the Reading, in the order produced. */
const licensedBy = (changes: readonly Dumrel.ParadigmChange[]) =>
	changes.flatMap((change) =>
		change.kind === "License" ? [[change.dimension, change.variants]] : [],
	);

test("one write gives every principal part, a variant per form, licensed to the Reading (#1217, ADR 0048)", async () => {
	const { result, luna } = await run(verb("melken"), melken, every);
	expect(result.failures).toEqual([]);
	expect(result.changes).toEqual([]);
	expect(result.paradigmChanges.slice(0, 3)).toEqual([
		{
			kind: "Contribute",
			dimension: "preterite",
			value: "molk",
			provenance: "Produced",
		},
		{
			kind: "Contribute",
			dimension: "preterite",
			value: "melkte",
			provenance: "Produced",
		},
		{
			kind: "License",
			dimension: "preterite",
			reading: expect.objectContaining({ emojiDescription: "🐄" }),
			variants: ["molk", "melkte"],
		},
	]);
	expect(licensedBy(result.paradigmChanges)).toEqual([
		["preterite", ["molk", "melkte"]],
		["present1", ["melke"]],
		["present2", ["melkst", "milkst"]],
		["present3", ["melkt", "milkt"]],
		["pastParticiple", ["gemolken", "gemelkt"]],
		["subjunctivePast", ["mölke", "melkte"]],
	]);
	expect(luna.aspects()).toEqual(["verbForms"]);
});

test("a request for some dimensions writes only those, in the Paradigm Policy's order", async () => {
	const { result, luna } = await run(verb("melken"), melken, [
		"pastParticiple",
		"preterite",
	]);
	expect(result.failures).toEqual([]);
	expect(licensedBy(result.paradigmChanges)).toEqual([
		["preterite", ["molk", "melkte"]],
		["pastParticiple", ["gemolken", "gemelkt"]],
	]);
	expect(luna.aspects()).toEqual(["verbForms"]);
});

test("a dimension Dumrel refuses or Luna left out fails alone, and the rest stand", async () => {
	const { result } = await run(
		verb("aufziehen", "auf"),
		{
			preterite: ["aufzog"],
			presentSingular: {
				first: ["ziehe auf"],
				second: ["ziehst auf"],
				third: ["zieht auf"],
			},
			pastParticiple: ["gezogen"],
		},
		every,
	);
	expect(licensedBy(result.paradigmChanges)).toEqual([
		["present1", ["ziehe auf"]],
		["present2", ["ziehst auf"]],
		["present3", ["zieht auf"]],
	]);
	expect(
		result.failures.map(({ aspect, code }) => ({ aspect, code })),
	).toEqual([
		{ aspect: "preterite", code: "InvalidModelOutput" },
		{ aspect: "pastParticiple", code: "InvalidModelOutput" },
		{ aspect: "subjunctivePast", code: "InvalidModelOutput" },
	]);
});

test("a write with no usable Präteritum, or none at all, fails every dimension it would fill", async () => {
	for (const [written, code] of [
		[{ ...melken, preterite: [] }, "InvalidModelOutput"],
		[["molk"], "InvalidModelOutput"],
		[Error("down"), "ProviderFailure"],
	] as const) {
		const { result } = await run(verb("melken"), written, [
			"preterite",
			"subjunctivePast",
		]);
		expect(result.paradigmChanges).toEqual([]);
		expect(
			result.failures.map(({ aspect, code }) => ({ aspect, code })),
		).toEqual([
			{ aspect: "preterite", code },
			{ aspect: "subjunctivePast", code },
		]);
	}
});

test("a dimension the route's Paradigm Policy doesn't name is skipped, and principal parts are no Knowledge", async () => {
	const { result, luna } = await run(verb("melken"), melken, []);
	expect(result).toMatchObject({
		changes: [],
		paradigmChanges: [],
		failures: [],
	});
	expect(luna.aspects()).toEqual([]);
	const noun = await produceOnce(
		{ jev: knowledgeJev().ask, luna: knowledgeLuna({}).ask },
		knowledgeInput(
			{
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Haus",
				coreFeatures: { gender: "Neut" },
			},
			"🏠",
			"Das Haus steht.",
			["Haus"],
			{ request: {}, paradigm: { dimensions: ["preterite"] } },
		),
	);
	expect(noun.result).toMatchObject({
		changes: [],
		paradigmChanges: [],
		failures: [],
	});
});
