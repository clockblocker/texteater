import { describe, expect, it } from "bun:test";
import { dumling } from "../../../src";
import { concreteFeatureSchemaInventory } from "../../../src/operations/shared/id-codec/schema-inventory";
import {
	featureNameTokens,
	featureValueTokens,
	rawStringFeatureNames,
} from "../../../src/operations/shared/id-codec/tiny-tokens";

function sorted(values: Iterable<string>): string[] {
	return [...values].sort((left, right) => left.localeCompare(right));
}

function difference(left: readonly string[], right: readonly string[]) {
	const rightSet = new Set(right);
	return left.filter((value) => !rightSet.has(value));
}

describe("ID format migration plan contracts", () => {
	const expectedRawStringFeatureNames = ["hasGovPrep", "hasSepPrefix"];

	it("rejects readable CSV feature values containing ID feature delimiters", () => {
		const decoded = dumling.en.id.decode.asLemma(
			"Lemma,en,Lexeme,VERB,give,👉,hasGovPrep=up=down",
		);

		expect(decoded.success).toBe(false);
		if (decoded.success) {
			throw new Error(
				"Expected delimiter-containing feature value to fail",
			);
		}
		expect(decoded.error.code).toBe("InvalidPayload");
		expect(decoded.error.message).toContain("must not contain");
	});

	it("keeps tiny token feature coverage in lockstep with the concrete schema inventory", () => {
		const schemaInventory = {
			featureNames: sorted(concreteFeatureSchemaInventory.featureNames),
			finiteFeatureValues: Object.fromEntries(
				Object.entries(
					concreteFeatureSchemaInventory.finiteFeatureValues,
				)
					.map(([name, values]) => [name, sorted(values)] as const)
					.sort(([left], [right]) => left.localeCompare(right)),
			),
		};
		const tokenFeatureNames = sorted(Object.keys(featureNameTokens));

		expect({
			missingFromTokens: difference(
				schemaInventory.featureNames,
				tokenFeatureNames,
			),
			notInConcreteSchemas: difference(
				tokenFeatureNames,
				schemaInventory.featureNames,
			),
		}).toEqual({
			missingFromTokens: [],
			notInConcreteSchemas: [],
		});

		const finiteTokenValues = Object.fromEntries(
			Object.entries(featureValueTokens)
				.map(
					([name, values]) =>
						[name, sorted(Object.keys(values))] as const,
				)
				.sort(([left], [right]) => left.localeCompare(right)),
		);

		const valueCoverageMismatches = sorted(
			sorted([
				...Object.keys(schemaInventory.finiteFeatureValues),
				...Object.keys(finiteTokenValues),
			]).flatMap((name) => {
				const schemaValues =
					schemaInventory.finiteFeatureValues[name] ?? [];
				const tokenValues = finiteTokenValues[name] ?? [];
				const missingFromTokens = difference(schemaValues, tokenValues);
				const notInConcreteSchemas = difference(
					tokenValues,
					schemaValues,
				);

				if (
					missingFromTokens.length === 0 &&
					notInConcreteSchemas.length === 0
				) {
					return [];
				}

				return `${name}: missingFromTokens=${missingFromTokens.join(
					"+",
				)} notInConcreteSchemas=${notInConcreteSchemas.join("+")}`;
			}),
		);

		expect(valueCoverageMismatches).toEqual([]);
	});

	it("limits raw tiny CSV feature values to governed preposition and separable prefix text", () => {
		expect(sorted(rawStringFeatureNames)).toEqual(
			expectedRawStringFeatureNames,
		);
	});

	it("requires every finite tiny CSV feature value namespace to have explicit tokens", () => {
		const rawStringFeatureNameSet: ReadonlySet<string> =
			rawStringFeatureNames;
		const emptyTokenNamespaces = sorted(
			Object.entries(featureValueTokens)
				.filter(([name]) => !rawStringFeatureNameSet.has(name))
				.filter(([, values]) => Object.keys(values).length === 0)
				.map(([name]) => name),
		);

		expect(emptyTokenNamespaces).toEqual([]);
	});

	it("round-trips raw governed preposition and separable prefix text through base64url IDs", () => {
		const englishVerb = dumling.en.create.lemma({
			canonicalLemma: "give up",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: { hasGovPrep: "up" },
			meaningInEmojis: "👉",
		});
		const germanVerb = dumling.de.create.lemma({
			canonicalLemma: "mitgehen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: { hasSepPrefix: "mit" },
			meaningInEmojis: "🚶",
		});

		expect(
			dumling.en.id.decode.asLemma(
				dumling.en.id.encode.asBase64Url(englishVerb),
			),
		).toEqual({
			success: true,
			data: {
				format: "base64url",
				language: "en",
				kind: "Lemma",
				lemma: englishVerb,
			},
		});
		expect(
			dumling.de.id.decode.asLemma(
				dumling.de.id.encode.asBase64Url(germanVerb),
			),
		).toEqual({
			success: true,
			data: {
				format: "base64url",
				language: "de",
				kind: "Lemma",
				lemma: germanVerb,
			},
		});
	});

	it("requires explicit short tokens instead of using readable feature values as tiny tokens", () => {
		const identityFeatureValueTokens = Object.entries(featureValueTokens)
			.flatMap(([name, values]) =>
				Object.entries(values).map(([value, token]) => ({
					name,
					token,
					value,
				})),
			)
			.filter(({ token, value }) => token === value)
			.map(({ name, value }) => `${name}=${value}`);

		if (identityFeatureValueTokens.length > 0) {
			throw new Error(
				`Tiny CSV uses readable feature values as v1 tokens: ${identityFeatureValueTokens
					.slice(0, 20)
					.join(", ")}`,
			);
		}
	});
});
