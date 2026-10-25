import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import { operations } from "../../src/operations.js";
import { withReflexiveMarker } from "../../src/resolve/reading.js";
import type { ResolveReadingInput } from "../../src/resolve/types.js";
import type { Unit } from "../../src/segment/segmented-sentence.js";
import { liveOver } from "../live-over.js";
import {
	attested,
	fakeJev,
	fakeLuna,
	resolveOnce,
	sentenceOf,
	unitOf,
	writes,
} from "./support.js";

// A lexical reflexive on the Reading, never in the Canonical Form (ADR 0052).

const finite = {
	verbForm: "Fin",
	mood: "Ind",
	tense: "Pres",
	person: "3",
	number: "Sing",
};

test("a lexical reflexive is a Reflexive in valencyEvidence, with no case where sich hides it, and stays out of the Lemma and the Surface", async () => {
	// Er0 _1 schämt2 _3 sich4 .5
	const jev = fakeJev(finite);
	const luna = writes("sich schämen");
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: luna.ask },
		{
			sentence: sentenceOf("Er schämt sich."),
			unit: unitOf([2, 4], "Lexeme/VERB"),
		},
	);
	const attestation = attested(result);
	expect(attestation.surface.lemma.canonicalForm).toBe("schämen");
	expect(attestation.surface.normalizedSurface).toBe("schämt");
	// The Reading's frame holds the case; jev is never asked it.
	expect(attestation).toHaveProperty("valencyEvidence", [
		{ member: 1, complement: { kind: "Reflexive" } },
	]);
	expect(Object.keys(jev.sent[0]?.questions ?? {})).not.toContain(
		"reflexive",
	);
	// sich is outside the headword on the guess too, so Luna wrote once.
	expect(luna.sent).toHaveLength(1);
	expect(luna.sent[0]?.input).toHaveProperty("outsideHeadword", ["m1"]);
});

test("a reflexive's form names its case where it shows it (mir, mich), and a verbal Locution's leaves its headword", async () => {
	// Ich0 _1 mache2 _3 mir4 _5 Sorgen6 .7
	const mine = fakeJev({ ...finite, person: "1" });
	const worry = await resolveOnce(
		{ jev: mine.ask, luna: writes("sich Sorgen machen").ask },
		{
			sentence: sentenceOf("Ich mache mir Sorgen."),
			unit: unitOf([2, 4, 6], "Locution/VERB"),
		},
	);
	const locution = attested(worry.result);
	expect(locution.surface.lemma.canonicalForm).toBe("Sorgen machen");
	expect(locution.surface.normalizedSurface).toBe("mache Sorgen");
	expect(locution).toHaveProperty("valencyEvidence", [
		{
			member: 1,
			complement: { kind: "Reflexive", governedCase: "Dat" },
			realizedCase: "Dat",
		},
	]);
	// Ich0 _1 erinnere2 _3 mich4 .5
	const remember = fakeJev({ ...finite, person: "1" });
	const { result } = await resolveOnce(
		{ jev: remember.ask, luna: writes("sich erinnern").ask },
		{
			sentence: sentenceOf("Ich erinnere mich."),
			unit: unitOf([2, 4], "Lexeme/VERB"),
		},
	);
	expect(attested(result)).toHaveProperty("valencyEvidence", [
		{
			member: 1,
			complement: { kind: "Reflexive", governedCase: "Acc" },
			realizedCase: "Acc",
		},
	]);
	// Er0 _1 macht2 _3 sich4 _5 Sorgen6 .7
	const his = await resolveOnce(
		{ jev: fakeJev(finite).ask, luna: writes("sich Sorgen machen").ask },
		{
			sentence: sentenceOf("Er macht sich Sorgen."),
			unit: unitOf([2, 4, 6], "Locution/VERB"),
		},
	);
	expect(attested(his.result)).toHaveProperty("valencyEvidence", [
		{ member: 1, complement: { kind: "Reflexive" } },
	]);
});

test("a reflexive inside a fixed phrase names its preposition, in the case the ADP Case Table leaves, and leaves the headword", async () => {
	// Er0 _1 war2 _3 außer4 _5 sich6 .7
	const jev = fakeJev({ ...finite, tense: "Past" });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("außer sich sein").ask },
		{
			sentence: sentenceOf("Er war außer sich."),
			unit: unitOf([2, 4, 6], "Locution/VERB"),
		},
	);
	const attestation = attested(result);
	expect(attestation.surface.lemma.canonicalForm).toBe("außer sein");
	expect(attestation.surface.normalizedSurface).toBe("war außer");
	expect(attestation).toHaveProperty("valencyEvidence", [
		{
			member: 2,
			complement: {
				kind: "Reflexive",
				governedCase: "Dat",
				preposition: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "ADP",
					canonicalForm: "außer",
					coreFeatures: {},
				},
			},
			realizedCase: "Dat",
		},
	]);
	// Neither a reflexive case nor a governed außer is asked.
	expect(Object.keys(jev.sent[0]?.questions ?? {})).not.toContain(
		"reflexive",
	);
	expect(Object.keys(jev.sent[0]?.questions ?? {})).not.toContain(
		"governed_m1",
	);
	// Der0 _1 Test2 _3 hat4 _5 es6 _7 in8 _9 sich10 .11
	// in takes Acc or Dat, so sich still hides the case.
	const tough = await resolveOnce(
		{
			jev: fakeJev({ ...finite, expletive: "None" }).ask,
			luna: writes("es in sich haben").ask,
		},
		{
			sentence: sentenceOf("Der Test hat es in sich."),
			unit: unitOf([4, 6, 8, 10], "Locution/VERB"),
		},
	);
	expect(attested(tough.result)).toHaveProperty("valencyEvidence", [
		{
			member: 3,
			complement: {
				kind: "Reflexive",
				preposition: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "ADP",
					canonicalForm: "in",
					coreFeatures: {},
				},
			},
		},
	]);
});

/** The Attestation and unit of a click on `sentence`, resolved with a fake jev and Luna. */
async function clickOn(
	sentence: string,
	segments: readonly number[],
	canonicalForm: string,
): Promise<{
	readonly attestation: Dumling.Attestation<"de">;
	readonly unit: Unit;
	readonly sentence: ReturnType<typeof sentenceOf>;
}> {
	const unit = unitOf([...segments], "Lexeme/VERB");
	const segmented = sentenceOf(sentence);
	const { result } = await resolveOnce(
		{
			jev: fakeJev(finite).ask,
			luna: writes(canonicalForm).ask,
		},
		{ sentence: segmented, unit },
	);
	return { attestation: attested(result), unit, sentence: segmented };
}

async function readOnce(
	click: Awaited<ReturnType<typeof clickOn>>,
	jev: ReturnType<typeof fakeJev>,
	luna: ReturnType<typeof fakeLuna>,
	input: Pick<ResolveReadingInput, "candidates"> &
		Partial<ResolveReadingInput>,
) {
	return Effect.runPromise(
		operations.resolve
			.reading({ ...click, ...input })
			.pipe(Effect.provide(liveOver({ jev: jev.ask, luna: luna.ask }))),
	);
}

test("a click whose members hold a lexical reflexive is offered only the 🪞 Readings, and code writes 🪞 before Luna's description", async () => {
	// Er0 _1 erinnert2 _3 sich4 .5
	const click = await clickOn("Er erinnert sich.", [2, 4], "erinnern");
	const jev = fakeJev({ reading: "NoMatch" });
	const luna = fakeLuna(() => "🧠");
	const result = await readOnce(click, jev, luna, {
		candidates: ["💭", "🪞🧠"],
	});
	const offered = jev.sent[0]?.questions.reading;
	expect(
		offered?.type === "choice" ? Object.keys(offered.criteria) : [],
	).toEqual(["c0", "NoMatch"]);
	expect(JSON.stringify(offered)).toContain("🪞🧠");
	expect(JSON.stringify(offered)).not.toContain("💭");
	// Luna's 🧠 collides with the offered 🪞🧠 once code marks it.
	expect(result).toEqual({ _tag: "Reuse", emojiDescription: "🪞🧠" });
	// A drafted description is marked too, and a 🪞 Luna wrote is not doubled.
	const drafted = await readOnce(click, fakeJev(), fakeLuna(), {
		candidates: [],
		drafted: "🪞😳",
	});
	expect(drafted).toEqual({ _tag: "New", emojiDescription: "🪞😳" });
});

test("a click with no lexical reflexive is offered no 🪞 Reading, and Luna's 🪞 is dropped", async () => {
	// Er0 _1 erinnert2 _3 sie4 .5: sie is no member.
	const click = await clickOn("Er erinnert sie.", [2], "erinnern");
	const jev = fakeJev({ reading: "NoMatch" });
	const result = await readOnce(
		click,
		jev,
		fakeLuna(() => "🪞💭"),
		{ candidates: ["🪞🧠"] },
	);
	expect(jev.sent).toEqual([]);
	expect(result).toEqual({ _tag: "New", emojiDescription: "💭" });
	expect(withReflexiveMarker(" 🪞😨", false)).toBe("😨");
	expect(withReflexiveMarker("😨", true)).toBe("🪞😨");
});

test("a click with a lexical reflexive is offered a Reading whose Reflexive Slot is Optional too, and Luna's 🪞 description takes it", async () => {
	// Er0 _1 ruht2 _3 sich4 _5 aus6 .7
	const click = await clickOn("Er ruht sich aus.", [2, 4, 6], "ausruhen");
	expect(click.attestation.surface.lemma.canonicalForm).toBe("ausruhen");
	const candidates = ["😴", "🪞🧘", "💤"];
	const jev = fakeJev({ reading: "c0" });
	const picked = await readOnce(click, jev, fakeLuna(), {
		candidates,
		optionallyReflexive: ["😴"],
	});
	const offered = jev.sent[0]?.questions.reading;
	expect(
		offered?.type === "choice" ? Object.values(offered.criteria) : [],
	).toEqual(["😴", "🪞🧘", expect.any(String)]);
	expect(picked).toEqual({ _tag: "Reuse", emojiDescription: "😴" });
	// The judge finds none, and Luna's 😴, marked 🪞😴, is the Optional one.
	const written = await readOnce(
		click,
		fakeJev({ reading: "NoMatch" }),
		fakeLuna(() => "😴"),
		{ candidates, optionallyReflexive: ["😴"] },
	);
	expect(written).toEqual({ _tag: "Reuse", emojiDescription: "😴" });
});

test("a Reading Knowledge has given no frame yet falls back to the 🪞 rule", async () => {
	const click = await clickOn("Er ruht sich aus.", [2, 4, 6], "ausruhen");
	const jev = fakeJev({ reading: "NoMatch" });
	const result = await readOnce(
		click,
		jev,
		fakeLuna(() => "😴"),
		{
			candidates: ["😴", "🪞🧘"],
		},
	);
	const offered = jev.sent[0]?.questions.reading;
	expect(JSON.stringify(offered)).not.toContain('"😴"');
	expect(result).toEqual({ _tag: "New", emojiDescription: "🪞😴" });
	// Off a reflexive click the Optional one is offered as any other.
	const plain = await clickOn("Er ruht.", [2], "ruhen");
	const judge = fakeJev({ reading: "c0" });
	expect(
		await readOnce(plain, judge, fakeLuna(), {
			candidates: ["😴", "🪞🧘"],
			optionallyReflexive: ["😴"],
		}),
	).toEqual({ _tag: "Reuse", emojiDescription: "😴" });
});
