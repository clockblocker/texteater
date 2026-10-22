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
		case "common-utils.canonical-json": {
			const { canonicalJson, required } = published<
				typeof import("common-utils")
			>(module, "canonicalJson", "required");
			assert.equal(
				canonicalJson({ b: 1, a: required([2].at(0)) }),
				'{"a":2,"b":1}',
			);
			break;
		}
		case "common-utils.validate": {
			const { parseValidationArtifact, ParsingError } = published<
				typeof import("common-utils/validation")
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
				"common-utils/validation"
			);
			const registry =
				module.validationRegistry as import("common-utils/validation").CompiledValidationRegistry;
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
		case "dumdict.parse-record": {
			const result = published<typeof import("dumdict")>(
				module,
				"parseAsLemmaRecord",
			).parseAsLemmaRecord({ lemma }, "de");
			assert.deepEqual(result, { lemma });
			break;
		}
		case "dumdict.pending-identity": {
			const { language, family, kind, canonicalForm } = reading.lemma;
			assert.equal(
				published<typeof import("dumdict/pending")>(
					module,
					"createPendingSemanticRelationRecord",
					"derivePendingEntryId",
				).derivePendingEntryId({
					language,
					family,
					kind,
					canonicalForm,
				}),
				"pending-entry:v2:de:Lexeme:NOUN:bank",
			);
			break;
		}
		case "dumdict.plan-reading-entry": {
			const planner = published<typeof import("dumdict/planning")>(
				module,
				"createDumdictPlanner",
			).createDumdictPlanner("de");
			const planned = planner.ensureReadingEntry(
				{
					intent: "ensureReadingEntry",
					revision: "rss-0",
					pendingRelationsMatchingProposedLemma: [],
					relationLemmas: [],
					relationReadings: [],
				},
				{
					entry: {
						reading,
						attestedTranslations: [],
						attestationLinks: [],
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
		case "dumdict.project-lemma-tables": {
			const view = published<typeof import("dumdict/inflection")>(
				module,
				"projectLemmaTables",
			).projectLemmaTables(
				{
					language: "de",
					version: "rss",
					schemaFor: () => ({
						id: "rss/NOUN",
						version: 1,
						keyFeatures: ["case", "number"],
						panels: [
							{
								id: "declension",
								core: true,
								fixed: {},
								rows: [{ bundle: { case: "Nom" } }],
								columns: [{ bundle: { number: "Plur" } }],
							},
						],
					}),
					derive: () => ({}),
					formOfSurface: (surface) => surface.normalizedSurface,
					codec: { key: (form) => form },
					display: (form) => [{ text: form, role: "Form" }],
					labels: { panel: String, axis: String, bundle: String },
				},
				{
					lemmaRecord: { lemma },
					readingEntries: [{ reading, attestationLinks: [] }],
					ownedSurfaceEntries: [],
				},
			);
			assert.deepEqual(
				view.groups.map(
					(group) => group.panels[0]?.cells[0]?.[0]?.status,
				),
				["Unknown"],
			);
			break;
		}
		default:
			throw new Error(`Unknown representative operation: ${id}`);
	}
}
