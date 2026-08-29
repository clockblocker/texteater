import { expect, test } from "bun:test";
import {
	fixedPronounCandidatesForLegacySurface,
	reconcilePronounSurfaceAttestationsPage,
} from "../convex/pronounFixedPopulationMigration";
import { withLegacyPronounReferenceNulls } from "../server/operationalParsing";
import { IndexedTestDb } from "./support/indexed-db";

function handler(value: unknown) {
	return (
		value as {
			_handler: (ctx: unknown, args: unknown) => Promise<unknown>;
		}
	)._handler;
}

const legacyCore = {
	extPos: null,
	foreign: null,
	person: "1",
	polite: null,
	poss: null,
	pronType: "Prs",
} as const;

test("legacy PRON reads gain explicit nullable reference keys", () => {
	const normalized = withLegacyPronounReferenceNulls({
		language: "de",
		family: "Lexeme",
		kind: "PRON",
		canonicalForm: "ich",
		coreFeatures: legacyCore,
	});

	expect(normalized).toMatchObject({
		coreFeatures: { referenceGender: null, referenceNumber: null },
	});
});

test("reconciles a heavily reused Surface through scheduled attestation pages", async () => {
	const db = new IndexedTestDb({
		attestations: Array.from({ length: 101 }, (_, index) => ({
			_id: `attestation-${index}`,
			surfaceId: "surface-1",
			readingId: "reading-old",
		})),
	});
	const scheduled: unknown[] = [];
	const first = (await handler(reconcilePronounSurfaceAttestationsPage)(
		{
			db,
			scheduler: {
				async runAfter(_delay: number, _fn: unknown, args: unknown) {
					scheduled.push(args);
				},
			},
		},
		{
			surfaceId: "surface-1",
			targetReadingId: "reading-fixed",
			cursor: null,
		},
	)) as {
		continueCursor: string;
		isDone: boolean;
		visited: number;
		changed: number;
	};
	expect(first).toEqual({
		continueCursor: "100",
		isDone: false,
		visited: 100,
		changed: 100,
	});
	expect(scheduled).toEqual([
		{
			surfaceId: "surface-1",
			targetReadingId: "reading-fixed",
			cursor: "100",
		},
	]);
	expect(
		db
			.rows("attestations")
			.filter(({ readingId }) => readingId === "reading-fixed"),
	).toHaveLength(100);
});

test("migration identifies deterministic case forms and reports homographs", () => {
	expect(
		fixedPronounCandidatesForLegacySurface({
			canonicalForm: "ich",
			coreFeatures: legacyCore,
			normalizedSurface: "mich",
		}).map(({ lemma }) => lemma.canonicalForm),
	).toEqual(["mich"]);

	const thirdPerson = { ...legacyCore, person: "3" as const };
	expect(
		fixedPronounCandidatesForLegacySurface({
			canonicalForm: "er",
			coreFeatures: thirdPerson,
			normalizedSurface: "ihm",
		}),
	).toHaveLength(2);
	expect(
		fixedPronounCandidatesForLegacySurface({
			canonicalForm: "er",
			coreFeatures: thirdPerson,
			inflectionalFeatures: {
				case: "Dat",
				gender: "Masc",
				number: "Sing",
			},
			normalizedSurface: "ihm",
		}),
	).toHaveLength(1);
});

test("migration resolves a declined possessive to its fixed base", () => {
	const candidates = fixedPronounCandidatesForLegacySurface({
		canonicalForm: "mein",
		coreFeatures: { ...legacyCore, poss: "Yes" },
		normalizedSurface: "meiner",
	});

	expect(candidates).toHaveLength(1);
	expect(candidates[0]?.lemma.canonicalForm).toBe("mein");
});

test("migration resolves exact interrogative case forms and leaves non-members open", () => {
	const interrogativeCore = {
		...legacyCore,
		person: null,
		pronType: "Int" as const,
	};
	for (const form of ["wer", "wen", "wem", "wessen"] as const) {
		const candidates = fixedPronounCandidatesForLegacySurface({
			canonicalForm: "wer",
			coreFeatures: interrogativeCore,
			normalizedSurface: form,
		});
		expect(candidates).toHaveLength(1);
		expect(candidates[0]?.lemma.canonicalForm).toBe(form);
	}
	for (const form of ["was", "irgendwer"] as const) {
		expect(
			fixedPronounCandidatesForLegacySurface({
				canonicalForm: form,
				coreFeatures: interrogativeCore,
				normalizedSurface: form,
			}),
		).toEqual([]);
	}
});

test("migration collects jemand case Surfaces without selecting negative or productive compounds", () => {
	const indefiniteCore = {
		...legacyCore,
		person: null,
		pronType: "Ind" as const,
	};
	for (const normalizedSurface of [
		"jemand",
		"jemanden",
		"jemandem",
		"jemandes",
	] as const) {
		const candidates = fixedPronounCandidatesForLegacySurface({
			canonicalForm: normalizedSurface,
			coreFeatures: indefiniteCore,
			normalizedSurface,
		});
		expect(candidates).toHaveLength(1);
		expect(candidates[0]?.lemma.canonicalForm).toBe("jemand");
	}
	expect(
		fixedPronounCandidatesForLegacySurface({
			canonicalForm: "jemand",
			coreFeatures: indefiniteCore,
			inflectionalFeatures: { case: "Dat", number: "Sing" },
			normalizedSurface: "jemand",
		}),
	).toEqual([]);
	for (const normalizedSurface of ["niemand", "irgendjemand"] as const) {
		expect(
			fixedPronounCandidatesForLegacySurface({
				canonicalForm: normalizedSurface,
				coreFeatures: indefiniteCore,
				normalizedSurface,
			}),
		).toEqual([]);
	}
});

test("migration collects niemand case Surfaces without selecting separate negative or indefinite identities", () => {
	const negativeCore = {
		...legacyCore,
		person: null,
		pronType: "Neg" as const,
	};
	for (const normalizedSurface of [
		"niemand",
		"niemanden",
		"niemandem",
		"niemandes",
	] as const) {
		const candidates = fixedPronounCandidatesForLegacySurface({
			canonicalForm: normalizedSurface,
			coreFeatures: negativeCore,
			normalizedSurface,
		});
		expect(candidates).toHaveLength(1);
		expect(candidates[0]?.lemma.canonicalForm).toBe("niemand");
	}
	expect(
		fixedPronounCandidatesForLegacySurface({
			canonicalForm: "niemand",
			coreFeatures: negativeCore,
			inflectionalFeatures: { case: "Acc", number: "Sing" },
			normalizedSurface: "niemand",
		}),
	).toEqual([]);
	for (const normalizedSurface of ["jemand", "nichts", "nix"] as const) {
		const candidates = fixedPronounCandidatesForLegacySurface({
			canonicalForm: normalizedSurface,
			coreFeatures: negativeCore,
			normalizedSurface,
		});
		expect(
			candidates.every(({ lemma }) => lemma.canonicalForm !== "niemand"),
		).toBe(true);
	}
});

test("migration collects only fully analysed keiner Surfaces and rejects syncretic guesses", () => {
	const exact = fixedPronounCandidatesForLegacySurface({
		canonicalForm: "keine",
		normalizedSurface: "keine",
		coreFeatures: { pronType: "Neg" },
		inflectionalFeatures: {
			case: "Nom",
			gender: null,
			number: "Plur",
		},
	});
	expect(exact.map(({ lemma }) => lemma.canonicalForm)).toEqual(["keiner"]);
	expect(
		fixedPronounCandidatesForLegacySurface({
			canonicalForm: "keine",
			normalizedSurface: "keine",
			coreFeatures: { pronType: "Neg" },
		}),
	).toEqual([]);
});

test("migration collects analysed jedermann cases and rejects syncretic guesses", () => {
	for (const [normalizedSurface, grammaticalCase] of [
		["jedermann", "Nom"],
		["jedermann", "Acc"],
		["jedermann", "Dat"],
		["jedermanns", "Gen"],
	] as const) {
		const candidates = fixedPronounCandidatesForLegacySurface({
			canonicalForm: normalizedSurface,
			normalizedSurface,
			coreFeatures: { pronType: "Tot" },
			inflectionalFeatures: {
				case: grammaticalCase,
				gender: null,
				number: "Sing",
			},
		});
		expect(candidates.map(({ lemma }) => lemma.canonicalForm)).toEqual([
			"jedermann",
		]);
	}
	expect(
		fixedPronounCandidatesForLegacySurface({
			canonicalForm: "jedermann",
			normalizedSurface: "jedermann",
			coreFeatures: { pronType: "Tot" },
		}),
	).toEqual([]);
});

test("migration collects only fully analysed mancher Surfaces", () => {
	const candidates = fixedPronounCandidatesForLegacySurface({
		canonicalForm: "manche",
		normalizedSurface: "manche",
		coreFeatures: { pronType: "Tot" },
		inflectionalFeatures: { case: "Nom", gender: null, number: "Plur" },
	});
	expect(candidates.map(({ lemma }) => lemma.canonicalForm)).toEqual([
		"mancher",
	]);
	expect(
		fixedPronounCandidatesForLegacySurface({
			canonicalForm: "manche",
			normalizedSurface: "manche",
			coreFeatures: { pronType: "Tot" },
		}),
	).toEqual([]);
});

test("migration collects only established total-pronoun Surfaces under alles and alle", () => {
	const totalCore = {
		...legacyCore,
		person: null,
		pronType: "Tot" as const,
	};
	const expected = {
		alles: ["alles", "Acc", "Neut", "Sing"],
		allem: ["alles", "Dat", "Neut", "Sing"],
		alle: ["alle", "Nom", null, "Plur"],
		allen: ["alle", "Dat", null, "Plur"],
		aller: ["alle", "Gen", null, "Plur"],
	} as const;

	for (const [
		normalizedSurface,
		[canonicalForm, grammaticalCase, gender, number],
	] of Object.entries(expected)) {
		const candidates = fixedPronounCandidatesForLegacySurface({
			canonicalForm: normalizedSurface,
			coreFeatures: totalCore,
			inflectionalFeatures: {
				case: grammaticalCase,
				gender,
				number,
			},
			normalizedSurface,
		});
		expect(candidates).toHaveLength(1);
		expect(candidates[0]?.lemma.canonicalForm).toBe(canonicalForm);
	}

	expect(
		fixedPronounCandidatesForLegacySurface({
			canonicalForm: "alles",
			coreFeatures: totalCore,
			inflectionalFeatures: {
				case: "Gen",
				gender: "Neut",
				number: "Sing",
			},
			normalizedSurface: "alles",
		}),
	).toEqual([]);
});

test("migration collects only established plural mehrere case Surfaces", () => {
	const totalCore = {
		...legacyCore,
		person: null,
		pronType: "Tot" as const,
	};
	const slots = [
		["mehrere", "Nom"],
		["mehrere", "Acc"],
		["mehreren", "Dat"],
		["mehrerer", "Gen"],
	] as const;

	for (const [normalizedSurface, grammaticalCase] of slots) {
		const candidates = fixedPronounCandidatesForLegacySurface({
			canonicalForm: normalizedSurface,
			coreFeatures: totalCore,
			inflectionalFeatures: {
				case: grammaticalCase,
				gender: null,
				number: "Plur",
			},
			normalizedSurface,
		});
		expect(candidates).toHaveLength(1);
		expect(candidates[0]?.lemma.canonicalForm).toBe("mehrere");
	}

	expect(
		fixedPronounCandidatesForLegacySurface({
			canonicalForm: "mehrere",
			coreFeatures: totalCore,
			normalizedSurface: "mehrere",
		}),
	).toEqual([]);
	expect(
		fixedPronounCandidatesForLegacySurface({
			canonicalForm: "mehreren",
			coreFeatures: totalCore,
			inflectionalFeatures: {
				case: "Dat",
				gender: "Masc",
				number: "Sing",
			},
			normalizedSurface: "mehreren",
		}),
	).toEqual([]);
});

test("migration collects canonical nichts and licensed nix under one fixed Reading", () => {
	const negativeCore = {
		...legacyCore,
		person: null,
		pronType: "Neg" as const,
	};
	for (const normalizedSurface of ["nichts", "nix"] as const) {
		const candidates = fixedPronounCandidatesForLegacySurface({
			canonicalForm: normalizedSurface,
			coreFeatures: negativeCore,
			normalizedSurface,
		});
		expect(candidates).toHaveLength(1);
		expect(candidates[0]?.lemma.canonicalForm).toBe("nichts");
	}
	expect(
		fixedPronounCandidatesForLegacySurface({
			canonicalForm: "niemand",
			coreFeatures: negativeCore,
			normalizedSurface: "niemand",
		}),
	).not.toContainEqual(
		expect.objectContaining({
			lemma: expect.objectContaining({ canonicalForm: "nichts" }),
		}),
	);
});

test("migration collects only the twelve singular jeder Surface analyses", () => {
	const totalCore = {
		...legacyCore,
		person: null,
		pronType: "Tot" as const,
	};
	const slots = [
		["jeder", "Nom", "Masc"],
		["jede", "Nom", "Fem"],
		["jedes", "Nom", "Neut"],
		["jeden", "Acc", "Masc"],
		["jede", "Acc", "Fem"],
		["jedes", "Acc", "Neut"],
		["jedem", "Dat", "Masc"],
		["jeder", "Dat", "Fem"],
		["jedem", "Dat", "Neut"],
		["jedes", "Gen", "Masc"],
		["jeder", "Gen", "Fem"],
		["jedes", "Gen", "Neut"],
	] as const;
	for (const [normalizedSurface, grammaticalCase, gender] of slots) {
		const candidates = fixedPronounCandidatesForLegacySurface({
			canonicalForm: normalizedSurface,
			coreFeatures: totalCore,
			inflectionalFeatures: {
				case: grammaticalCase,
				gender,
				number: "Sing",
			},
			normalizedSurface,
		});
		expect(candidates).toHaveLength(1);
		expect(candidates[0]?.lemma.canonicalForm).toBe("jeder");
	}
	expect(
		fixedPronounCandidatesForLegacySurface({
			canonicalForm: "jeder",
			coreFeatures: totalCore,
			inflectionalFeatures: {
				case: "Nom",
				gender: "Masc",
				number: "Plur",
			},
			normalizedSurface: "jeder",
		}),
	).toEqual([]);
	expect(
		fixedPronounCandidatesForLegacySurface({
			canonicalForm: "jede",
			coreFeatures: totalCore,
			normalizedSurface: "jede",
		}),
	).toEqual([]);
});

test("migration collects only the twelve fully analysed singular jedweder Surfaces", () => {
	const core = { ...legacyCore, person: null, pronType: "Tot" as const };
	const slots = [
		["jedweder", "Nom", "Masc"],
		["jedwede", "Nom", "Fem"],
		["jedwedes", "Nom", "Neut"],
		["jedweden", "Acc", "Masc"],
		["jedwede", "Acc", "Fem"],
		["jedwedes", "Acc", "Neut"],
		["jedwedem", "Dat", "Masc"],
		["jedweder", "Dat", "Fem"],
		["jedwedem", "Dat", "Neut"],
		["jedwedes", "Gen", "Masc"],
		["jedweder", "Gen", "Fem"],
		["jedwedes", "Gen", "Neut"],
	] as const;
	for (const [form, grammaticalCase, gender] of slots) {
		const candidates = fixedPronounCandidatesForLegacySurface({
			canonicalForm: form,
			coreFeatures: core,
			inflectionalFeatures: {
				case: grammaticalCase,
				gender,
				number: "Sing",
			},
			normalizedSurface: form,
		});
		expect(candidates).toHaveLength(1);
		expect(candidates[0]?.lemma.canonicalForm).toBe("jedweder");
	}
	expect(
		fixedPronounCandidatesForLegacySurface({
			canonicalForm: "jedwede",
			coreFeatures: core,
			normalizedSurface: "jedwede",
		}),
	).toEqual([]);
});

test("migration collects exactly sixteen analysed jeglicher Surfaces", () => {
	const core = { ...legacyCore, person: null, pronType: "Tot" as const };
	const slots = [
		["jeglicher", "Nom", "Masc", "Sing"],
		["jegliche", "Nom", "Fem", "Sing"],
		["jegliches", "Nom", "Neut", "Sing"],
		["jeglichen", "Acc", "Masc", "Sing"],
		["jegliche", "Acc", "Fem", "Sing"],
		["jegliches", "Acc", "Neut", "Sing"],
		["jeglichem", "Dat", "Masc", "Sing"],
		["jeglicher", "Dat", "Fem", "Sing"],
		["jeglichem", "Dat", "Neut", "Sing"],
		["jegliches", "Gen", "Masc", "Sing"],
		["jeglicher", "Gen", "Fem", "Sing"],
		["jegliches", "Gen", "Neut", "Sing"],
		["jegliche", "Nom", null, "Plur"],
		["jegliche", "Acc", null, "Plur"],
		["jeglichen", "Dat", null, "Plur"],
		["jeglicher", "Gen", null, "Plur"],
	] as const;
	for (const [form, grammaticalCase, gender, number] of slots) {
		const candidates = fixedPronounCandidatesForLegacySurface({
			canonicalForm: form,
			coreFeatures: core,
			inflectionalFeatures: { case: grammaticalCase, gender, number },
			normalizedSurface: form,
		});
		expect(candidates).toHaveLength(1);
		expect(candidates[0]?.lemma.canonicalForm).toBe("jeglicher");
	}
	expect(
		fixedPronounCandidatesForLegacySurface({
			canonicalForm: "jegliche",
			coreFeatures: core,
			normalizedSurface: "jegliche",
		}),
	).toEqual([]);
});

test("formal Surface case evidence never guesses the legacy addressee count", () => {
	const formalCore = {
		...legacyCore,
		person: "2" as const,
		polite: "Form" as const,
	};
	for (const [canonicalForm, grammaticalCase] of [
		["Sie", "Nom"],
		["Ihnen", "Dat"],
		["Ihrer", "Gen"],
	] as const) {
		const legacy = {
			canonicalForm,
			coreFeatures: formalCore,
			inflectionalFeatures: {
				case: grammaticalCase,
				number: "Plur" as const,
			},
			normalizedSurface: canonicalForm,
		};

		expect(fixedPronounCandidatesForLegacySurface(legacy)).toHaveLength(2);
		expect(
			fixedPronounCandidatesForLegacySurface({
				...legacy,
				coreFeatures: {
					...formalCore,
					referenceNumber: "Sing",
				},
			}),
		).toHaveLength(1);
	}
});

test("migration preserves exact der forms and reports a missing Dem or Rel role as ambiguous", () => {
	const baseCore = {
		extPos: null,
		foreign: null,
		person: null,
		polite: null,
		poss: null,
		referenceGender: null,
		referenceNumber: null,
	};
	for (const pronType of ["Dem", "Rel"] as const) {
		for (const canonicalForm of [
			"der",
			"die",
			"das",
			"den",
			"dem",
			"dessen",
			"deren",
			"denen",
		] as const) {
			const candidates = fixedPronounCandidatesForLegacySurface({
				canonicalForm,
				coreFeatures: { ...baseCore, pronType },
				normalizedSurface: canonicalForm,
			});
			expect(candidates).toHaveLength(1);
			expect(candidates[0]?.lemma).toMatchObject({
				canonicalForm,
				coreFeatures: { pronType },
			});
		}
	}

	const ambiguous = fixedPronounCandidatesForLegacySurface({
		canonicalForm: "der",
		coreFeatures: baseCore,
		normalizedSurface: "der",
	});
	expect(
		ambiguous.map(({ lemma }) => lemma.coreFeatures.pronType).sort(),
	).toEqual(["Dem", "Rel"]);
});
