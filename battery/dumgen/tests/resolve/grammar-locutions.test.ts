import { expect, test } from "bun:test";
import { guardedHeadword } from "../../src/resolve/de/headword-guards.js";
import { targetOf } from "../../src/resolve/de/target.js";
import type { RouteKey } from "../../src/segment/de/routes.js";
import type { Segment } from "../../src/segment/segmented-sentence.js";
import {
	attested,
	fakeJev,
	fakeLuna,
	resolveOnce,
	sentenceOf,
	space,
	stop,
	unitOf,
	word,
	writes,
} from "./support.js";

// Locutions and Sayings (ADR 0039), Fused members (ADR 0035), member roles (ADR 0041).

test("a Saying resolves with its coverage and fused pieces spelled as written", async () => {
	const segments: Segment[] = [
		word("Morgenstund"),
		space,
		word("hat"),
		space,
		word("Gold"),
		space,
		word("i", "in"),
		word("m", "dem"),
		space,
		word("Mund"),
		stop,
	];
	const jev = fakeJev({ coverage: "Full" });
	const luna = writes("Morgenstund hat Gold im Mund");
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: luna.ask },
		{
			sentence: sentenceOf("", segments),
			unit: unitOf([0, 2, 4, 6, 7, 9], "Saying/Saying"),
		},
	);
	const attestation = attested(result);
	expect(attestation.surface.normalizedSurface).toBe(
		"Morgenstund hat Gold im Mund",
	);
	expect(attestation.surface).not.toHaveProperty("inflectionalFeatures");
	expect(attestation.members[3]).toMatchObject({
		attested: "i",
		orthography: "Fused",
		component: 0,
	});
	expect(luna.sent[0]?.input).toHaveProperty("fixedMembers", {
		m3: "i",
		m4: "m",
	});
	// No Member Role anywhere on the Attestation (ADR 0041).
	for (const member of attestation.members)
		expect(
			Object.keys(member).every((key) =>
				["attested", "orthography", "fusion", "component"].includes(
					key,
				),
			),
		).toBe(true);
});

test("a fused article piece is the noun's owned article and narrows its Case", async () => {
	const segments: Segment[] = [
		word("Wir"),
		space,
		word("sind"),
		space,
		word("i", "in"),
		word("m", "dem"),
		space,
		word("Wald"),
		stop,
	];
	const jev = fakeJev({ gender: "der", number: "Sing" });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("Wald", ["dem", "Wald"]).ask },
		{
			sentence: sentenceOf("", segments),
			unit: unitOf([5, 7], "Lexeme/NOUN"),
		},
	);
	const attestation = attested(result);
	expect(attestation.members[0]).toMatchObject({
		attested: "m",
		orthography: "Fused",
		fusion: {
			spelling: "im",
			components: [
				{ span: "i", surface: "in" },
				{ span: "m", surface: "dem" },
			],
		},
	});
	expect(attestation.surface).toMatchObject({
		inflectionalFeatures: {
			case: "Dat",
		},
	});
	expect(attestation.surface.normalizedSurface).toBe("Wald");
	// The table spells m; only Wald's spelling is judged.
	const asked = jev.sent[0]?.questions.orthography;
	expect(asked?.type === "choice" && Object.keys(asked.criteria)).toEqual([
		"None",
		"t1",
		"s1",
		"Unresolved",
	]);
});

test("an opening Fused member gives the noun its article only when its piece names one word: im Wald does, war's Wetter doesn't", async () => {
	// 's is es or das, so before the Sentence chooses, it opens no article:
	// the case is asked over every cell and the citation question stays.
	const clitic: Segment[] = [
		word("Wie"),
		space,
		word("war"),
		word("'s"),
		space,
		word("Wetter"),
		{ kind: "Punctuation", text: "?" },
	];
	const ambiguous = fakeJev({
		reading_s3: "w1",
		gender: "das",
		number: "Sing",
	});
	const wetter = await resolveOnce(
		{ jev: ambiguous.ask, luna: writes("Wetter", ["das", "Wetter"]).ask },
		{
			sentence: sentenceOf("", clitic),
			unit: unitOf([3, 5], "Lexeme/NOUN"),
		},
	);
	const fromClitic = attested(wetter.result);
	expect(fromClitic).toHaveProperty("articleEvidence", null);
	expect(fromClitic.members[0]).toMatchObject({
		attested: "'s",
		orthography: "Fused",
		fusion: { components: [{ surface: "war" }, { surface: "das" }] },
	});
	expect(ambiguous.questions("grammar")).toEqual(
		expect.arrayContaining(["reading_s3", "citation", "case"]),
	);
	// m of im is dem alone, so the article opens the unit and no citation
	// question is asked.
	const fused: Segment[] = [
		word("Wir"),
		space,
		word("sind"),
		space,
		word("i", "in"),
		word("m", "dem"),
		space,
		word("Wald"),
		stop,
	];
	const plain = fakeJev({ gender: "der", number: "Sing" });
	const wald = await resolveOnce(
		{ jev: plain.ask, luna: writes("Wald", ["dem", "Wald"]).ask },
		{
			sentence: sentenceOf("", fused),
			unit: unitOf([5, 7], "Lexeme/NOUN"),
		},
	);
	expect(attested(wald.result)).toMatchObject({
		articleEvidence: expect.anything(),
	});
	expect(plain.questions("grammar")).not.toContain("citation");
});

test("an infinitive split at its infixed zu keeps its pieces' letters, glued in its Surface", async () => {
	const segments: Segment[] = [
		word("Er"),
		space,
		word("versucht"),
		space,
		word("hinaus"),
		word("zu"),
		word("laufen"),
		stop,
	];
	const jev = fakeJev({ prefix: "p0", verbForm: "Inf" });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("hinauslaufen").ask },
		{
			sentence: sentenceOf("", segments),
			unit: unitOf([4, 6], "Lexeme/VERB"),
		},
	);
	const attestation = attested(result);
	expect(attestation.surface.normalizedSurface).toBe("hinauslaufen");
	expect(attestation.surface.lemma.coreFeatures).toMatchObject({
		hasSepPrefix: "hinaus",
	});
	expect(attestation.members[1]).toMatchObject({
		attested: "laufen",
		orthography: "Fused",
		component: 2,
	});
});

test("a Locution's or interjection's headword drops placeholders and members outside it, and an adpositional or conjunctional Locution has … exactly at its gaps", () => {
	const at = (text: string, segments: number[], key: RouteKey) => {
		const unit = unitOf(segments, key);
		return targetOf(sentenceOf(text), unit, unit.route);
	};
	const nose = at(
		"Er tanzte ihr auf der Nase herum.",
		[2, 6, 8, 10, 12],
		"Locution/VERB",
	);
	expect(
		guardedHeadword(nose, "jemandem auf der Nase herumtanzen", new Set()),
	).toBe("auf der Nase herumtanzen");
	const thanks = at("Vielen Dank für alles.", [0, 2, 4], "Locution/INTJ");
	expect(guardedHeadword(thanks, "vielen Dank für …", new Set([2]))).toBe(
		"vielen Dank",
	);
	const care = at("Sie nahm Rücksicht auf ihn.", [2, 4, 6], "Locution/VERB");
	expect(guardedHeadword(care, "Rücksicht auf … nehmen", new Set([2]))).toBe(
		"Rücksicht nehmen",
	);
	const similar = at("Sie mag Äpfel oder Ähnliches.", [6, 8], "Locution/ADV");
	expect(guardedHeadword(similar, "oder … Ähnliches", new Set())).toBe(
		"oder Ähnliches",
	);
	const without = at("Er ging ohne zu grüßen.", [4, 6], "Locution/SCONJ");
	expect(guardedHeadword(without, "ohne zu", new Set())).toBe("ohne … zu");
	const so = at(
		"Er sprach so leise, dass keiner es hörte.",
		[4, 9],
		"Locution/SCONJ",
	);
	expect(guardedHeadword(so, "so dass", new Set())).toBe("so … dass");
});

test("a numeral Locution Luna cites as a slotted pattern takes its members' words, digits spelled", async () => {
	// Es0 _1 dauert2 _3 acht4 _5 bis6 _7 9 8 _9 Tage10 .11
	const range = await resolveOnce(
		{
			jev: fakeJev().ask,
			luna: fakeLuna(({ members }) => ({
				canonicalForm: "von … bis …",
				members: members.map(({ text }) => text),
			})).ask,
		},
		{
			sentence: sentenceOf("Es dauert acht bis 9 Tage."),
			unit: unitOf([4, 6, 8], "Locution/NUM"),
		},
	);
	expect(attested(range.result).surface.lemma.canonicalForm).toBe(
		"acht bis neun",
	);
});

test("a pronominal adverb that holds a Locution's fixed preposition marks its slot and stays in the Surface (ADR 0056)", async () => {
	const segments: Segment[] = [
		word("Das"),
		space,
		word("hatte"),
		space,
		word("damit"),
		space,
		word("zu"),
		space,
		word("tun"),
		stop,
	];
	const jev = fakeJev({
		governed_m1: "Governed",
		governed_m2: "Free",
		tense: "Past",
	});
	const luna = writes("mit zu tun haben");
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: luna.ask },
		{
			sentence: sentenceOf("", segments),
			unit: unitOf([2, 4, 6, 8], "Locution/VERB"),
		},
	);
	const question = jev.sent[0]?.questions.governed_m1;
	expect(
		question?.type === "choice" && Object.keys(question.criteria),
	).toEqual(["Governed", "Free", "Unresolved"]);
	// Luna reads damit as the mit it holds.
	expect(luna.sent.at(-1)?.input).toHaveProperty("fixedMembers", {
		m1: "mit",
	});
	const attestation = attested(result);
	expect(attestation.surface.normalizedSurface).toBe("mit zu tun hatte");
	expect(attestation).toHaveProperty("valencyEvidence", [
		{
			member: 1,
			complement: {
				kind: "Preposition",
				preposition: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "ADP",
					canonicalForm: "mit",
					coreFeatures: {},
				},
				governedCase: "Dat",
				referent: "Something",
			},
			realizedCase: "Dat",
		},
	]);
});

test("a Collocation's governed preposition its Canonical Form lacks is evidence, and the Surface leaves it out", async () => {
	const segments: Segment[] = [
		word("Sie"),
		space,
		word("hat"),
		space,
		word("Angst"),
		space,
		word("vor"),
		space,
		word("Hunden"),
		stop,
	];
	const jev = fakeJev({ governed_m2: "Governed", governedCase_m2: "Dat" });
	const luna = writes("Angst haben");
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: luna.ask },
		{
			sentence: sentenceOf("", segments),
			unit: unitOf([2, 4, 6], "Locution/VERB"),
		},
	);
	const attestation = attested(result);
	expect(attestation.surface.lemma.canonicalForm).toBe("Angst haben");
	expect(attestation.surface.normalizedSurface).toBe("Angst hat");
	expect(attestation).toHaveProperty("valencyEvidence.0.member", 2);
	// Luna decides whether the Lemma holds it, so nothing is outside.
	expect(luna.sent.at(-1)?.input).not.toHaveProperty("outsideHeadword");
});

test("a Locution's es judged a referential subject stays out of its Lemma and Surface (ADR 0003)", async () => {
	const segments: Segment[] = [
		word("Vielleicht"),
		space,
		word("hatte"),
		space,
		word("es"),
		space,
		word("damit"),
		space,
		word("zu"),
		space,
		word("tun"),
		stop,
	];
	const jev = fakeJev({
		expletive: "Referential",
		governed_m2: "Governed",
		tense: "Past",
	});
	const luna = writes("mit zu tun haben");
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: luna.ask },
		{
			sentence: sentenceOf("", segments),
			unit: unitOf([2, 4, 6, 8, 10], "Locution/VERB"),
		},
	);
	const attestation = attested(result);
	expect(attestation.surface.normalizedSurface).toBe("mit zu tun hatte");
	expect(attestation.surface).toHaveProperty(
		"inflectionalFeatures.expletive",
		null,
	);
	expect(luna.sent.at(-1)?.input).toHaveProperty("outsideHeadword", ["m1"]);
});
