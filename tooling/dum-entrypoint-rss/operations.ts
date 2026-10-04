import assert from "node:assert/strict";

type PublicModule = Record<string, unknown>;
const lemma = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem" },
} as const;
const reading = {
	unitKind: "Reading",
	lemma,
	emojiDescription: "🏦",
} as const;
/** Views a published module through its workspace declarations once each probed export is a function. */
function published<Module>(
	module: PublicModule,
	...names: readonly (keyof Module & string)[]
): Module {
	for (const name of names) {
		assert.equal(
			typeof module[name],
			"function",
			`Missing public operation ${name}`,
		);
	}
	return module as Module;
}
export async function runRepresentativeOperation(
	id: string,
	module: PublicModule,
): Promise<void> {
	switch (id) {
		case "dumval.validate": {
			const { parseValidationArtifact, ParsingError } = published<
				typeof import("dumval/runtime")
			>(module, "parseValidationArtifact", "ParsingError");
			const artifact = { version: 1, root: ["string"] } as const;
			assert.equal(parseValidationArtifact(artifact, "value"), "value");
			assert.ok(
				parseValidationArtifact(artifact, 42) instanceof ParsingError,
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
			assert.equal(
				published<typeof import("dumling")>(
					module,
					"parseUnit",
				).parseUnit(lemma).success,
				true,
			);
			break;
		case "dumling.validate-feature-bag": {
			const operations = module.validationOperations as Record<
				string,
				| ((input: unknown) => { value: unknown; issues?: unknown[] })
				| undefined
			>;
			const marked = operations["dumling.feature-bag.marked"];
			assert.ok(marked, "Missing dumling.feature-bag.marked operation");
			assert.equal(marked({ case: "Nom" }).issues?.length ?? 0, 0);
			break;
		}
		case "dumrel.knowledge-projection": {
			const {
				applyKnowledgeChange,
				projectSemanticRelations,
				selectKnowledge,
			} = published<typeof import("dumrel")>(
				module,
				"applyKnowledgeChange",
				"projectSemanticRelations",
				"selectKnowledge",
			);
			const result = applyKnowledgeChange({
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
				selectKnowledge({
					route: { language: "de", family: "Lexeme", kind: "NOUN" },
				}).success,
				true,
			);
			assert.equal(
				projectSemanticRelations([{ reading, knowledge: result.value }])
					.success,
				true,
			);
			break;
		}
		case "dumdict.identity":
			assert.equal(
				typeof published<typeof import("dumdict/runtime")>(
					module,
					"makeSurfaceId",
				).makeSurfaceId("de", {
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
			const result = published<typeof import("dumdict")>(
				module,
				"parseAsLemmaRecord",
			).parseAsLemmaRecord({ lemma }, "de");
			assert.deepEqual(result, { lemma });
			break;
		}
		case "dumdict.session-storage": {
			const storage = published<typeof import("dumdict/memory")>(
				module,
				"createMemoryStorage",
			).createMemoryStorage("de");
			assert.deepEqual(storage.snapshot(), []);
			break;
		}
		case "dumdict.pending-identity":
			assert.deepEqual(
				published<typeof import("dumdict/pending")>(
					module,
					"createPendingSemanticRelationRecord",
					"deduplicatePendingSemanticRelationRecords",
				).deduplicatePendingSemanticRelationRecords([]),
				[],
			);
			break;
		case "dumdict.plan-reading-entry": {
			const planner = published<typeof import("dumdict/planning")>(
				module,
				"createDumdictPlanner",
			).createDumdictPlanner("de");
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
				planned.plan.changes.map((change) => change.type),
				["createLemma", "createReading"],
			);
			break;
		}
		default:
			throw new Error(`Unknown representative operation: ${id}`);
	}
}
