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

test("a lexical reflexive is a Reflexive in valencyEvidence, in the case jev judged, and stays out of the Lemma and the Surface", async () => {
	// Er0 _1 schämt2 _3 sich4 .5
	const jev = fakeJev({ reflexive: "Acc", ...finite });
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
	expect(attestation).toHaveProperty("valencyEvidence", [
		{
			member: 1,
			complement: { kind: "Reflexive", governedCase: "Acc" },
			realizedCase: "Acc",
		},
	]);
	// sich is outside the headword on the guess too, so Luna wrote once.
	expect(luna.sent).toHaveLength(1);
	expect(luna.sent[0]?.input).toHaveProperty("outsideHeadword", ["m1"]);
	expect(Object.keys(jev.sent[0]?.questions ?? {})).toContain("reflexive");
});

test("a reflexive whose form shows its case is not asked, and a verbal Locution's leaves its headword", async () => {
	// Ich0 _1 erinnere2 _3 mich4 .5
	const remember = fakeJev(finite);
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
	expect(Object.keys(remember.sent[0]?.questions ?? {})).not.toContain(
		"reflexive",
	);
	// Sie0 _1 macht2 _3 sich4 _5 Sorgen6 .7
	const worry = await resolveOnce(
		{
			jev: fakeJev({ reflexive: "Dat", ...finite }).ask,
			luna: writes("sich Sorgen machen").ask,
		},
		{
			sentence: sentenceOf("Sie macht sich Sorgen."),
			unit: unitOf([2, 4, 6], "Locution/VERB"),
		},
	);
	const locution = attested(worry.result);
	expect(locution.surface.lemma.canonicalForm).toBe("Sorgen machen");
	expect(locution.surface.normalizedSurface).toBe("macht Sorgen");
	expect(locution).toHaveProperty("valencyEvidence", [
		{
			member: 1,
			complement: { kind: "Reflexive", governedCase: "Dat" },
			realizedCase: "Dat",
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
			jev: fakeJev({ reflexive: "Acc", ...finite }).ask,
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
