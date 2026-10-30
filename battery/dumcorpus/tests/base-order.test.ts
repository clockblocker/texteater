import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { attestationBaseOrderIssues } from "../src/de/check-base-order.js";

const finite = {
	verbForm: "Fin",
	mood: "Ind",
	tense: "Pres",
	person: "3",
	number: "Sing",
	expletive: null,
	perfect: null,
	future: null,
	passive: null,
	voice: null,
};

/** A German VERB Attestation of `normalizedSurface`; the check reads no member. */
function attestation(
	family: "Lexeme" | "Locution",
	canonicalForm: string,
	normalizedSurface: string,
	features: Record<string, string | null> = {},
	realizationCoverage: "Full" | "Partial" = "Full",
): Dumling.Attestation<"de"> {
	return {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "de",
			lemma: {
				unitKind: "Lemma",
				language: "de",
				family,
				kind: "VERB",
				canonicalForm,
				coreFeatures: {},
			},
			normalizedSurface,
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
			inflectionalFeatures: { ...finite, ...features },
		},
		members: [],
		realizationCoverage,
	} as unknown as Dumling.Attestation<"de">;
}

const passes = (unit: Dumling.Attestation<"de">) =>
	attestationBaseOrderIssues(unit).length === 0;

test("a base-order form spells its Canonical Form, its verbal complex last in subordinate order", () => {
	for (const unit of [
		attestation("Lexeme", "anfangen", "anfängt"),
		attestation("Lexeme", "sprechen", "gesprochen hat", { perfect: "Yes" }),
		attestation("Lexeme", "verschiffen", "verschifft worden war", {
			perfect: "Yes",
			voice: "Pass",
			passive: "Process",
		}),
		attestation("Lexeme", "liefern", "geliefert bekommt", {
			voice: "Pass",
			passive: "Recipient",
		}),
		attestation("Lexeme", "müssen", "hat müssen", { perfect: "Yes" }),
		attestation("Lexeme", "reparieren", "hat reparieren lassen", {
			perfect: "Yes",
			voice: "Cau",
		}),
		attestation("Lexeme", "übrig bleiben", "übrig blieb"),
		attestation("Lexeme", "regnen", "es regnet", { expletive: "Subject" }),
		attestation("Locution", "mit zu tun haben", "mit zu tun hatte"),
		attestation("Locution", "es gut meinen", "es gut meint"),
		attestation(
			"Locution",
			"frieren wie ein Schneider",
			"fror wie ein Schneider",
		),
		attestation(
			"Locution",
			"da liegt der Hase im Pfeffer",
			"da liegt der Hase im Pfeffer",
		),
		attestation("Locution", "eine Frage stellen", "eine Frage stellen", {
			verbForm: "Inf",
			mood: null,
			tense: null,
			person: null,
			number: null,
		}),
	])
		expect([unit.surface.normalizedSurface, passes(unit)]).toEqual([
			unit.surface.normalizedSurface,
			true,
		]);
});

test("a Variation may change a determiner or a noun's number, or drop a determiner (ADR 0039)", () => {
	for (const [canonicalForm, form, features] of [
		[
			"den Nagel auf den Kopf treffen",
			"der Nagel auf den Kopf getroffen wurde",
			{ voice: "Pass", passive: "Process" },
		],
		["eine Entscheidung treffen", "die Entscheidung trifft", {}],
		[
			"eine Entscheidung treffen",
			"Entscheidungen treffen",
			{ number: "Plur" },
		],
	] as const)
		expect(
			passes(attestation("Locution", canonicalForm, form, features)),
		).toBe(true);
});

test("a main-clause order is no base-order form", () => {
	for (const unit of [
		attestation("Lexeme", "anfangen", "fängt an"),
		attestation("Lexeme", "sprechen", "hat gesprochen", { perfect: "Yes" }),
		attestation("Lexeme", "zerreiben", "hat zerrieben", { perfect: "Yes" }),
		attestation("Lexeme", "liefern", "bekommt geliefert", {
			voice: "Pass",
			passive: "Recipient",
		}),
		attestation("Lexeme", "regnen", "regnet es", { expletive: "Subject" }),
		attestation("Locution", "mit zu tun haben", "hatte mit zu tun"),
		attestation(
			"Locution",
			"alle Hände voll zu tun haben",
			"hat alle Hände voll zu tun",
		),
	])
		expect([unit.surface.normalizedSurface, passes(unit)]).toEqual([
			unit.surface.normalizedSurface,
			false,
		]);
});

test("an imperative and a Partial realization are not read", () => {
	expect(
		passes(
			attestation("Lexeme", "hereinkommen", "komm herein", {
				mood: "Imp",
				tense: null,
				person: "2",
			}),
		),
	).toBe(true);
	expect(
		passes(
			attestation(
				"Locution",
				"das Handtuch werfen",
				"hat geworfen",
				{ perfect: "Yes" },
				"Partial",
			),
		),
	).toBe(true);
});
