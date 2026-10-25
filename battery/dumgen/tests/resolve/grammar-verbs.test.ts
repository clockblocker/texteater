import { expect, test } from "bun:test";
import { verbHeadword } from "../../src/resolve/de/open-route/verbal.js";
import { auxiliaryUses } from "../../src/resolve/de/prompts.js";
import type { JevAsk } from "../../src/segment/jev.js";
import {
	attested,
	fakeJev,
	resolveOnce,
	sentenceOf,
	unitOf,
	writes,
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

test("a VERB's Canonical Form carries its judged separable prefix, never a lexical reflexive (ADR 0052)", () => {
	const core = (hasSepPrefix: string | null) => ({ hasSepPrefix });
	expect(verbHeadword("führen", core("vorbei"))).toBe("vorbeiführen");
	expect(verbHeadword("reinkommen", core("herein"))).toBe("hereinkommen");
	expect(verbHeadword("umkommen", core("herum"))).toBe("herumkommen");
	expect(verbHeadword("gehen", core("entlang"))).toBe("entlanggehen");
	expect(verbHeadword("übrig bleiben", core("übrig"))).toBe("übrig bleiben");
	expect(verbHeadword("erinnern", core(null))).toBe("erinnern");
	expect(verbHeadword("sich abfinden", core("ab"))).toBe("abfinden");
	expect(verbHeadword("finden", core(null))).toBe("finden");
});

test("a VERB's prefix options never offer a member that is no particle, such as its own participle", async () => {
	const jev = fakeJev({ prefix: "None" });
	await resolveOnce(
		{ jev: jev.ask, luna: writes("zerreiben").ask },
		{
			sentence: sentenceOf("Er hat es zerrieben."),
			unit: unitOf([2, 6], "Lexeme/VERB"),
		},
	);
	const prefix = jev.sent[0]?.questions.prefix;
	expect(
		prefix === undefined ||
			(prefix.type === "choice" &&
				!Object.values(prefix.criteria).includes("zerrieben")),
	).toBe(true);
});

test("Luna is told which members are auxiliaries, which stay out of the headword", async () => {
	const luna = writes("schwimmen");
	await resolveOnce(
		{ jev: fakeJev({ aux_m0: "u0" }).ask, luna: luna.ask },
		{
			sentence: sentenceOf("Sie wird schwimmen."),
			unit: unitOf([2, 4], "Lexeme/VERB"),
		},
	);
	expect(luna.sent).toHaveLength(2);
	expect(luna.sent[1]?.input).toHaveProperty("auxiliaries", ["m0"]);
	expect(luna.sent[1]?.systemPrompt).toContain("`auxiliaries`");
});

test("a particle standing apart in the VERB unit is its prefix when jev says None, but never a preposition the verb governs", async () => {
	const sorry = await resolveOnce(
		{ jev: fakeJev({ prefix: "None" }).ask, luna: writes("tun").ask },
		{
			sentence: sentenceOf("Das tut mir leid."),
			unit: unitOf([2, 6], "Lexeme/VERB"),
		},
	);
	expect(attested(sorry.result).surface.lemma).toMatchObject({
		canonicalForm: "leidtun",
		coreFeatures: { hasSepPrefix: "leid" },
	});
	const wait = await resolveOnce(
		{
			jev: fakeJev({ prefix: "p0", governed_m1: "Governed" }).ask,
			luna: writes("aufwarten").ask,
		},
		{
			sentence: sentenceOf("Sie warten auf ihn."),
			unit: unitOf([2, 4], "Lexeme/VERB"),
		},
	);
	expect(attested(wait.result).surface.lemma.coreFeatures).toMatchObject({
		hasSepPrefix: null,
	});
});

test("a preposition with its own complement is never taken as the prefix when jev says None", async () => {
	const quarrel = await resolveOnce(
		{
			jev: fakeJev({ prefix: "None" }).ask,
			luna: writes("sich zanken").ask,
		},
		{
			sentence: sentenceOf("Sie zankt sich mit ihm."),
			unit: unitOf([2, 4, 6], "Lexeme/VERB"),
		},
	);
	expect(attested(quarrel.result).surface.lemma.coreFeatures).toMatchObject({
		hasSepPrefix: null,
	});
});
