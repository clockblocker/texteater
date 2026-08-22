import { describe, expect, test } from "bun:test";
import * as dumrel from "../../battery/dumrel/src";
import { DUM_PARSER_INTERFACE_CONTRACT } from "../dum-parser-interface-contract";
import type { DumrelParserInterface } from "../dumrel-parser-interface";

const contract = DUM_PARSER_INTERFACE_CONTRACT;
const dumrelPackageRoot: DumrelParserInterface = dumrel;
void dumrelPackageRoot;

describe("frozen public dum parser interface", () => {
	test("uses one package-root error-returning convention", () => {
		expect(contract).toMatchObject({
			contractVersion: 1,
			inputParameter: "input: unknown",
			result: "Success | ParsingError<Success>",
			sharedErrorExport: "ParsingError",
			ordinaryValidationFailureThrows: false,
			exportLocation: "package-root",
			parserSubpath: null,
		});
	});

	test("freezes the four Dumling names and exact route-coordinate order", () => {
		expect(contract.packages.dumling).toEqual({
			parseAsLemma: ["input", "language", "family", "kind"],
			parseAsSurface: [
				"input",
				"language",
				"surfaceKind",
				"family",
				"kind",
			],
			parseAsAttestation: [
				"input",
				"language",
				"surfaceKind",
				"family",
				"kind",
			],
			parseAsReading: ["input", "language", "family", "kind"],
		});
	});

	test("never introduces a Dumling Unit alias or parser", () => {
		const dumlingSurface = JSON.stringify(contract.packages.dumling);
		expect(dumlingSurface).not.toContain("Unit");
		expect(dumlingSurface).toContain("Lemma");
	});

	test("keeps Dumrel package-root parsers synchronized with its standalone type contract", () => {
		const actualParserNames = Object.keys(dumrel)
			.filter((name) => name.startsWith("parseAs"))
			.toSorted();
		expect(actualParserNames).toEqual(
			Object.keys(contract.packages.dumrel).toSorted(),
		);
		expect(dumrel.ParsingError).toBeDefined();
	});

	test("keeps every parser name unique inside its package", () => {
		for (const parserMap of Object.values(contract.packages)) {
			const names = Object.keys(parserMap);
			expect(new Set(names).size).toBe(names.length);
			for (const parameters of Object.values(parserMap)) {
				expect(parameters[0]).toBe("input");
				expect(new Set(parameters).size).toBe(parameters.length);
			}
		}
	});

	test("uses a language coordinate exactly where another package narrows a language-owned DTO", () => {
		for (const [name, parameters] of Object.entries(
			contract.packages.dumdict,
		)) {
			expect((parameters as readonly string[]).includes("language")).toBe(
				name !== "parseAsCommitChangesResult",
			);
		}

		const narrowedDumgen = new Set([
			"parseAsKnowledgeGenerationInput",
			"parseAsSegmentedSentence",
			"parseAsGrammaticalRoute",
			"parseAsGrammaticalInput",
			"parseAsGrammaticalResult",
		]);
		for (const [name, parameters] of Object.entries(
			contract.packages.dumgen,
		)) {
			expect((parameters as readonly string[]).includes("language")).toBe(
				narrowedDumgen.has(name),
			);
		}
	});
});
