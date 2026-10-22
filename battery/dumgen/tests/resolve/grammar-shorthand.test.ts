import { expect, test } from "bun:test";
import type { JevAsk } from "../../src/segment/jev.js";
import {
	attested,
	fakeJev,
	fakeLuna,
	resolveOnce,
	sentenceOf,
	unitOf,
	writes,
} from "./support.js";

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
