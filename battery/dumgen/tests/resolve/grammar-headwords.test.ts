import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { InvalidModelOutput } from "../../src/errors.js";
import type { LunaAsk } from "../../src/luna.js";
import { guardedHeadword } from "../../src/resolve/de/headword-guards.js";
import { verbHeadword } from "../../src/resolve/de/open-route/verbal.js";
import { targetOf } from "../../src/resolve/de/target.js";
import type { RouteKey } from "../../src/segment/de/routes.js";
import type { JevAsk } from "../../src/segment/jev.js";
import { fakeDumgen } from "./../service-test-adapter.js";
import { writes } from "./grammar-fixtures.js";
import {
	attested,
	fakeJev,
	fakeLuna,
	picked,
	resolveOnce,
	sentenceOf,
	unitOf,
} from "./support.js";

test("a VERB's Canonical Form carries its judged separable prefix and lexical reflexive", () => {
	const core = (
		hasSepPrefix: string | null,
		lexicallyReflexive: string | null = null,
	) => ({
		hasSepPrefix,
		lexicallyReflexive,
	});
	expect(verbHeadword("führen", core("vorbei"))).toBe("vorbeiführen");
	expect(verbHeadword("reinkommen", core("herein"))).toBe("hereinkommen");
	expect(verbHeadword("umkommen", core("herum"))).toBe("herumkommen");
	expect(verbHeadword("gehen", core("entlang"))).toBe("entlanggehen");
	expect(verbHeadword("übrig bleiben", core("übrig"))).toBe("übrig bleiben");
	expect(verbHeadword("erinnern", core(null, "Acc"))).toBe("sich erinnern");
	expect(verbHeadword("sich abfinden", core("ab", "Acc"))).toBe(
		"sich abfinden",
	);
	expect(verbHeadword("finden", core(null))).toBe("finden");
});

test("a judged gender the owned article rules out gives way to the likeliest gender jev weighed that agrees", async () => {
	const base = fakeJev({ number: "Sing" });
	// jev leans Neut for Tisch, which der in the nominative rules out.
	const jev: JevAsk = async (request, context) => {
		const response = await base.ask(request, context);
		return "gender" in request.questions
			? {
					...response,
					answers: {
						...response.answers,
						gender: {
							type: "choice",
							choice: "das",
							confidence: 0.6,
							probabilities: { das: 0.6, der: 0.35, die: 0.05 },
						},
					},
				}
			: response;
	};
	const { result } = await resolveOnce(
		{ jev, luna: writes("Tisch").ask },
		{
			sentence: sentenceOf("Der Tisch wackelt."),
			unit: unitOf([0, 2], "Lexeme/NOUN"),
		},
	);
	const attestation = attested(result);
	expect(attestation.surface.lemma.coreFeatures).toEqual({ gender: "Masc" });
	expect(attestation.surface).toMatchObject({
		inflectionalFeatures: {
			case: "Nom",
			number: "Sing",
		},
	});
});

test("an r- adverb is Shorthand without a judge: its her- or hin- words are the prefix options, and the judged prefix spells it", async () => {
	const jev = fakeJev({ prefix: "p0", mood: "Imp" });
	const luna = writes("reinkommen", ["komm", "rein"]);
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: luna.ask },
		{
			sentence: sentenceOf("Komm doch rein!"),
			unit: unitOf([0, 4], "Lexeme/VERB"),
		},
	);
	const prefix = jev.sent[0]?.questions.prefix;
	expect(prefix?.type === "choice" && prefix.criteria).toMatchObject({
		p0: "herein",
		p1: "hinein",
	});
	expect(
		prefix?.type === "choice" && Object.values(prefix.criteria),
	).not.toContain("rein");
	// The table spells rein, so no orthography question names it.
	expect(jev.sent[0]?.questions.orthography).toMatchObject({
		criteria: { t0: expect.any(String), s0: expect.any(String) },
	});
	const orthography = jev.sent[0]?.questions.orthography;
	expect(
		orthography?.type === "choice" && Object.keys(orthography.criteria),
	).not.toContain("t1");
	expect(luna.sent.at(-1)?.input).toHaveProperty("fixedMembers", {
		m1: "herein",
	});
	const attestation = attested(result);
	expect(attestation.surface.lemma).toMatchObject({
		canonicalForm: "hereinkommen",
		coreFeatures: { hasSepPrefix: "herein" },
	});
	expect(attestation.surface.normalizedSurface).toBe("komm herein");
	expect(attestation.members[1]).toEqual({
		attested: "rein",
		orthography: "Shorthand",
	});
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

test("a Luna answer the transport kept no output for is refused with the transport's reason", async () => {
	const luna: LunaAsk = async () => ({
		output: undefined,
		metadata: { problem: "Luna refused: no" },
	});
	const failure = await Effect.runPromise(
		Effect.flip(
			fakeDumgen({ jev: fakeJev().ask, luna }).resolve.grammar({
				language: "de",
				sentence: sentenceOf("Er kommt."),
				unit: unitOf([2], "Lexeme/VERB"),
				neighbours: {},
				lemmaCandidates: [],
			}),
		),
	);
	expect(failure).toBeInstanceOf(InvalidModelOutput);
	expect(String(failure.message)).toContain("Luna refused: no");
});

test("an ordinary noun shown in its plural keeps its singular's gender, while a plural-only noun has none", async () => {
	const base = fakeJev({ number: "Plur" });
	const leaning =
		(kind: string): JevAsk =>
		async (request, context) => {
			const response = await base.ask(request, context);
			return "gender" in request.questions
				? {
						...response,
						answers: {
							...response.answers,
							nounKind: picked(kind),
							gender: {
								type: "choice",
								choice: "None",
								confidence: 0.4,
								probabilities: {
									None: 0.4,
									die: 0.35,
									das: 0.2,
								},
							},
						},
					}
				: response;
		};
	const hands = await resolveOnce(
		{ jev: leaning("Ordinary"), luna: writes("Hand").ask },
		{
			sentence: sentenceOf("Hände klatschen."),
			unit: unitOf([0], "Lexeme/NOUN"),
		},
	);
	expect(attested(hands.result).surface.lemma.coreFeatures).toEqual({
		gender: "Fem",
	});
	const people = await resolveOnce(
		{ jev: leaning("PluralOnly"), luna: writes("Leute").ask },
		{
			sentence: sentenceOf("Leute klatschen."),
			unit: unitOf([0], "Lexeme/NOUN"),
		},
	);
	expect(attested(people.result).surface.lemma.coreFeatures).toEqual({
		gender: null,
	});
});

test("a split da or wo adverb and a bare w-word judged Shorthand get the headword the Rules give them", async () => {
	const split = await resolveOnce(
		{ jev: fakeJev().ask, luna: writes("da").ask },
		{
			sentence: sentenceOf("Da weiß ich nichts an."),
			unit: unitOf([0, 8], "Lexeme/ADV"),
		},
	);
	expect(attested(split.result).surface.lemma.canonicalForm).toBe("daran");
	const shorthand = await resolveOnce(
		{
			jev: fakeJev({ orthography: "s0" }).ask,
			luna: writes("wo", ["wo"]).ask,
		},
		{
			sentence: sentenceOf("Es liegt wo."),
			unit: unitOf([4], "Lexeme/ADV"),
		},
	);
	const attestation = attested(shorthand.result);
	expect(attestation.surface.lemma.canonicalForm).toBe("irgendwo");
	expect(attestation.surface.normalizedSurface).toBe("irgendwo");
	// raus on an ADV is judged heraus or hinaus, then spells the headword.
	const jev = fakeJev({ short_s6: "w1" });
	const out = await resolveOnce(
		{ jev: jev.ask, luna: writes("raus").ask },
		{
			sentence: sentenceOf("Der Zahn muss raus."),
			unit: unitOf([6], "Lexeme/ADV"),
		},
	);
	expect(jev.questions("grammar")).toContain("short_s6");
	expect(attested(out.result).surface.lemma.canonicalForm).toBe("hinaus");
});

test("a dr- adverb such as drunter is the Shorthand of its da(r)- word, which is its headword", async () => {
	const jev = fakeJev({});
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("drunter").ask },
		{
			sentence: sentenceOf("Der Ball liegt drunter."),
			unit: unitOf([6], "Lexeme/ADV"),
		},
	);
	// The table settles drunter, so jev is asked neither its orthography
	// nor which word it shortens.
	expect(jev.questions("grammar")).not.toContain("short_s6");
	expect(jev.questions("grammar")).not.toContain("orthography");
	const attestation = attested(result);
	expect(attestation.surface.lemma.canonicalForm).toBe("darunter");
	expect(attestation.surface.normalizedSurface).toBe("darunter");
	expect(attestation.members).toEqual([
		{ attested: "drunter", orthography: "Shorthand" },
	]);
});

test("the comparable question offers No for a demonstrative or interrogative adverb such as so, and code reads it as no Degree", async () => {
	const jev = fakeJev({ comparable: "No" });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("so").ask },
		{
			sentence: sentenceOf("Es war so laut."),
			unit: unitOf([4], "Lexeme/ADV"),
		},
	);
	const asked = jev.sent[0]?.questions.comparable;
	expect(asked?.type === "choice" && asked.criteria.No).toContain(
		"a demonstrative, interrogative or relative adverb",
	);
	const attestation = attested(result);
	expect(attestation.surface.lemma.coreFeatures).toEqual({
		comparable: null,
	});
	expect(attestation.surface).not.toHaveProperty(
		"inflectionalFeatures",
		expect.anything(),
	);
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

test("an r- word's prefix jev leaves Unresolved is the likelier of its her- and hin- words, never None", async () => {
	const base = fakeJev({ mood: "Imp" });
	const jev: JevAsk = async (request, context) => {
		const response = await base.ask(request, context);
		return "prefix" in request.questions
			? {
					...response,
					answers: {
						...response.answers,
						prefix: {
							type: "choice",
							choice: "Unresolved",
							confidence: 0.4,
							probabilities: {
								Unresolved: 0.4,
								None: 0.3,
								p1: 0.2,
								p0: 0.1,
							},
						},
					},
				}
			: response;
	};
	const { result } = await resolveOnce(
		{ jev, luna: writes("reinkommen").ask },
		{
			sentence: sentenceOf("Komm doch rein!"),
			unit: unitOf([0, 4], "Lexeme/VERB"),
		},
	);
	expect(attested(result).surface.lemma).toMatchObject({
		canonicalForm: "hineinkommen",
		coreFeatures: { hasSepPrefix: "hinein" },
	});
});

test("a closed-class member one edit from exactly one spelling of its stored identity is that spelling's Typo", async () => {
	const { result } = await resolveOnce(
		{ jev: fakeJev().ask, luna: fakeLuna().ask },
		{
			sentence: sentenceOf("Morgen fahre ihc los."),
			unit: {
				...unitOf([4], "Lexeme/PRON"),
				identity: {
					kind: "PRON",
					canonicalForm: "ich",
					pronType: "Prs",
				},
			},
		},
	);
	const attestation = attested(result);
	expect(attestation.surface.lemma.canonicalForm).toBe("ich");
	expect(attestation.surface.normalizedSurface).toBe("ich");
	expect(attestation.members[0]).toEqual({
		attested: "ihc",
		orthography: "Typo",
	});
});

test("bare was and wem resolve to etwas and irgendwem as Shorthand", async () => {
	const was = attested(
		(
			await resolveOnce(
				{ jev: fakeJev().ask, luna: fakeLuna().ask },
				{
					sentence: sentenceOf("Sag doch was!"),
					unit: {
						...unitOf([4], "Lexeme/PRON"),
						identity: {
							kind: "PRON",
							canonicalForm: "etwas",
							pronType: "Ind",
						},
					},
				},
			)
		).result,
	);
	expect(was.surface.lemma.canonicalForm).toBe("etwas");
	expect(was.members[0]).toMatchObject({
		attested: "was",
		orthography: "Shorthand",
	});
	const wem = attested(
		(
			await resolveOnce(
				{ jev: fakeJev().ask, luna: fakeLuna().ask },
				{
					sentence: sentenceOf("Hast du das wem erzählt?"),
					unit: {
						...unitOf([6], "Lexeme/PRON"),
						identity: {
							kind: "PRON",
							canonicalForm: "irgendwer",
							pronType: "Ind",
						},
					},
				},
			)
		).result,
	);
	expect(wem.surface.normalizedSurface).toBe("irgendwem");
	expect(wem.surface).toMatchObject({
		inflectionalFeatures: { case: "Dat" },
	});
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

test("a compared suppletive adverb cites its positive, and an ordinal its attributive headword", async () => {
	const rather = await resolveOnce(
		{
			jev: fakeJev({ comparable: "Yes", degree: "Cmp" }).ask,
			luna: writes("lieb").ask,
		},
		{
			sentence: sentenceOf("Ich trinke lieber Tee."),
			unit: unitOf([4], "Lexeme/ADV"),
		},
	);
	expect(attested(rather.result).surface.lemma.canonicalForm).toBe("gern");
	const second = await resolveOnce(
		{
			jev: fakeJev({
				comparable: "No",
				attributive: "Yes",
				"agreement.number": "Sing",
				"agreement.gender": "Fem",
				"agreement.case": "Nom",
			}).ask,
			luna: writes("zweit").ask,
		},
		{
			sentence: sentenceOf("Die zweite Runde beginnt."),
			unit: unitOf([2], "Lexeme/ADJ"),
		},
	);
	expect(attested(second.result).surface.lemma.canonicalForm).toBe("zweite");
});

test("a preposition with its own complement is never taken as the prefix when jev says None", async () => {
	const quarrel = await resolveOnce(
		{
			jev: fakeJev({ prefix: "None", reflexive: "Acc" }).ask,
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
