import { expect, test } from "bun:test";
import {
	attested,
	fakeJev,
	fakeLuna,
	resolveOnce,
	sentenceOf,
	unitOf,
} from "./support.js";

/** Luna writing `canonicalForm`, with `members` or the members as attested. */
const writes = (canonicalForm: string, members?: readonly string[]) =>
	fakeLuna(({ members: sent }) => ({
		canonicalForm,
		members: members ?? sent.map(({ text }) => text),
	}));

test("of a VERB's twin prepositions, the last is its particle and the earlier one governed, whatever jev says of them", async () => {
	// Pass0 _1 auf2 _3 dich4 _5 auf6 .7
	const jev = fakeJev({
		prefix: "p0",
		mood: "Imp",
		person: "2",
		number: "Sing",
		governed_m1: "Free",
		governed_m2: "Free",
		governedCase_m1: "Acc",
	});
	const careful = attested(
		(
			await resolveOnce(
				{
					jev: jev.ask,
					luna: writes("aufpassen", ["pass", "auf", "auf"]).ask,
				},
				{
					sentence: sentenceOf("Pass auf dich auf."),
					unit: unitOf([0, 2, 6], "Lexeme/VERB"),
				},
			)
		).result,
	);
	expect(careful.surface.normalizedSurface).toBe("pass auf");
	expect(careful.surface.lemma).toMatchObject({
		canonicalForm: "aufpassen",
		coreFeatures: { hasSepPrefix: "auf" },
	});
	expect(careful).toMatchObject({
		valencyEvidence: [
			{
				member: 1,
				complement: { kind: "Preposition", governedCase: "Acc" },
			},
		],
	});
	const asked = jev.sent.flatMap(({ questions }) => Object.keys(questions));
	expect(asked).not.toContain("governed_m1");
	expect(asked).not.toContain("governed_m2");
	expect(asked).toContain("governedCase_m1");
});

test("a governed preposition the verb's own word opens with stays its prefix", async () => {
	// dass0 _1 er2 _3 auf4 _5 sie6 _7 aufpasst8 .9
	const careful = attested(
		(
			await resolveOnce(
				{
					jev: fakeJev({
						prefix: "p0",
						governed_m0: "Governed",
						governedCase_m0: "Acc",
					}).ask,
					luna: writes("aufpassen").ask,
				},
				{
					sentence: sentenceOf("dass er auf sie aufpasst."),
					unit: unitOf([4, 8], "Lexeme/VERB"),
				},
			)
		).result,
	);
	expect(careful.surface.lemma.coreFeatures).toMatchObject({
		hasSepPrefix: "auf",
	});
	expect(careful.surface.normalizedSurface).toBe("aufpasst");
});

test("a preposition the verb governs is still never its prefix", async () => {
	// Sie0 _1 warten2 _3 auf4 _5 ihn6 .7
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
