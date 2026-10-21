import { expect, test } from "bun:test";
import { readingIdentityKey } from "dumling";
import { isFree } from "dumrel";
import {
	applied,
	type Forms,
	judge,
	later,
	licencesOf,
	storedFor,
	verb,
	verbDimensions,
	verbFormsOf,
} from "./paradigm-support.js";
import { knowledgeInput, knowledgeLuna, produceOnce } from "./support.js";

const senden = verb("senden");
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

test("senden 📡 after 📨: the matched dimensions ask nothing, and one request judges the two that differ, taking only stored variants", async () => {
	const stored = storedFor(letter.reading, sendenForms.letter);
	const jev = judge({ preterite: ["sendete"], pastParticiple: ["gesendet"] });
	const luna = knowledgeLuna({
		verbForms: verbFormsOf(sendenForms.broadcast),
	});
	const { result } = await produceOnce(
		{ jev: jev.ask, luna: luna.ask },
		later(broadcast, stored, [letter.reading], verbDimensions),
	);
	expect(result.failures).toEqual([]);
	expect(luna.aspects()).toEqual(["verbForms"]);
	expect(jev.stages()).toEqual(["paradigmLicence"]);
	expect(Object.keys(jev.sent[0]?.questions ?? {})).toEqual([
		"preterite",
		"pastParticiple",
	]);
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
	expect(licencesOf(paradigm, letter.reading)).toEqual(sendenForms.letter);
});

test("senden 📨 after 📡: the judge takes the stored sendete and Luna's new sandte, which becomes a variant", async () => {
	const stored = storedFor(broadcast.reading, sendenForms.broadcast);
	const { result } = await produceOnce(
		{
			jev: judge({
				preterite: ["sandte", "sendete"],
				pastParticiple: ["gesandt", "gesendet"],
			}).ask,
			luna: knowledgeLuna({ verbForms: verbFormsOf(sendenForms.letter) })
				.ask,
		},
		later(letter, stored, [broadcast.reading], verbDimensions),
	);
	expect(result.failures).toEqual([]);
	const paradigm = applied(
		stored,
		[broadcast.reading, letter.reading],
		result.paradigmChanges,
	);
	expect(licencesOf(paradigm, letter.reading)).toEqual(sendenForms.letter);
	expect(licencesOf(paradigm, broadcast.reading)).toEqual(
		sendenForms.broadcast,
	);
});

const melken = verb("melken");
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

test("melken: Luna omitting a stored Präteritum conditions nothing on its own; the judge's pick of both keeps the Lemma Free", async () => {
	const first = await produceOnce(
		{
			jev: judge().ask,
			luna: knowledgeLuna({ verbForms: verbFormsOf(melkenForms) }).ask,
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

	// Luna writes melkte only; the judge sees molk beside it and takes both.
	const luna = knowledgeLuna({
		verbForms: verbFormsOf({ ...melkenForms, preterite: ["melkte"] }),
	});
	const jev = judge({ preterite: ["melkte", "molk"] });
	const { result } = await produceOnce(
		{ jev: jev.ask, luna: luna.ask },
		later(fleece, stored, [cow.reading], verbDimensions),
	);
	expect(JSON.stringify(luna.sent)).not.toContain("gemolken");
	expect(Object.keys(jev.sent[0]?.questions ?? {})).toEqual(["preterite"]);
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

const wiegen = verb("wiegen");
const weigh = knowledgeInput(wiegen, "⚖", "Er wog den Sack.", ["wog"]);
const rock = knowledgeInput(wiegen, "👶", "Sie wiegte das Kind.", ["wiegte"]);
const weighForms: Forms = {
	preterite: ["wog"],
	present1: ["wiege"],
	present2: ["wiegst"],
	present3: ["wiegt"],
	pastParticiple: ["gewogen"],
	subjunctivePast: ["wöge"],
};
const rockForms: Forms = {
	...weighForms,
	preterite: ["wiegte"],
	pastParticiple: ["gewiegt"],
	subjunctivePast: ["wiegte"],
};

test("wiegen 👶 after ⚖: each dimension's changes come together, in dimension order", async () => {
	const stored = storedFor(weigh.reading, weighForms);
	const { result } = await produceOnce(
		{
			jev: judge({
				preterite: ["wiegte"],
				pastParticiple: ["gewiegt"],
				subjunctivePast: ["wiegte"],
			}).ask,
			luna: knowledgeLuna({ verbForms: verbFormsOf(rockForms) }).ask,
		},
		later(rock, stored, [weigh.reading], verbDimensions),
	);
	expect(result.failures).toEqual([]);
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
	expect(licencesOf(paradigm, rock.reading)).toEqual(rockForms);
});

test("each dimension fails on its own: a field Luna left out fails its dimension, a judge with no answer the dimensions it was asked", async () => {
	const stored = storedFor(weigh.reading, weighForms);
	const { pastParticiple: _, ...written } = verbFormsOf(rockForms);
	const down = await produceOnce(
		{
			jev: judge({}, { fail: (stage) => stage === "paradigmLicence" })
				.ask,
			luna: knowledgeLuna({ verbForms: written }).ask,
		},
		later(rock, stored, [weigh.reading], verbDimensions),
	);
	expect(
		down.result.paradigmChanges.map(({ dimension, kind }) => [
			dimension,
			kind,
		]),
	).toEqual([
		["present1", "License"],
		["present2", "License"],
		["present3", "License"],
	]);
	expect(
		down.result.failures.map(({ aspect, code }) => [aspect, code]),
	).toEqual([
		["preterite", "ProviderFailure"],
		["pastParticiple", "InvalidModelOutput"],
		["subjunctivePast", "ProviderFailure"],
	]);

	const jev = judge();
	const unwritten = await produceOnce(
		{ jev: jev.ask, luna: knowledgeLuna({}).ask },
		later(rock, stored, [weigh.reading], verbDimensions),
	);
	expect(jev.sent).toEqual([]);
	expect(unwritten.result.paradigmChanges).toEqual([]);
	expect(
		unwritten.result.failures.map(({ aspect, code }) => [aspect, code]),
	).toEqual(
		verbDimensions.map((dimension) => [dimension, "ProviderFailure"]),
	);
});
