import { expect, test } from "bun:test";
import { checkIfGrundform, parseUnit } from "dumling";
import { Effect } from "effect";
import { authoredMembers } from "../src/concrete-lang/de/authored-closed-sets/inventory.js";
import { member as subjectEs } from "../src/concrete-lang/de/authored-closed-sets/members/lexeme/pronoun/personal/es-subject-expletive.js";
import cases from "../src/concrete-lang/de/grammatical-resolution/lexeme/verb/corpus.json";
import targetCases from "../src/concrete-lang/de/target-classification/source-data.json";
import {
	createDumgen,
	deriveGrammaticalComponent,
	validateEncounter,
} from "../src/index.js";
import { grammarFixture } from "./grammar-fixture.js";

for (const name of [
	"demo-exists",
	"demo-weather",
	"subject-question",
	"subject-past",
	"subject-subordinate",
	"subject-weather",
	"subject-governed",
	"subject-reflexive",
	"referential-es",
	"positional-es",
	"anticipatory-es",
	"object-es",
]) {
	test(`public grammar and component derivation: ${name}`, async () => {
		const fixture = cases[`grammar-de-verb-${name}` as keyof typeof cases];
		const source = Object.entries(targetCases.cases).find(
			([id, value]) =>
				id.startsWith(`target-de-${name}-`) &&
				"kind" in value.idealOutput &&
				value.idealOutput.kind === "VERB",
		)?.[1];
		if (!source) throw Error("Missing target fixture");
		const encounter = validateEncounter({
			sentence: {
				id: name,
				language: "de",
				segments: source.input.segments,
			},
			target: source.idealOutput,
		});
		const result = await Effect.runPromise(
			createDumgen(grammarFixture(fixture.idealOutput)).resolveGrammar(
				encounter,
			),
		);
		expect(result.surface.lemma.canonicalForm).toBe(
			fixture.idealOutput.lemma.canonicalForm,
		);
		expect(result.members.map((member) => member.attested)).toEqual(
			fixture.input.members,
		);
		expect(result.surface.normalizedSurface).toBe(
			fixture.idealOutput.normalizedMembers.join(" "),
		);
		expect(result).toHaveProperty(
			"expletiveEvidence",
			fixture.idealOutput.expletiveEvidence,
		);
		expect(result.surface).not.toHaveProperty("expletiveReference");
		const component = deriveGrammaticalComponent(result.surface);
		if (fixture.idealOutput.expletiveEvidence) {
			expect(component?.reading).toEqual(subjectEs.reading);
			expect(component?.surface).toMatchObject({
				normalizedSurface: "es",
				lemma: {
					kind: "PRON",
					canonicalForm: "es",
					coreFeatures: { case: "Nom" },
				},
			});
			expect(
				parseUnit({ ...result, expletiveEvidence: null }).success,
			).toBe(false);
			expect(
				parseUnit({ ...result, realizationCoverage: "Partial" })
					.success,
			).toBe(false);
			expect(checkIfGrundform(result.surface)).toEqual({
				success: true,
				value: false,
			});
		} else expect(component).toBeNull();
	});
}

test("missing exact reviewed subject es is CatalogMiss, never referential substitution", async () => {
	const fixture = cases["grammar-de-verb-demo-exists"];
	const encounter = validateEncounter({
		sentence: {
			id: "missing",
			language: "de",
			segments: [
				{ kind: "ResolvableText", text: "Es" },
				{ kind: "ResolvableText", text: "gibt" },
			],
		},
		target: {
			family: "Lexeme",
			kind: "VERB",
			memberSegmentIndices: [0, 1],
		},
	});
	const result = await Effect.runPromise(
		createDumgen(grammarFixture(fixture.idealOutput)).resolveGrammar(
			encounter,
		),
	);
	const index = authoredMembers.indexOf(subjectEs);
	const mutable = authoredMembers as (typeof subjectEs)[];
	mutable.splice(index, 1);
	try {
		expect(() => deriveGrammaticalComponent(result.surface)).toThrow(
			"Missing reviewed nonreferential subject es",
		);
	} finally {
		mutable.splice(index, 0, subjectEs);
	}
});
