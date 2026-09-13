import assert from "node:assert/strict";

type PublicModule = Record<string, unknown>;
const lemma = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem", hyph: null },
};
const reading = { unitKind: "Reading", lemma, emojiDescription: "🏦" };
function call(module: PublicModule, name: string, ...args: unknown[]): any {
	const operation = module[name];
	assert.equal(
		typeof operation,
		"function",
		`Missing public operation ${name}`,
	);
	return (operation as (...args: unknown[]) => unknown)(...args);
}
export async function runRepresentativeOperation(
	id: string,
	module: PublicModule,
): Promise<void> {
	switch (id) {
		case "dumling.parse-unit":
			assert.equal(call(module, "parseUnit", lemma).success, true);
			break;
		case "dumling.validate-feature-bag": {
			const operations = module.validationOperations as Record<
				string,
				(input: unknown) => { value: unknown; issues?: unknown[] }
			>;
			assert.equal(
				typeof operations["dumling.feature-bag.marked"],
				"function",
			);
			assert.ok(
				(operations["dumling.feature-bag.marked"]!({ case: "Nom" })
					.issues?.length ?? 0) === 0,
			);
			break;
		}
		case "dumrel.knowledge-projection": {
			const result = call(module, "applyKnowledgeChange", {
				source: reading,
				knowledge: {},
				change: {
					kind: "Contribute",
					aspect: "definition",
					value: " bank ",
				},
			});
			assert.deepEqual(result, {
				success: true,
				value: { definition: "bank" },
			});
			assert.equal(
				call(module, "selectKnowledge", {
					route: { language: "de", family: "Lexeme", kind: "NOUN" },
				}).success,
				true,
			);
			assert.equal(
				call(module, "projectSemanticRelations", [
					{ reading, knowledge: result.value },
				]).success,
				true,
			);
			break;
		}
		case "dumdict.identity":
			assert.equal(
				typeof call(module, "makeSurfaceId", "de", {
					unitKind: "Surface",
					language: "de",
					lemma,
					normalizedSurface: "Bank",
					spelling: "Canonical",
					surfaceFeatures: null,
					inflectionalFeatures: { case: "Nom", number: "Sing" },
				}),
				"string",
			);
			break;
		case "dumdict.parse-record": {
			const result = call(module, "parseAsLemmaRecord", { lemma }, "de");
			assert.deepEqual(result, { lemma });
			break;
		}
		case "dumdict.session-storage": {
			const storage = call(module, "createMemoryStorage", "de");
			assert.deepEqual(storage.snapshot(), []);
			break;
		}
		case "dumdict.project-relations":
			assert.deepEqual(call(module, "projectSemanticRelations", []), {
				success: true,
				value: [],
			});
			break;
		case "dumdict.pending-identity":
			assert.equal(
				typeof module.createPendingSemanticRelationRecord,
				"function",
			);
			assert.deepEqual(
				call(module, "deduplicatePendingSemanticRelationRecords", []),
				[],
			);
			break;
		case "dumgen.resolve-supplied-target": {
			const dumgen = call(module, "createDumgen", {
				execute: async () => ({
					memberOrthographies: ["Standard"],
					normalizedMembers: ["Bank"],
					surface: {
						spelling: "Canonical",
						surfaceFeatures: null,
						inflectionalFeatures: { case: "Nom", number: "Sing" },
					},
					lemma: {
						canonicalForm: "Bank",
						coreFeatures: { gender: "Fem", hyph: null },
					},
					realizationCoverage: "Full",
				}),
			});
			const { runPromise } = await import("effect/Effect");
			const result: any = await runPromise(
				dumgen.resolveGrammar({
					sentence: {
						id: "rss",
						language: "de",
						segments: [{ kind: "ResolvableText", text: "Bank" }],
					},
					target: {
						family: "Lexeme",
						kind: "NOUN",
						memberSegmentIndices: [0],
					},
				}),
			);
			assert.equal(result.unitKind, "Attestation");
			break;
		}
		default:
			throw new Error(`Unknown representative operation: ${id}`);
	}
}
