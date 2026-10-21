import { expect, test } from "bun:test";
import type { Question } from "@typesafe-ai/sdk";
import { isRecord } from "common-utils";
import { readingIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import {
	applyParadigmChanges,
	isFree,
	licensed,
	paradigmChangesFor,
} from "dumrel";
import type * as Dumrel from "dumrel/types";
import type { ProduceKnowledgeInput } from "../../src/knowledge/types.js";
import {
	knowledgeInput,
	knowledgeJev,
	knowledgeLuna,
	produceOnce,
} from "./support.js";

const bank = {
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem" },
};
const mutter = { ...bank, canonicalForm: "Mutter" };
const verb = (canonicalForm: string) => ({
	family: "Lexeme",
	kind: "VERB",
	canonicalForm,
	coreFeatures: { hasSepPrefix: null, lexicallyReflexive: null },
});
const senden = verb("senden");
const melken = verb("melken");

type Forms = Partial<Record<Dumrel.DimensionId, readonly string[]>>;
const verbDimensions: readonly Dumrel.DimensionId[] = [
	"preterite",
	"present1",
	"present2",
	"present3",
	"pastParticiple",
	"subjunctivePast",
];

/** The Paradigm `changes` leave on `paradigm`, Dumrel checking them. */
function applied(
	paradigm: Dumrel.LemmaParadigm,
	readings: readonly Dumling.Reading<"de">[],
	changes: readonly Dumrel.ParadigmChange[],
): Dumrel.LemmaParadigm {
	const [first] = readings;
	if (!first) throw Error("No Reading");
	const result = applyParadigmChanges({
		lemma: first.lemma,
		readings,
		paradigm,
		changes,
	});
	if (!result.success) throw result.error;
	return result.value;
}

/** A Lemma Paradigm whose one Reading licenses `forms` explicitly. */
function storedFor(
	reading: Dumling.Reading<"de">,
	forms: Forms,
): Dumrel.LemmaParadigm {
	return applied(
		{ dimensions: {} },
		[reading],
		Object.entries(forms).flatMap(([dimension, values]) =>
			paradigmChangesFor({
				reading,
				dimension: dimension as Dumrel.DimensionId,
				values: values ?? [],
				provenance: "Produced",
			}),
		),
	);
}

/** A judge that takes each form by its Noul, a form it doesn't list at 0. */
const judge = (takes: Readonly<Record<string, number>>) =>
	knowledgeJev((_, question: Question) => {
		if (question.type !== "noul") return undefined;
		const form = isRecord(question.instructions)
			? String(question.instructions.form)
			: "";
		return { noul: takes[form] ?? 0 };
	});

/** What the Reading licenses, per dimension, once `changes` apply. */
function licencesOf(
	paradigm: Dumrel.LemmaParadigm,
	reading: Dumling.Reading<"de">,
): Forms {
	return Object.fromEntries(
		Object.keys(paradigm.dimensions).map((dimension) => [
			dimension,
			licensed(
				paradigm,
				dimension as Dumrel.DimensionId,
				readingIdentityKey(reading),
			),
		]),
	);
}

const later = <E>(
	input: ProduceKnowledgeInput<E>,
	stored: Dumrel.LemmaParadigm,
	readings: readonly Dumling.Reading<"de">[],
	dimensions: readonly Dumrel.DimensionId[],
): ProduceKnowledgeInput<E> => ({
	...input,
	paradigm: { dimensions, stored, readings },
});

const bench = knowledgeInput(bank, "🪑", "Wir sitzen auf der Bank.", ["Bank"], {
	paradigm: { dimensions: ["plural"] },
});
const lender = knowledgeInput(bank, "🏦", "Die Bank gab ihm Kredit.", ["Bank"]);

test("a Lemma's first Reading writes its forms as variants under an explicit Licence, asking no licence judge (Bank 🪑)", async () => {
	const jev = judge({});
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

test("a later Reading the judge finds no stored variant for gets Luna's forms, written without the stored ones, and the first keeps its Licence (Bank 🏦)", async () => {
	const stored = storedFor(bench.reading, { plural: ["Bänke"] });
	const jev = judge({ Bänke: 0.04 });
	const luna = knowledgeLuna({ plural: ["Banken"] });
	const { result, trace } = await produceOnce(
		{ jev: jev.ask, luna: luna.ask },
		later(lender, stored, [bench.reading], ["plural"]),
	);
	expect(result.failures).toEqual([]);
	// One judge request, then Luna, which never sees the stored Bänke.
	expect(jev.stages()).toEqual(["paradigmLicence", "plurality"]);
	expect(jev.sent[0]?.questions).toEqual({
		l0_0: {
			type: "noul",
			instructions: expect.objectContaining({ form: "Bänke" }),
		},
	});
	expect(JSON.stringify(luna.sent)).not.toContain("Bänke");
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
		data: {
			dimension: "plural",
			outcome: "NoMatch",
			nouls: { bänke: 0.04 },
			written: ["Banken"],
			added: ["Banken"],
		},
	});
});

test("Mutter: each sense's later Reading writes its own plural, and a stored form Luna writes again is licensed, not added", async () => {
	const nut = knowledgeInput(mutter, "🔩", "Die Mutter sitzt fest.", [
		"Mutter",
	]);
	const mother = knowledgeInput(mutter, "👩", "Die Mutter ruft an.", [
		"Mutter",
	]);
	const stored = storedFor(nut.reading, { plural: ["Muttern"] });
	const { result } = await produceOnce(
		{
			jev: judge({ Muttern: 0.1 }).ask,
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

	// The judge missed, Luna wrote the stored form: the Reading takes it, nothing new.
	const missed = await produceOnce(
		{
			jev: judge({ Muttern: 0.2 }).ask,
			luna: knowledgeLuna({ plural: ["Muttern"] }).ask,
		},
		later(mother, stored, [nut.reading], ["plural"]),
	);
	expect(missed.trace?.events).toContainEqual(
		expect.objectContaining({
			name: "ParadigmLicence",
			data: expect.objectContaining({ written: ["Muttern"], added: [] }),
		}),
	);
});

const letter = knowledgeInput(senden, "📨", "Sie sandte ihm einen Brief.", [
	"sandte",
]);
const broadcast = knowledgeInput(senden, "📡", "Das Radio sendete Musik.", [
	"sendete",
]);
const sendenForms = {
	letter: {
		preterite: ["sandte", "sendete"],
		present1: ["sende"],
		present2: ["sendest"],
		present3: ["sendet"],
		pastParticiple: ["gesandt", "gesendet"],
		subjunctivePast: ["sendete"],
	},
	broadcast: {
		preterite: ["sendete"],
		present1: ["sende"],
		present2: ["sendest"],
		present3: ["sendet"],
		pastParticiple: ["gesendet"],
		subjunctivePast: ["sendete"],
	},
} satisfies Readonly<Record<string, Forms>>;

test("senden 📡 after 📨: the judge's one request takes a subset of the stored variants, and no Luna call is made", async () => {
	const stored = storedFor(letter.reading, sendenForms.letter);
	const jev = judge({
		sendete: 0.95,
		sandte: 0.08,
		sende: 0.99,
		sendest: 0.99,
		sendet: 0.99,
		gesendet: 0.9,
		gesandt: 0.12,
	});
	const luna = knowledgeLuna({});
	const { result } = await produceOnce(
		{ jev: jev.ask, luna: luna.ask },
		later(broadcast, stored, [letter.reading], verbDimensions),
	);
	expect(result.failures).toEqual([]);
	expect(jev.stages()).toEqual(["paradigmLicence"]);
	expect(Object.keys(jev.sent[0]?.questions ?? {})).toHaveLength(8);
	expect(luna.sent).toEqual([]);
	expect(result.paradigmChanges.every(({ kind }) => kind === "License")).toBe(
		true,
	);
	const paradigm = applied(
		stored,
		[letter.reading, broadcast.reading],
		result.paradigmChanges,
	);
	expect(licencesOf(paradigm, broadcast.reading)).toEqual(
		sendenForms.broadcast,
	);
	expect(licencesOf(paradigm, letter.reading)).toEqual({
		...sendenForms.letter,
		preterite: ["sandte", "sendete"],
	});
});

test("senden 📨 after 📡: a judge that takes every stored variant ends the dimension, so Luna writes no sandte (a later occurrence adds it, #1234)", async () => {
	const stored = storedFor(broadcast.reading, sendenForms.broadcast);
	const luna = knowledgeLuna({});
	const { result } = await produceOnce(
		{
			jev: judge({
				sendete: 0.9,
				sende: 0.99,
				sendest: 0.99,
				sendet: 0.99,
				gesendet: 0.9,
			}).ask,
			luna: luna.ask,
		},
		later(letter, stored, [broadcast.reading], verbDimensions),
	);
	expect(luna.sent).toEqual([]);
	const paradigm = applied(
		stored,
		[broadcast.reading, letter.reading],
		result.paradigmChanges,
	);
	expect(licencesOf(paradigm, letter.reading)).toEqual(sendenForms.broadcast);
});

const cow = knowledgeInput(melken, "🐄", "Der Bauer melkte die Kuh.", [
	"melkte",
]);
const fleece = knowledgeInput(melken, "💸", "Die Firma molk ihre Kunden.", [
	"molk",
]);
const melkenForms: Forms = {
	preterite: ["molk", "melkte"],
	present1: ["melke"],
	present2: ["melkst"],
	present3: ["melkt"],
	pastParticiple: ["gemolken", "gemelkt"],
	subjunctivePast: ["mölke", "melkte"],
};

test("melken: the first Reading writes both Präterita, and a later Reading the judge gives both stays Free, though Luna would have omitted one", async () => {
	const first = await produceOnce(
		{
			jev: judge({}).ask,
			luna: knowledgeLuna({
				verbForms: {
					preterite: ["molk", "melkte"],
					presentSingular: {
						first: ["melke"],
						second: ["melkst"],
						third: ["melkt"],
					},
					pastParticiple: ["gemolken", "gemelkt"],
					subjunctivePast: ["mölke", "melkte"],
				},
			}).ask,
		},
		{ ...cow, paradigm: { dimensions: verbDimensions } },
	);
	expect(first.result.failures).toEqual([]);
	const stored = applied(
		{ dimensions: {} },
		[cow.reading],
		first.result.paradigmChanges,
	);
	expect(stored).toEqual(storedFor(cow.reading, melkenForms));

	// Luna alone would write melkte only; the judge sees both and takes both.
	const luna = knowledgeLuna({ verbForms: { preterite: ["melkte"] } });
	const { result } = await produceOnce(
		{
			jev: judge(
				Object.fromEntries(
					Object.values(melkenForms)
						.flat()
						.map((form) => [form, 0.9]),
				),
			).ask,
			luna: luna.ask,
		},
		later(fleece, stored, [cow.reading], verbDimensions),
	);
	expect(luna.sent).toEqual([]);
	const paradigm = applied(
		stored,
		[cow.reading, fleece.reading],
		result.paradigmChanges,
	);
	expect(
		isFree(paradigm, [
			readingIdentityKey(cow.reading),
			readingIdentityKey(fleece.reading),
		]),
	).toBe(true);
});

test("a verb's NoMatch dimensions share one Luna write; the stored Präsens is licensed as judged", async () => {
	const weigh = knowledgeInput(verb("wiegen"), "⚖", "Er wog den Sack.", [
		"wog",
	]);
	const rock = knowledgeInput(verb("wiegen"), "👶", "Sie wiegte das Kind.", [
		"wiegte",
	]);
	const stored = storedFor(weigh.reading, {
		preterite: ["wog"],
		present1: ["wiege"],
		present2: ["wiegst"],
		present3: ["wiegt"],
		pastParticiple: ["gewogen"],
		subjunctivePast: ["wöge"],
	});
	const luna = knowledgeLuna({
		verbForms: {
			preterite: ["wiegte"],
			presentSingular: {
				first: ["wiege"],
				second: ["wiegst"],
				third: ["wiegt"],
			},
			pastParticiple: ["gewiegt"],
			subjunctivePast: ["wiegte"],
		},
	});
	const { result } = await produceOnce(
		{
			jev: judge({ wiege: 0.9, wiegst: 0.9, wiegt: 0.9 }).ask,
			luna: luna.ask,
		},
		later(rock, stored, [weigh.reading], verbDimensions),
	);
	expect(result.failures).toEqual([]);
	expect(luna.aspects()).toEqual(["verbForms"]);
	// In dimension order, each dimension's changes together.
	expect(
		result.paradigmChanges.map(({ dimension, kind }) => [dimension, kind]),
	).toEqual([
		["preterite", "Contribute"],
		["preterite", "License"],
		["present1", "License"],
		["present2", "License"],
		["present3", "License"],
		["pastParticiple", "Contribute"],
		["pastParticiple", "License"],
		["subjunctivePast", "Contribute"],
		["subjunctivePast", "License"],
	]);
	const paradigm = applied(
		stored,
		[weigh.reading, rock.reading],
		result.paradigmChanges,
	);
	expect(licencesOf(paradigm, rock.reading)).toEqual({
		preterite: ["wiegte"],
		present1: ["wiege"],
		present2: ["wiegst"],
		present3: ["wiegt"],
		pastParticiple: ["gewiegt"],
		subjunctivePast: ["wiegte"],
	});
});

test("a reused Reading's dimension with stored variants is skipped, its Licence stated or Unstated left alone", async () => {
	const stored = storedFor(bench.reading, { plural: ["Bänke"] });
	const jev = judge({});
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
					{ id: "bänke", value: "Bänke", provenance: "Migrated" },
				],
				licences: {},
			},
		},
	};
	const { result } = await produceOnce(
		{
			jev: judge({}).ask,
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

test("a judge with no answer fails every judged dimension and asks Luna nothing; a marker picked beside a form fails its dimension", async () => {
	const stored = storedFor(letter.reading, sendenForms.letter);
	const luna = knowledgeLuna({});
	const down = await produceOnce(
		{
			jev: knowledgeJev(
				{},
				{ fail: (stage) => stage === "paradigmLicence" },
			).ask,
			luna: luna.ask,
		},
		later(broadcast, stored, [letter.reading], verbDimensions),
	);
	expect(down.result.paradigmChanges).toEqual([]);
	expect(
		down.result.failures.map(({ aspect, code }) => [aspect, code]),
	).toEqual(
		verbDimensions.map((dimension) => [dimension, "ProviderFailure"]),
	);
	expect(luna.sent).toEqual([]);

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
	const marker = await produceOnce(
		{
			jev: judge({
				"no plural: the noun is used in the singular only": 0.9,
				Bänke: 0.9,
			}).ask,
			luna: luna.ask,
		},
		later(lender, water, [bench.reading], ["plural"]),
	);
	expect(marker.result.paradigmChanges).toEqual([]);
	expect(marker.result.failures).toEqual([
		expect.objectContaining({
			aspect: "plural",
			code: "InvalidModelOutput",
		}),
	]);
});

test("a stored Paradigm that is none of the Lemma's, or a Reading of another Lemma, is a Defect raised before anything is asked", async () => {
	const jev = judge({});
	const stored = storedFor(bench.reading, { plural: ["Bänke"] });
	const mother = knowledgeInput(mutter, "👩", "Die Mutter ruft an.", [
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

test("a failed write after NoMatch fails only its dimensions; the Licences the judge gave stand", async () => {
	const weigh = knowledgeInput(verb("wiegen"), "⚖", "Er wog den Sack.", [
		"wog",
	]);
	const rock = knowledgeInput(verb("wiegen"), "👶", "Sie wiegte das Kind.", [
		"wiegte",
	]);
	const stored = storedFor(weigh.reading, {
		preterite: ["wog"],
		present1: ["wiege"],
		present2: ["wiegst"],
		present3: ["wiegt"],
		pastParticiple: ["gewogen"],
		subjunctivePast: ["wöge"],
	});
	const { result } = await produceOnce(
		{
			jev: judge({ wiege: 0.9, wiegst: 0.9, wiegt: 0.9 }).ask,
			luna: knowledgeLuna({}).ask,
		},
		later(rock, stored, [weigh.reading], verbDimensions),
	);
	expect(
		result.paradigmChanges.map(({ dimension, kind }) => [dimension, kind]),
	).toEqual([
		["present1", "License"],
		["present2", "License"],
		["present3", "License"],
	]);
	expect(result.failures.map(({ aspect, code }) => [aspect, code])).toEqual([
		["preterite", "ProviderFailure"],
		["pastParticiple", "ProviderFailure"],
		["subjunctivePast", "ProviderFailure"],
	]);
});
