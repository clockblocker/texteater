import { expect, test } from "bun:test";
import { auxiliaryUses } from "../../src/resolve/de/prompts.js";
import type { JevAsk } from "../../src/segment/jev.js";
import type { Segment } from "../../src/segment/segmented-sentence.js";
import { space, stop, word, writes } from "./grammar-fixtures.js";
import {
	attested,
	fakeJev,
	fakeLuna,
	resolveOnce,
	sentenceOf,
	unitOf,
} from "./support.js";

// valencyEvidence (ADR 0034) and auxiliaries (#686).

test("a governed preposition is the verb's valencyEvidence and stays out of its Surface and Lemma", async () => {
	// Sie0 _1 wartet2 _3 auf4 _5 den6 _7 Bus8 .9
	const jev = fakeJev({
		prefix: "None",
		governed_m1: "Governed",
		governedCase_m1: "Acc",
		governedReferent_m1: "Something",
		verbForm: "Fin",
		mood: "Ind",
		tense: "Pres",
		person: "3",
		number: "Sing",
	});
	const luna = writes("warten");
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: luna.ask },
		{
			sentence: sentenceOf("Sie wartet auf den Bus."),
			unit: unitOf([2, 4], "Lexeme/VERB"),
		},
	);
	const attestation = attested(result);
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
					canonicalForm: "auf",
					coreFeatures: {},
				},
				governedCase: "Acc",
				referent: "Something",
			},
			realizedCase: "Acc",
		},
	]);
	expect(attestation.surface.normalizedSurface).toBe("wartet");
	// The guess had no governed member, so Luna wrote again.
	expect(luna.sent).toHaveLength(2);
	expect(luna.sent[1]?.input).toHaveProperty("outsideHeadword", ["m1"]);
});

test("an adposition records the case its complement took, asked only where the ADP Case Table allows several", async () => {
	// Wir0 _1 sitzen2 _3 auf4 _5 dem6 _7 Sofa8 .9
	const twoWay = fakeJev({ realizedCase: "Dat" });
	const { result } = await resolveOnce(
		{ jev: twoWay.ask, luna: writes("auf").ask },
		{
			sentence: sentenceOf("Wir sitzen auf dem Sofa."),
			unit: unitOf([4], "Lexeme/ADP"),
		},
	);
	expect(attested(result)).toHaveProperty("valencyEvidence", [
		{
			member: null,
			complement: {
				kind: "Case",
				governedCase: "Dat",
				referent: "Either",
			},
			realizedCase: "Dat",
		},
	]);
	const oneCase = fakeJev();
	const mit = await resolveOnce(
		{ jev: oneCase.ask, luna: writes("mit").ask },
		{
			sentence: sentenceOf("Er kam mit dem Rad."),
			unit: unitOf([4], "Lexeme/ADP"),
		},
	);
	const withMit = attested(mit.result);
	expect(
		"valencyEvidence" in withMit && withMit.valencyEvidence?.[0],
	).toMatchObject({
		realizedCase: "Dat",
	});
	expect(oneCase.questions("grammar")).not.toContain("realizedCase");
});

test("perfect, future and passive come from the auxiliaries' uses; a Locution VERB has no Core Features", async () => {
	// Er0 _1 hat2 _3 den4 _5 Faden6 _7 verloren8 .9
	const jev = fakeJev({ aux_m0: "u0", coverage: "Full" });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("den Faden verlieren").ask },
		{
			sentence: sentenceOf("Er hat den Faden verloren."),
			unit: unitOf([2, 4, 6, 8], "Locution/VERB"),
		},
	);
	const attestation = attested(result);
	expect(attestation.surface.lemma.coreFeatures).toEqual({});
	expect(attestation.surface).toMatchObject({
		inflectionalFeatures: {
			perfect: "Yes",
			future: null,
			passive: null,
			voice: null,
		},
	});
	const asked = jev.sent[0]?.questions.aux_m0;
	expect(asked?.type === "choice" && asked.criteria.u0).toContain("perfect");
	expect(jev.questions("grammar")).toContain("coverage");
	expect(jev.questions("grammar")).not.toContain("prefix");
});

/**
 * A jev that answers each auxiliary question `uses` names with the option
 * of that authored AUX use (`werden 🔄`), found by its text in
 * `auxiliaryUses`, and every other question as `fakeJev` does.
 */
const auxiliaryJev = (uses: Readonly<Record<string, string>>): JevAsk => {
	return (request, context) =>
		fakeJev(
			Object.fromEntries(
				Object.entries(uses).flatMap(([id, use]) => {
					const asked = request.questions[id];
					if (!asked) return [];
					const option =
						asked.type === "choice"
							? Object.entries(asked.criteria).find(
									([, text]) => text === auxiliaryUses[use],
								)?.[0]
							: undefined;
					if (option === undefined)
						throw Error(`${id} offers no ${use}`);
					return [[id, option]];
				}),
			),
		).ask(request, context);
};

test("auxiliary uses that set the passive or the causative differently do not compose, while the same use twice does", async () => {
	const click = (
		sentence: string,
		segments: number[],
		uses: Readonly<Record<string, string>>,
		lemma: string,
	) =>
		resolveOnce(
			{ jev: auxiliaryJev(uses), luna: writes(lemma).ask },
			{
				sentence: sentenceOf(sentence),
				unit: unitOf(segments, "Lexeme/VERB"),
			},
		);
	const clash = {
		outcome: "Unresolved",
		reason: "The auxiliaries' uses do not compose",
	} as const;
	// Er0 _1 wird2 _3 singen4 _5 lassen6 .7: a process passive and a causative.
	const causative = await click(
		"Er wird singen lassen.",
		[2, 4, 6],
		{ aux_m0: "werden 🔄", aux_m2: "lassen 🗣👉" },
		"singen",
	);
	expect(causative.result).toEqual({ _tag: "Unresolved" });
	expect(causative.trace?.resolution).toEqual(clash);
	// Er0 _1 wird2 _3 geschenkt4 _5 bekommen6 .7: a process and a recipient passive.
	const recipient = await click(
		"Er wird geschenkt bekommen.",
		[2, 4, 6],
		{ aux_m0: "werden 🔄", aux_m2: "bekommen 🎁" },
		"schenken",
	);
	expect(recipient.result).toEqual({ _tag: "Unresolved" });
	expect(recipient.trace?.resolution).toEqual(clash);
	// Das0 _1 Haus2 _3 wird4 _5 gebaut6 _7 worden8 _9 sein10 .11
	const composed = await click(
		"Das Haus wird gebaut worden sein.",
		[4, 6, 8, 10],
		{ aux_m0: "werden 🔮", aux_m2: "werden 🔄", aux_m3: "sein 🏁" },
		"bauen",
	);
	expect(attested(composed.result).surface).toMatchObject({
		inflectionalFeatures: {
			perfect: "Yes",
			future: "Yes",
			voice: "Pass",
			passive: "Process",
		},
	});
	// Er0 _1 wird2 _3 gelobt4 _5 werden6 .7, each werden judged the process passive.
	const twice = await click(
		"Er wird gelobt werden.",
		[2, 4, 6],
		{ aux_m0: "werden 🔄", aux_m2: "werden 🔄" },
		"loben",
	);
	expect(attested(twice.result).surface).toMatchObject({
		inflectionalFeatures: {
			perfect: null,
			future: null,
			voice: "Pass",
			passive: "Process",
		},
	});
});

test("a subject es whose verb jev answers in the plural makes the click Unresolved", async () => {
	// Es0 _1 regnet2 .3
	const answers = {
		verbForm: "Fin",
		mood: "Ind",
		tense: "Pres",
		person: "3",
	};
	const click = (number: string) =>
		resolveOnce(
			{
				jev: fakeJev({ ...answers, number }).ask,
				luna: writes("regnen").ask,
			},
			{
				sentence: sentenceOf("Es regnet."),
				unit: unitOf([0, 2], "Lexeme/VERB"),
			},
		);
	const singular = await click("Sing");
	expect(attested(singular.result).surface).toMatchObject({
		inflectionalFeatures: { expletive: "Subject", number: "Sing" },
	});
	const plural = await click("Plur");
	expect(plural.result).toEqual({ _tag: "Unresolved" });
	expect(plural.trace?.resolution).toEqual({
		outcome: "Unresolved",
		reason: "The subject es clashes with the verb's agreement",
	});
});

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

// The trace (#858).

test("the trace names the operation, its calls by executor and how the click came out", async () => {
	const { trace } = await resolveOnce(
		{ jev: fakeJev().ask, luna: writes("kommen").ask },
		{
			sentence: sentenceOf("Er kommt."),
			unit: unitOf([2], "Lexeme/VERB"),
		},
	);
	expect(trace?.operation).toBe("resolve.grammar");
	// Luna is asked first, on a guess, while jev judges.
	expect(
		trace?.calls.map(({ stage, executor }) => [stage, executor]),
	).toEqual([
		["canonical", "luna"],
		["grammar", "jev"],
	]);
	expect(trace?.calls.map(({ inputTokens }) => inputTokens)).toEqual([
		50, 100,
	]);
	expect(trace?.resolution).toEqual({ outcome: "Resolved" });
});

test("PART is closed: an authored particle resolves with no Luna call, and a spelling none names is a Catalog Miss", async () => {
	// Er0 _1 kommt2 _3 nicht4 .5
	const luna = fakeLuna();
	const nicht = await resolveOnce(
		{ jev: fakeJev().ask, luna: luna.ask },
		{
			sentence: sentenceOf("Er kommt nicht."),
			unit: unitOf([4], "Lexeme/PART"),
		},
	);
	expect(attested(nicht.result).surface.lemma).toMatchObject({
		canonicalForm: "nicht",
		coreFeatures: { polarity: "Neg" },
	});
	expect(luna.sent).toEqual([]);
	const unknown = await resolveOnce(
		{ jev: fakeJev().ask, luna: writes("blubb").ask },
		{
			sentence: sentenceOf("Er kommt blubb."),
			unit: unitOf([4], "Lexeme/PART"),
		},
	);
	expect(unknown.result).toMatchObject({ _tag: "CatalogMiss" });
});
