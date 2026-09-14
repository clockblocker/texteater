import { isDeepStrictEqual } from "node:util";
import { join } from "node:path";
import {
	type Constraint,
	ParsingError,
	parseValidationArtifact,
	type ValidationArtifact,
	type ValidationOperations,
} from "../../common-utils/src/index";

/** Exercises optimization traps beyond the generated route fixtures. */
export async function adversarialGate(root: string) {
	const referenceModule = await import(
		join(
			root,
			"battery/common-utils/src/__experiment_reference_validation.ts",
		)
	);
	const reference: typeof parseValidationArtifact =
		referenceModule.parseValidationArtifact;
	const operations: ValidationOperations = {
		"to-b": () => ({ value: { tag: "b", payload: " normalized " } }),
		trim: (value) => ({
			value: typeof value === "string" ? value.trim() : value,
		}),
		reject: (value) => ({
			value,
			issues: [
				{ code: "custom", path: [], message: "Rejected by refinement" },
			],
		}),
	};
	const object = (tag: string, payload = false): Constraint => [
		"object",
		{
			tag: ["literal", tag],
			...(payload
				? {
						payload: [
							"pipe",
							["string"],
							[["operation", "trim"]],
						] as Constraint,
					}
				: {}),
		},
		"strip",
	];
	const cases: {
		name: string;
		artifact: ValidationArtifact;
		inputs: unknown[];
	}[] = [
		{
			name: "ordered-overlap-and-stripping",
			artifact: {
				version: 1,
				root: ["union", [object("b"), object("b", true)]],
			},
			inputs: [{ tag: "b", payload: "x" }, { tag: "a" }, null],
		},
		{
			name: "preprocess-before-literal-candidate",
			artifact: {
				version: 1,
				root: [
					"union",
					[["preprocess", "to-b", object("b", true)], object("a")],
				],
			},
			inputs: [{ tag: "a" }, {}, null],
		},
		{
			name: "refinement-failure-falls-through",
			artifact: {
				version: 1,
				root: [
					"union",
					[
						["pipe", object("b"), [["operation", "reject"]]],
						object("b", true),
					],
				],
			},
			inputs: [
				{ tag: "b", payload: " x " },
				{ tag: "b", payload: 2 },
				{ tag: "c" },
			],
		},
		{
			name: "nested-ref-and-exact-errors",
			artifact: {
				version: 1,
				root: [
					"union",
					[
						["ref", "a"],
						["ref", "b"],
					],
				],
				definitions: {
					a: ["object", { nested: object("a", true) }, "strict"],
					b: ["object", { nested: object("b", true) }, "strict"],
				},
			},
			inputs: [
				{ nested: { tag: "b", payload: " x " } },
				{ nested: { tag: "b", payload: null } },
				{ nested: { tag: "unknown" }, extra: true },
				{},
			],
		},
		{
			name: "accessor-and-inherited-fields",
			artifact: {
				version: 1,
				root: ["union", [object("a"), object("b", true)]],
			},
			inputs: [
				Object.create({ tag: "b", payload: " x " }),
				{
					get tag() {
						return "b";
					},
					payload: " x ",
				},
			],
		},
	];
	const normalize = (value: unknown) =>
		value instanceof ParsingError
			? { failure: true, name: value.name, issues: value.issues }
			: { failure: false, value };
	const failures: string[] = [];
	let comparisons = 0;
	for (const entry of cases)
		for (const [index, input] of entry.inputs.entries()) {
			const expected = normalize(
				reference(entry.artifact, input, operations),
			);
			const actual = normalize(
				parseValidationArtifact(entry.artifact, input, operations),
			);
			comparisons++;
			if (!isDeepStrictEqual(actual, expected))
				failures.push(`${entry.name}:${index}`);
		}
	// A cache keyed only by artifact identity must not silently change branch
	// precedence after a caller changes an artifact. This robustness probe is
	// reported separately because the exported TypeScript artifacts are readonly.
	const firstLiteral: ["literal", string] = ["literal", "a"];
	const artifact: ValidationArtifact = {
		version: 1,
		definitions: {},
		root: [
			"union",
			[["object", { tag: firstLiteral }, "strip"], object("b", true)],
		],
	};
	const input = { tag: "b", payload: " x " };
	parseValidationArtifact(artifact, input, operations);
	firstLiteral[1] = "b";
	const mutationSafe = isDeepStrictEqual(
		normalize(parseValidationArtifact(artifact, input, operations)),
		normalize(reference(artifact, input, operations)),
	);
	return {
		comparisons,
		failures,
		mutableArtifactStress: mutationSafe
			? "pass"
			: "requires-an-immutable-artifact-contract",
	};
}
