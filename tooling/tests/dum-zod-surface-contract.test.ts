import { expect, test } from "bun:test";
import { operationalEntrypoints } from "../dum-entrypoint-rss/inventory";

const DUM_PUBLIC_ZOD_SURFACES = {
	"dumrel/schema": [
		"conjugationClassSchema",
		"conjugationClassesSchema",
		"directSemanticRelationSchema",
		"englishValencyComplementSchema",
		"formulaRoleSchema",
		"germanValencyComplementSchema",
		"governedCaseSchema",
		"governmentProjectionSchema",
		"governmentRelationSchema",
		"hebrewValencyComplementSchema",
		"knowledgeChangeSchema",
		"knowledgeRequestMaskSchema",
		"knowledgeRouteSchema",
		"knowledgeSelectionInputSchema",
		"knowledgeSettingsSchema",
		"lexemeUnitShadowSchema",
		"locutionTypeSchema",
		"morphologicalTreeNodeSchema",
		"morphologicalTreeSchema",
		"nounPluralSchema",
		"participleMeaningSchema",
		"participleProjectionSchema",
		"participleRelationSchema",
		"participleSourceSchema",
		"pendingSemanticRelationSchema",
		"pluralPatternSchema",
		"readingKnowledgeSchema",
		"readingWithKnowledgeSchema",
		"sayingTypeSchema",
		"semanticProjectionInputSchema",
		"semanticRelationProjectionSchema",
		"semanticRelationSchema",
		"semanticRelationsSchema",
		"translationLanguageSchema",
		"unitShadowSchema",
		"valencyComplementSchema",
		"valencyFrameSchema",
		"valencyReferentSchema",
		"valencySlotSchema",
		"valencySlotStatusSchema",
	],
	"dumdict/schema": [
		"changePreconditionSchema",
		"commitChangesRequestSchema",
		"commitChangesResultSchema",
		"commitConflictCodeSchema",
		"dumdictPlanSchema",
		"lemmaRecordSchema",
		"pendingSemanticRelationLocatorSchema",
		"pendingSemanticRelationRecordSchema",
		"plannedChangeOpSchema",
		"readingEntrySchema",
		"readingPatchOpSchema",
		"surfaceEntrySchema",
	],
} as const;

function looksLikeSchemaExport(name: string): boolean {
	return (
		name.endsWith("Schema") ||
		name.endsWith("Schemas") ||
		name === "abstractSchemas" ||
		name.includes("SchemaTree") ||
		name.includes("SchemasFor")
	);
}

test("normal Zod surfaces expose only the frozen broad composition primitives", async () => {
	for (const [specifier, expectedExports] of Object.entries(
		DUM_PUBLIC_ZOD_SURFACES,
	)) {
		expect(Object.keys(await import(specifier)).sort()).toEqual(
			[...expectedExports].sort(),
		);
	}
});

test("concrete Dumling schema routes expose exact composable units", async () => {
	const { loadRoutes } = await import("../../battery/dumling/codegen/routes");
	for (const route of await loadRoutes()) {
		const schema = await import(
			`dumling/schema/${route.modulePath.replace(/\.js$/, "")}`
		);
		expect(Object.keys(schema).sort()).toEqual([
			"attestationSchema",
			"lemmaSchema",
			"readingSchema",
			"surfaceSchema",
		]);
		expect(schema.lemmaSchema.shape.language.value).toBe(route.language);
	}
});

test("operational surfaces do not advertise Zod schemas", async () => {
	for (const { specifier } of operationalEntrypoints()) {
		const schemaExports = Object.keys(await import(specifier)).filter(
			looksLikeSchemaExport,
		);
		expect(schemaExports, specifier).toEqual([]);
	}
});
