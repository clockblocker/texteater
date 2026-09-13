import { afterAll, describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { closeTestingSessions, inferredCompletions } from "prinfer/testing";

import type {
	Attestation,
	CoreFeaturesFor,
	DumlingCsv,
	EntityValue,
	IdDecodeSuccess,
	InflectionalFeaturesFor,
	LanguageApi,
	Lemma,
	LemmaFamilyFor,
	LemmaFamilyForSurfaceKind,
	LemmaIdentity,
	LemmaKindFor,
	LemmaRoute,
	PresentedAttestation,
	PresentedLemma,
	PresentedSurface,
	Reading,
	Surface,
	SurfaceIdentity,
	SurfaceKindFor,
} from "../../src/types";

afterAll(closeTestingSessions);

export type asda = LemmaFamilyForSurfaceKind<"">;

// @ts-expect-error The empty argument deliberately captures editor completions.
export type AutocompleteLemma = Lemma<"">;
// @ts-expect-error The empty argument deliberately captures editor completions.
export type AutocompleteSurface = Surface<"">;
// @ts-expect-error The empty argument deliberately captures editor completions.
export type AutocompleteAttestation = Attestation<"">;
// @ts-expect-error The empty argument deliberately captures editor completions.
export type AutocompleteReading = Reading<"">;
// @ts-expect-error The empty argument deliberately captures editor completions.
export type AutocompletePresentedLemma = PresentedLemma<"">;
// @ts-expect-error The empty argument deliberately captures editor completions.
export type AutocompletePresentedSurface = PresentedSurface<"">;
// @ts-expect-error The empty argument deliberately captures editor completions.
export type AutocompletePresentedAttestation = PresentedAttestation<"">;
// @ts-expect-error The empty argument deliberately captures editor completions.
export type AutocompleteLemmaIdentity = LemmaIdentity<"">;
// @ts-expect-error The empty argument deliberately captures editor completions.
export type AutocompleteSurfaceIdentity = SurfaceIdentity<"">;
// @ts-expect-error The empty argument deliberately captures editor completions.
export type AutocompleteDumlingCsv = DumlingCsv<"">;
// @ts-expect-error The empty argument deliberately captures editor completions.
export type AutocompleteLemmaFamilyFor = LemmaFamilyFor<"">;
export type AutocompleteLemmaKindFor = LemmaKindFor<"">;
// @ts-expect-error The empty argument deliberately captures editor completions.
export type AutocompleteLemmaRoute = LemmaRoute<"">;
// @ts-expect-error The empty argument deliberately captures editor completions.
export type AutocompleteSurfaceKindFor = SurfaceKindFor<"">;
// @ts-expect-error The empty argument deliberately captures editor completions.
export type AutocompleteCoreFeaturesFor = CoreFeaturesFor<"", never, never>;
export type AutocompleteInflectionalFeaturesFor = InflectionalFeaturesFor<
	// @ts-expect-error The empty argument deliberately captures editor completions.
	"",
	never,
	never
>;
// @ts-expect-error The empty argument deliberately captures editor completions.
export type AutocompleteEntityValue = EntityValue<"">;
// @ts-expect-error The empty argument deliberately captures editor completions.
export type AutocompleteIdDecodeSuccess = IdDecodeSuccess<"">;
// @ts-expect-error The empty argument deliberately captures editor completions.
export type AutocompleteLanguageApi = LanguageApi<"">;

const publicLanguageGenerics = [
	["asda", "LemmaFamilyForSurfaceKind"],
	["AutocompleteLemma", "Lemma"],
	["AutocompleteSurface", "Surface"],
	["AutocompleteAttestation", "Attestation"],
	["AutocompleteReading", "Reading"],
	["AutocompletePresentedLemma", "PresentedLemma"],
	["AutocompletePresentedSurface", "PresentedSurface"],
	["AutocompletePresentedAttestation", "PresentedAttestation"],
	["AutocompleteLemmaIdentity", "LemmaIdentity"],
	["AutocompleteSurfaceIdentity", "SurfaceIdentity"],
	["AutocompleteDumlingCsv", "DumlingCsv"],
	["AutocompleteLemmaFamilyFor", "LemmaFamilyFor"],
	["AutocompleteLemmaKindFor", "LemmaKindFor"],
	["AutocompleteLemmaRoute", "LemmaRoute"],
	["AutocompleteSurfaceKindFor", "SurfaceKindFor"],
	["AutocompleteCoreFeaturesFor", "CoreFeaturesFor"],
	["AutocompleteInflectionalFeaturesFor", "InflectionalFeaturesFor"],
	["AutocompleteEntityValue", "EntityValue"],
	["AutocompleteIdDecodeSuccess", "IdDecodeSuccess"],
	["AutocompleteLanguageApi", "LanguageApi"],
] as const;

async function completionNamesAtEmptyString(
	file: string,
	source: string,
	alias: string,
): Promise<string[]> {
	const declarationOffset = source.indexOf(`type ${alias} =`);
	const cursorOffset = source.indexOf('""', declarationOffset) + 1;
	const sourceBeforeCursor = source.slice(0, cursorOffset);
	const line = sourceBeforeCursor.split("\n").length;
	const column = cursorOffset - sourceBeforeCursor.lastIndexOf("\n");

	return (
		await inferredCompletions(file, {
			line,
			column,
			backend: "typescript7",
		})
	).sort();
}

describe("Dumling language autocomplete", () => {
	const file = fileURLToPath(import.meta.url);
	const source = readFileSync(file, "utf8");

	for (const [alias, generic] of publicLanguageGenerics) {
		it(`suggests supported languages for ${generic}`, async () => {
			expect(
				await completionNamesAtEmptyString(file, source, alias),
			).toEqual(["de", "en", "he"]);
		});
	}
});
