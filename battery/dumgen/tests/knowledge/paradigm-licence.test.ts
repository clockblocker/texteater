import { expect, test } from "bun:test";
import { readingIdentityKey } from "dumling";
import { isFree } from "dumrel";
import type * as Dumrel from "dumrel/types";
import {
	applied,
	bankLemma,
	judge,
	later,
	licencesOf,
	storedFor,
} from "./paradigm-support.js";
import { knowledgeInput, knowledgeLuna, produceOnce } from "./support.js";

const mutterLemma = { ...bankLemma, canonicalForm: "Mutter" };

const bench = knowledgeInput(
	bankLemma,
	"🪑",
	"Wir sitzen auf der Bank.",
	["Bank"],
	{ paradigm: { dimensions: ["plural"] } },
);
const lender = knowledgeInput(bankLemma, "🏦", "Die Bank gab ihm Kredit.", [
	"Bank",
]);

test("a Lemma's first Reading writes its forms as variants under an explicit Licence, asking no licence judge (Bank 🪑)", async () => {
	const jev = judge();
	const luna = knowledgeLuna({ plural: ["Bänke"] });
	const { result } = await produceOnce(
		{ jev: jev.ask, luna: luna.ask },
		bench,
	);
	expect(result.failures).toEqual([]);
	expect(jev.stages()).toEqual(["plurality"]);
	expect(result.paradigmChanges).toEqual([
		{
			kind: "Contribute",
			dimension: "plural",
			value: "Bänke",
			provenance: "Produced",
		},
		{
			kind: "License",
			dimension: "plural",
			reading: bench.reading,
			variants: ["bänke"],
		},
	]);
});

test("Bank 🏦 after 🪑: Luna writes Banken without seeing Bänke, the judge sees both, unattributed, and the Reading takes the one it picks", async () => {
	const stored = storedFor(bench.reading, { plural: ["Bänke"] });
	const jev = judge({ plural: ["Banken"] });
	const luna = knowledgeLuna({ plural: ["Banken"] });
	const { result, trace } = await produceOnce(
		{ jev: jev.ask, luna: luna.ask },
		later(lender, stored, [bench.reading], ["plural"]),
	);
	expect(result.failures).toEqual([]);
	expect(JSON.stringify(luna.sent)).not.toContain("Bänke");
	// Luna and the plurality judge first, then one licence request.
	expect(jev.stages()).toEqual(["plurality", "paradigmLicence"]);
	const request = jev.sent[1];
	expect(request?.questions).toEqual({
		plural: {
			type: "choice",
			instructions: expect.objectContaining({
				forms: ["Bänke", "Banken"],
			}),
			criteria: { s0: "Bänke", s1: "Banken", s2: "Bänke and Banken" },
		},
	});
	// Nothing in the request says which Reading holds a form.
	expect(JSON.stringify(request)).not.toContain("🪑");
	expect(result.paradigmChanges).toEqual([
		{
			kind: "Contribute",
			dimension: "plural",
			value: "Banken",
			provenance: "Produced",
		},
		{
			kind: "License",
			dimension: "plural",
			reading: lender.reading,
			variants: ["banken"],
		},
	]);
	const paradigm = applied(
		stored,
		[bench.reading, lender.reading],
		result.paradigmChanges,
	);
	expect(licencesOf(paradigm, lender.reading)).toEqual({
		plural: ["banken"],
	});
	expect(licencesOf(paradigm, bench.reading)).toEqual({ plural: ["bänke"] });
	expect(trace?.events).toContainEqual({
		name: "ParadigmLicence",
		data: expect.objectContaining({
			dimension: "plural",
			outcome: "Judged",
			written: ["Banken"],
			forms: ["Bänke", "Banken"],
			variants: ["banken"],
			added: ["Banken"],
		}),
	});
});

test("Mutter: the judge keeps each sense's own plural, and Luna writing exactly the stored variants licenses them with no judge call", async () => {
	const nut = knowledgeInput(mutterLemma, "🔩", "Die Mutter sitzt fest.", [
		"Mutter",
	]);
	const mother = knowledgeInput(mutterLemma, "👩", "Die Mutter ruft an.", [
		"Mutter",
	]);
	const stored = storedFor(nut.reading, { plural: ["Muttern"] });
	const { result } = await produceOnce(
		{
			jev: judge({ plural: ["Mütter"] }).ask,
			luna: knowledgeLuna({ plural: ["Mütter"] }).ask,
		},
		later(mother, stored, [nut.reading], ["plural"]),
	);
	const paradigm = applied(
		stored,
		[nut.reading, mother.reading],
		result.paradigmChanges,
	);
	expect(licencesOf(paradigm, mother.reading)).toEqual({
		plural: ["mütter"],
	});
	expect(
		isFree(paradigm, [
			readingIdentityKey(nut.reading),
			readingIdentityKey(mother.reading),
		]),
	).toBe(false);

	const jev = judge();
	const matched = await produceOnce(
		{ jev: jev.ask, luna: knowledgeLuna({ plural: ["muttern"] }).ask },
		later(mother, stored, [nut.reading], ["plural"]),
	);
	expect(jev.stages()).toEqual(["plurality"]);
	expect(matched.result.paradigmChanges).toEqual([
		{
			kind: "License",
			dimension: "plural",
			reading: mother.reading,
			variants: ["muttern"],
		},
	]);
	expect(matched.trace?.events).toContainEqual({
		name: "ParadigmLicence",
		data: {
			dimension: "plural",
			outcome: "Matched",
			written: ["muttern"],
			variants: ["muttern"],
			added: [],
		},
	});
});

test("a reused Reading's dimension with stored variants is skipped, its Licence stated or Unstated left alone", async () => {
	const stored = storedFor(bench.reading, { plural: ["Bänke"] });
	const jev = judge();
	const luna = knowledgeLuna({});
	for (const input of [
		// An Unstated Reading reused.
		{
			...later(lender, stored, [bench.reading], ["plural"]),
			origin: "TopUp",
		},
		// A Reading the stored Paradigm already licenses.
		later(bench, stored, [bench.reading], ["plural"]),
	] as const) {
		const { result, trace } = await produceOnce(
			{ jev: jev.ask, luna: luna.ask },
			input,
		);
		expect(result.paradigmChanges).toEqual([]);
		expect(trace?.events).toContainEqual({
			name: "SkippedAspects",
			data: { skipped: ["paradigm.plural"] },
		});
	}
	expect(jev.sent).toEqual([]);
	expect(luna.sent).toEqual([]);
});

test("an Unstated sibling is never licensed: it takes the new variant, as every Unstated Reading takes every variant", async () => {
	const unstated: Dumrel.LemmaParadigm = {
		dimensions: {
			plural: {
				variants: [
					{ id: "bänke", value: "Bänke", provenance: "Produced" },
				],
				licences: {},
			},
		},
	};
	const { result } = await produceOnce(
		{
			jev: judge({ plural: ["Banken"] }).ask,
			luna: knowledgeLuna({ plural: ["Banken"] }).ask,
		},
		later(lender, unstated, [bench.reading], ["plural"]),
	);
	expect(
		result.paradigmChanges.filter(
			(change) =>
				change.kind === "License" &&
				readingIdentityKey(change.reading) !==
					readingIdentityKey(lender.reading),
		),
	).toEqual([]);
	const paradigm = applied(
		unstated,
		[bench.reading, lender.reading],
		result.paradigmChanges,
	);
	expect(licencesOf(paradigm, bench.reading)).toEqual({
		plural: ["banken", "bänke"],
	});
});

test("a marker is offered only alone; an answer naming no option, or past five forms, fails its dimension", async () => {
	const water: Dumrel.LemmaParadigm = {
		dimensions: {
			plural: {
				variants: [
					{
						id: "NoPlural",
						value: "NoPlural",
						provenance: "Produced",
					},
					{ id: "bänke", value: "Bänke", provenance: "Produced" },
				],
				licences: {},
			},
		},
	};
	const jev = judge({ plural: ["Wasser"] });
	const unusable = await produceOnce(
		{ jev: jev.ask, luna: knowledgeLuna({ plural: ["Banken"] }).ask },
		later(lender, water, [bench.reading], ["plural"]),
	);
	expect(jev.sent[1]?.questions.plural).toMatchObject({
		criteria: {
			s0: "Bänke",
			s1: "Banken",
			s2: "no plural: the noun is used in the singular only",
			s3: "Bänke and Banken",
		},
	});
	expect(unusable.result.paradigmChanges).toEqual([]);
	expect(unusable.result.failures).toEqual([
		expect.objectContaining({
			aspect: "plural",
			code: "InvalidModelOutput",
		}),
	]);

	const many = storedFor(bench.reading, {
		plural: ["Bänke", "Bänker", "Bänken", "Bankse", "Banks"],
	});
	const crowded = await produceOnce(
		{
			jev: judge().ask,
			luna: knowledgeLuna({ plural: ["Banken"] }).ask,
		},
		later(lender, many, [bench.reading], ["plural"]),
	);
	expect(crowded.result.failures).toEqual([
		expect.objectContaining({ aspect: "plural", code: "Unresolved" }),
	]);
});

test("a stored Paradigm that is none of the Lemma's, or a Reading of another Lemma, is a Defect raised before anything is asked", async () => {
	const jev = judge();
	const stored = storedFor(bench.reading, { plural: ["Bänke"] });
	const mother = knowledgeInput(mutterLemma, "👩", "Die Mutter ruft an.", [
		"Mutter",
	]);
	for (const input of [
		// The Licence names a Reading the host left out.
		later(lender, stored, [], ["plural"]),
		later(lender, stored, [bench.reading, mother.reading], ["plural"]),
	])
		await expect(
			produceOnce({ jev: jev.ask, luna: knowledgeLuna({}).ask }, input),
		).rejects.toThrow();
	expect(jev.sent).toEqual([]);
});
