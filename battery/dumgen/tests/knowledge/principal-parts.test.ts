import { expect, test } from "bun:test";
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
	coreFeatures: { hasSepPrefix, lexicallyReflexive: null },
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

type Request = Partial<
	Record<
		| "conjugationClass"
		| "preterite"
		| "presentSingular"
		| "pastParticiple"
		| "subjunctivePast",
		null
	>
>;

const every: Request = {
	conjugationClass: null,
	preterite: null,
	presentSingular: null,
	pastParticiple: null,
	subjunctivePast: null,
};

const run = (
	lemma: ReturnType<typeof verb>,
	written: unknown,
	request: Request,
) => {
	const luna = knowledgeLuna({ verbForms: written ?? null });
	return produceOnce(
		{ jev: knowledgeJev().ask, luna: luna.ask },
		knowledgeInput(lemma, "🐄", "Sie molk es.", ["molk"], { request }),
	).then((produced) => ({ ...produced, luna }));
};

test("one write stores every principal part beside the classes the Präteritum attests (#1217, ADR 0038)", async () => {
	const { result, luna } = await run(verb("melken"), melken, every);
	expect(result.failures).toEqual([]);
	expect(result.changes).toEqual([
		{
			kind: "Contribute",
			aspect: "conjugationClass",
			value: ["Strong", "Weak"],
		},
		{ kind: "Contribute", aspect: "preterite", value: melken.preterite },
		{
			kind: "Contribute",
			aspect: "presentSingular",
			value: melken.presentSingular,
		},
		{
			kind: "Contribute",
			aspect: "pastParticiple",
			value: melken.pastParticiple,
		},
		{
			kind: "Contribute",
			aspect: "subjunctivePast",
			value: melken.subjunctivePast,
		},
	]);
	expect(luna.aspects()).toEqual(["verbForms"]);
});

test("conjugation classes come from the Präteritum Luna writes, judged on the stem (ADR 0038)", async () => {
	const { result } = await run(
		verb("aufziehen", "auf"),
		{ ...melken, preterite: ["zog auf"] },
		{ conjugationClass: null },
	);
	expect(result.changes).toEqual([
		{ kind: "Contribute", aspect: "conjugationClass", value: ["Strong"] },
	]);
});

test("a request for some parts stores only those", async () => {
	const { result, luna } = await run(verb("melken"), melken, {
		pastParticiple: null,
		preterite: null,
	});
	expect(result).toMatchObject({
		failures: [],
		changes: [
			{ kind: "Contribute", aspect: "preterite" },
			{ kind: "Contribute", aspect: "pastParticiple" },
		],
	});
	expect(result.changes).toHaveLength(2);
	expect(luna.aspects()).toEqual(["verbForms"]);
});

test("a part Dumrel refuses or Luna left out fails alone, and the rest stand", async () => {
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
	expect(result.changes).toEqual([
		{ kind: "Contribute", aspect: "conjugationClass", value: ["Strong"] },
		{
			kind: "Contribute",
			aspect: "presentSingular",
			value: {
				first: ["ziehe auf"],
				second: ["ziehst auf"],
				third: ["zieht auf"],
			},
		},
	]);
	expect(
		result.failures.map(({ aspect, code }) => ({ aspect, code })),
	).toEqual([
		{ aspect: "preterite", code: "InvalidModelOutput" },
		{ aspect: "pastParticiple", code: "InvalidModelOutput" },
		{ aspect: "subjunctivePast", code: "InvalidModelOutput" },
	]);
});

test("a write with no usable Präteritum, or none at all, fails every part it would fill", async () => {
	for (const [written, code] of [
		[{ ...melken, preterite: [] }, "InvalidModelOutput"],
		[["molk"], "InvalidModelOutput"],
		[Error("down"), "ProviderFailure"],
	] as const) {
		const { result } = await run(verb("melken"), written, {
			preterite: null,
			conjugationClass: null,
			subjunctivePast: null,
		});
		expect(result.changes).toEqual([]);
		expect(
			result.failures.map(({ aspect, code }) => ({ aspect, code })),
		).toEqual([
			{ aspect: "conjugationClass", code },
			{ aspect: "preterite", code },
			{ aspect: "subjunctivePast", code },
		]);
	}
});
