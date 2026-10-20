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

const run = (
	lemma: ReturnType<typeof verb>,
	forms: readonly string[] | Error,
	request: { conjugationClass?: null; preterite?: null },
) => {
	const luna = knowledgeLuna({ conjugationClass: forms });
	return produceOnce(
		{ jev: knowledgeJev().ask, luna: luna.ask },
		knowledgeInput(lemma, "🐄", "Sie molk es.", ["molk"], { request }),
	).then((produced) => ({ ...produced, luna }));
};

test("one Präteritum write stores the forms beside the classes they attest (#1209, ADR 0038)", async () => {
	const { result, luna } = await run(verb("melken"), ["molk", "melkte"], {
		conjugationClass: null,
		preterite: null,
	});
	expect(result.failures).toEqual([]);
	expect(result.changes).toEqual([
		{
			kind: "Contribute",
			aspect: "conjugationClass",
			value: ["Strong", "Weak"],
		},
		{ kind: "Contribute", aspect: "preterite", value: ["molk", "melkte"] },
	]);
	expect(luna.aspects()).toEqual(["conjugationClass"]);
});

test("a request for the Präteritum alone stores only the forms", async () => {
	const { result, luna } = await run(verb("aufziehen", "auf"), ["zog auf"], {
		preterite: null,
	});
	expect(result).toMatchObject({
		failures: [],
		changes: [
			{ kind: "Contribute", aspect: "preterite", value: ["zog auf"] },
		],
	});
	expect(luna.aspects()).toEqual(["conjugationClass"]);
});

test("a form Dumrel refuses fails the Präteritum alone, and its class still stands", async () => {
	const { result } = await run(verb("aufziehen", "auf"), ["aufzog"], {
		preterite: null,
		conjugationClass: null,
	});
	expect(result.changes).toEqual([
		{ kind: "Contribute", aspect: "conjugationClass", value: ["Strong"] },
	]);
	expect(result.failures).toEqual([
		expect.objectContaining({
			aspect: "preterite",
			code: "InvalidModelOutput",
		}),
	]);
});

test("a failed write fails both aspects it would fill", async () => {
	const { result } = await run(verb("melken"), Error("down"), {
		preterite: null,
		conjugationClass: null,
	});
	expect(result.changes).toEqual([]);
	expect(
		result.failures.map(({ aspect, code }) => ({ aspect, code })),
	).toEqual([
		{ aspect: "conjugationClass", code: "ProviderFailure" },
		{ aspect: "preterite", code: "ProviderFailure" },
	]);
});
