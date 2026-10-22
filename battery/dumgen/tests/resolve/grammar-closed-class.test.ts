import { expect, test } from "bun:test";
import { isSyncreticUnit, isSyncretism } from "dumling";
import {
	attested,
	fakeJev,
	fakeLuna,
	resolveOnce,
	sentenceOf,
	unitOf,
	writes,
} from "./support.js";

// The closed-class identity intake stored (#864, ADR 0021).

test("a closed-class unit builds its Lemma from the stored identity, with no identity question and no Luna", async () => {
	// Dieses0 _1 Haus2 _3 ist4 _5 alt6 .7
	const jev = fakeJev();
	const luna = fakeLuna();
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: luna.ask },
		{
			sentence: sentenceOf("Dieses Haus ist alt."),
			unit: unitOf([0], "Lexeme/DET", {
				kind: "DET",
				canonicalForm: "dieser",
				pronType: "Dem",
			}),
		},
	);
	const attestation = attested(result);
	expect(attestation.surface.lemma.canonicalForm).toBe("dieser");
	expect(attestation.surface.normalizedSurface).toBe("dieses");
	expect(luna.sent).toEqual([]);
	// One question, about the occurrence's cell only, without neighbours.
	expect(jev.stages()).toEqual(["cell"]);
	expect(Object.keys(jev.sent[0]?.questions ?? {})).toEqual(["cell"]);
	expect(jev.sent[0]?.state.neighbours).toBeUndefined();
});

test("an identity whose spelling names one cell asks nothing", async () => {
	// Ich0 _1 komme2 .3
	const jev = fakeJev();
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: fakeLuna().ask },
		{
			sentence: sentenceOf("Ich komme."),
			unit: unitOf([0], "Lexeme/PRON", {
				kind: "PRON",
				canonicalForm: "ich",
				pronType: "Prs",
			}),
		},
	);
	expect(attested(result).surface.lemma.coreFeatures).toMatchObject({
		case: "Nom",
		person: "1",
	});
	expect(jev.sent).toEqual([]);
});

test("a DET or PRON unit without an identity, or one the inventory lacks, is a Catalog Miss", async () => {
	const jev = fakeJev();
	const none = await resolveOnce(
		{ jev: jev.ask, luna: fakeLuna().ask },
		{
			sentence: sentenceOf("Blubb kommt."),
			unit: unitOf([0], "Lexeme/PRON"),
		},
	);
	expect(none.result).toMatchObject({
		_tag: "CatalogMiss",
		route: { family: "Lexeme", kind: "PRON" },
	});
	const unrealized = await resolveOnce(
		{ jev: jev.ask, luna: fakeLuna().ask },
		{
			sentence: sentenceOf("Ihm hilft keiner."),
			unit: unitOf([0], "Lexeme/PRON", {
				kind: "PRON",
				canonicalForm: "er",
				pronType: "Prs",
			}),
		},
	);
	expect(unrealized.result._tag).toBe("CatalogMiss");
	expect(unrealized.trace?.resolution?.outcome).toBe("CatalogMiss");
	expect(jev.sent).toEqual([]);
});

// The referent decides only some pronoun forms (ADR 0044, ADR 0046).

const ihm = {
	sentence: sentenceOf("Ich gebe ihm das Buch."),
	unit: unitOf([4], "Lexeme/PRON", {
		kind: "PRON",
		canonicalForm: "ihm",
		pronType: "Prs",
	}),
};

test("a referent no text settles attests the form's Syncretism, never a guessed cell", async () => {
	const jev = fakeJev({ cell: "s0" });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: fakeLuna().ask },
		{ ...ihm, neighbours: { before: "Das Kind weint." } },
	);
	const lemma = attested(result).surface.lemma;
	expect(isSyncreticUnit(lemma) && lemma.syncretic).toEqual(["gender"]);
	expect(lemma.coreFeatures).toMatchObject({ case: "Dat", gender: null });
	// The neighbours go only to the question the referent decides.
	expect(jev.sent[0]?.state.neighbours).toEqual({
		before: "Das Kind weint.",
	});
	expect(jev.sent[0]?.state.policy).toHaveProperty("referent");
});

test("a referent the neighbours settle attests its cell", async () => {
	const settled = fakeJev({ cell: "o0" });
	const { result } = await resolveOnce(
		{ jev: settled.ask, luna: fakeLuna().ask },
		{ ...ihm, neighbours: { before: "Mein Bruder kommt." } },
	);
	const lemma = attested(result).surface.lemma;
	expect(isSyncreticUnit(lemma)).toBe(false);
	expect(lemma.coreFeatures).toHaveProperty(
		"gender",
		expect.stringMatching(/^(Masc|Neut)$/),
	);
});

const jedem = {
	sentence: sentenceOf("Ich helfe jedem."),
	unit: unitOf([4], "Lexeme/PRON", {
		kind: "PRON",
		canonicalForm: "jeder",
		pronType: "Tot",
	}),
};

test("a stem's gender-only cells offer its Surface Syncretism, which an open referent attests", async () => {
	const jev = fakeJev({ cell: "s0" });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: fakeLuna().ask },
		{ ...jedem, neighbours: { before: "Heute ist Markt." } },
	);
	const { surface } = attested(result);
	expect(surface.lemma.canonicalForm).toBe("jeder");
	expect(surface.lemma).not.toHaveProperty("syncretic");
	expect(surface).toMatchObject({
		normalizedSurface: "jedem",
		syncretic: ["gender"],
		inflectionalFeatures: { case: "Dat", number: "Sing", gender: null },
	});
	const syncretism =
		result._tag === "Resolved" ? result.attestation.surface : undefined;
	if (syncretism === undefined || !isSyncretism(syncretism))
		throw Error("Expected a Surface Syncretism");
	expect(
		syncretism.syncretized.map((unit) => {
			const bag: Readonly<Record<string, unknown>> | null =
				"inflectionalFeatures" in unit
					? unit.inflectionalFeatures
					: null;
			return bag?.gender;
		}),
	).toEqual(["Masc", "Neut"]);
	const cell = jev.sent[0]?.questions.cell;
	expect(Object.keys(cell?.type === "choice" ? cell.criteria : {})).toEqual([
		"o0",
		"o1",
		"s0",
		"Unresolved",
	]);
	expect(jev.sent[0]?.state.neighbours).toEqual({
		before: "Heute ist Markt.",
	});
});

test("a stem whose referent the sentence settles attests the settled Surface", async () => {
	const jev = fakeJev({ cell: "o1" });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: fakeLuna().ask },
		{
			sentence: sentenceOf("Von den Kindern helfe ich jedem."),
			unit: unitOf([10], "Lexeme/PRON", {
				kind: "PRON",
				canonicalForm: "jeder",
				pronType: "Tot",
			}),
		},
	);
	const { surface } = attested(result);
	expect(surface).not.toHaveProperty("syncretic");
	expect(surface).toMatchObject({
		inflectionalFeatures: { case: "Dat", gender: "Neut" },
	});
});

test("standalone allem means 'everything': its cell question offers no Syncretism", async () => {
	const jev = fakeJev({ cell: "o1" });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: fakeLuna().ask },
		{
			sentence: sentenceOf("Mit allem bin ich einverstanden."),
			unit: unitOf([2], "Lexeme/PRON", {
				kind: "PRON",
				canonicalForm: "alle",
				pronType: "Tot",
			}),
			neighbours: { before: "Heute ist Markt." },
		},
	);
	const cell = jev.sent[0]?.questions.cell;
	const criteria = cell?.type === "choice" ? cell.criteria : {};
	expect(Object.keys(criteria)).toEqual(["o0", "o1", "Unresolved"]);
	expect(criteria.o1).toContain("neuter");
	const { surface } = attested(result);
	expect(surface).not.toHaveProperty("syncretic");
	expect(surface).toMatchObject({
		normalizedSurface: "allem",
		inflectionalFeatures: { case: "Dat", number: "Sing", gender: "Neut" },
	});
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
