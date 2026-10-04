import assert from "node:assert/strict";

type PublicModule = Record<string, unknown>;
const lemma = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem" },
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
		case "dumval.validate": {
			assert.equal(
				call(
					module,
					"parseValidationArtifact",
					{ version: 1, root: ["string"] },
					"value",
				),
				"value",
			);
			assert.ok(
				call(
					module,
					"parseValidationArtifact",
					{ version: 1, root: ["string"] },
					42,
				) instanceof (module.ParsingError as typeof Error),
			);
			break;
		}
		case "dumling.compiled-validation":
		case "dumrel.compiled-validation": {
			const { parseCompiledValidation, ParsingError } = await import(
				"dumval/runtime"
			);
			const registry =
				module.validationRegistry as import("dumval/runtime").CompiledValidationRegistry;
			const { validationOperations } = await import("dumling/validation");
			const key = id.startsWith("dumling")
				? "Lemma/de/Lexeme/NOUN"
				: "readingKnowledge";
			const parsed = parseCompiledValidation(
				registry,
				key,
				id.startsWith("dumling") ? lemma : {},
				validationOperations,
			);
			assert.ok(!(parsed instanceof ParsingError));
			assert.equal(Object.isFrozen(registry), true);
			break;
		}

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
					spelling: { kind: "Canonical" },
					surfaceFeatures: null,
					inflectionalFeatures: {
						case: "Nom",
						gender: null,
						number: "Sing",
					},
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
		case "dumdict.plan-reading-entry": {
			const planner = call(module, "createDumdictPlanner", "de");
			const planned = planner.ensureReadingEntry(
				{ intent: "ensureReadingEntry", revision: "rss-0" },
				{
					entry: {
						reading,
						attestedTranslations: [],
						attestations: [],
						notes: "",
					},
				},
			);
			assert.equal(planned.status, "planned");
			assert.deepEqual(
				planned.plan.changes.map(
					(change: { type: string }) => change.type,
				),
				["createLemma", "createReading"],
			);
			break;
		}
		default:
			throw new Error(`Unknown representative operation: ${id}`);
	}
}
