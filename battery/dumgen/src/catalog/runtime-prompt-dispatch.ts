import { encodedDumgenValidationArtifacts } from "../generated/validation-artifacts.js";
import { assertIntakeBatch, freezeIntakeBatch } from "../intake/contracts.js";

type Dispatch =
	| ((input: unknown) => unknown)
	| ((input: unknown, output: unknown) => unknown)
	| Readonly<{ assert(input: unknown, output: unknown): void }>;

export function runtimePromptDispatch(
	id: string,
	path: string,
	outputJsonSchema: () => unknown,
): Dispatch {
	if (id === "laboratory.intake:output-postcondition")
		return Object.freeze({ assert: assertIntakeBatch as never });
	if (id === "laboratory.intake:project-output")
		return (_input, output) => freezeIntakeBatch(output as never);
	if (
		id ===
		"laboratory.targetClassification.de.highLevelWholeUnit:project-input"
	)
		return projectClassificationInput;
	if (
		id ===
		"laboratory.targetClassification.de.highLevelWholeUnit:output-postcondition"
	)
		return Object.freeze({
			assert(input: unknown, output: unknown): void {
				canonicalizeClassification(input, output);
			},
		});
	if (
		id ===
		"laboratory.targetClassification.de.highLevelWholeUnit:project-output"
	)
		return canonicalizeClassification;
	if (id === "laboratory.unitShadowClassification:output-postcondition")
		return Object.freeze({ assert: assertSupportedClassification });
	if (
		id.startsWith("laboratory.grammaticalResolution.de.") &&
		id.endsWith(":project-input")
	)
		return (input: unknown) => input;
	if (
		id.startsWith("laboratory.grammaticalResolution.de.") &&
		id.endsWith(":project-output")
	)
		return (input, output) =>
			projectGrammaticalResolution(
				path,
				input,
				output,
				outputJsonSchema(),
			);
	throw new ReferenceError(`Unknown runtime prompt dispatch: ${id}.`);
}

function projectClassificationInput(raw: unknown): unknown {
	const input = raw as {
		clickedSegmentIndex: number;
		segments: readonly { kind: string; text: string }[];
	};
	const compactToOriginal: number[] = [];
	const originalToCompact = new Map<number, number>();
	const segments: Array<{ i: number; s: string }> = [];
	const markedSentence = input.segments
		.map((segment, originalIndex) => {
			if (segment.kind !== "Whitespace") {
				const compactIndex = compactToOriginal.length;
				compactToOriginal.push(originalIndex);
				originalToCompact.set(originalIndex, compactIndex);
				if (segment.kind === "ResolvableText")
					segments.push({ i: compactIndex, s: segment.text });
			}
			const escaped = segment.text
				.replaceAll("&", "&amp;")
				.replaceAll("<", "&lt;")
				.replaceAll(">", "&gt;");
			return originalIndex === input.clickedSegmentIndex
				? `<target>${escaped}</target>`
				: escaped;
		})
		.join("");
	const clickedIndex = originalToCompact.get(input.clickedSegmentIndex);
	if (clickedIndex === undefined)
		throw new Error(
			"The clicked canonical segment is not a ResolvableText candidate.",
		);
	return { clickedIndex, markedSentence, segments };
}

function canonicalizeClassification(
	rawInput: unknown,
	rawOutput: unknown,
): unknown {
	const input = rawInput as {
		clickedSegmentIndex: number;
		segments: readonly { kind: string; text: string }[];
	};
	const output = rawOutput as {
		additionalMemberIndices: readonly number[] | null;
		decision: "Resolved" | "Unresolved";
		target: { family: string; kind: string } | null;
	};
	if (output.decision === "Unresolved") return { decision: "Unresolved" };
	if (output.target === null || output.additionalMemberIndices === null)
		throw new Error("Resolved classification requires target membership.");
	const projected = projectClassificationInput(input) as {
		clickedIndex: number;
		segments: readonly { i: number }[];
	};
	let previous = -1;
	for (const index of output.additionalMemberIndices) {
		if (!Number.isSafeInteger(index) || index <= previous)
			throw new Error(
				"Additional membership must be ordered and unique before click insertion.",
			);
		previous = index;
	}
	if (output.additionalMemberIndices.includes(projected.clickedIndex))
		throw new Error(
			"Additional membership must exclude the clicked index.",
		);
	const compactToOriginal = input.segments.flatMap((segment, index) =>
		segment.kind === "Whitespace" ? [] : [index],
	);
	const memberSegmentIndices = [
		projected.clickedIndex,
		...output.additionalMemberIndices,
	]
		.toSorted((left, right) => left - right)
		.map((compactIndex) => {
			const original = compactToOriginal[compactIndex];
			if (
				original === undefined ||
				input.segments[original]?.kind !== "ResolvableText"
			)
				throw new Error("Membership must reference ResolvableText.");
			return original;
		});
	return { ...output.target, memberSegmentIndices };
}

function projectGrammaticalResolution(
	path: string,
	rawInput: unknown,
	rawOutput: unknown,
	outputJsonSchema: unknown,
): unknown {
	const input = rawInput as {
		members: readonly string[];
		markedContext: string;
	};
	const output = rawOutput as {
		lemma: Readonly<Record<string, unknown>>;
		memberOrthographies: readonly ("Standard" | "Typo")[];
		normalizedMembers: readonly string[];
		realizationCoverage?: "Full" | "Partial";
		surface: Readonly<Record<string, unknown>> & {
			surfaceFeatures?: unknown;
			surfaceKind?: "Citation" | "Inflection";
		};
	};
	const route = path.split(".grammaticalResolution.de.")[1]?.split(".");
	const family = route?.[0];
	const kind = route?.[1];
	if (family === undefined || kind === undefined)
		throw new ReferenceError(`Invalid grammatical prompt path: ${path}.`);
	const lemma = {
		...output.lemma,
		coreFeatures: {
			...(isRecord(output.lemma.coreFeatures)
				? output.lemma.coreFeatures
				: {}),
			...(family === "Lexeme" && kind === "VERB"
				? { verbType: null }
				: {}),
		},
		family,
		kind,
		language: "de",
	};
	const hasInflection = JSON.stringify(outputJsonSchema).includes(
		'"surfaceKind":{"type":"string","const":"Inflection"}',
	);
	const surfaceKind =
		output.surface.surfaceKind ?? (hasInflection ? undefined : "Citation");
	if (surfaceKind === undefined)
		throw new Error(
			`${family}/${kind} must discriminate Citation and Inflection Surfaces.`,
		);
	const normalizedSurface =
		family === "Lexeme" && kind === "NOUN"
			? projectNounNormalizedSurface({
					input,
					memberOrthographies: output.memberOrthographies,
					normalizedMembers: output.normalizedMembers,
					surfaceKind,
				})
			: constructNormalizedSurface(
					input.members,
					output.normalizedMembers,
					output.memberOrthographies,
				);
	const surface = {
		...normalizeSurfaceFeatures(output.surface),
		language: "de",
		lemma,
		normalizedSurface,
		surfaceKind,
	};
	return {
		memberOrthographies: output.memberOrthographies,
		normalizedMembers: output.normalizedMembers,
		realizationCoverage:
			family === "Phraseme"
				? requirePhrasemeCoverage(output.realizationCoverage)
				: "Full",
		surface,
	};
}

function constructNormalizedSurface(
	attested: readonly string[],
	normalized: readonly string[],
	orthographies: readonly ("Standard" | "Typo")[],
): string {
	if (
		attested.length === 0 ||
		normalized.length !== attested.length ||
		orthographies.length !== attested.length
	)
		throw new Error(
			"Attested, normalized, and orthography members must align one-to-one.",
		);
	for (let index = 0; index < attested.length; index += 1) {
		const source = attested[index];
		const target = normalized[index];
		const orthography = orthographies[index];
		if (source === undefined || target === undefined || /\s/u.test(target))
			throw new Error(`Normalized member ${index} contains whitespace.`);
		if (
			orthography !== "Typo" &&
			source.normalize("NFC").toLocaleLowerCase("de") !==
				target.normalize("NFC").toLocaleLowerCase("de")
		)
			throw new Error(
				`Normalized member ${index} is not a positional normalization of its attested member.`,
			);
	}
	return normalized.join(" ");
}

const trailingErgaenzungsstrich = /[-‐‑]$/u;
const rightConjunctPattern =
	/<\/TARGET>\s+(?:und|oder)\s+([\p{L}\p{N}]+(?:[-‐‑'][\p{L}\p{N}]+)*)/u;
const precedingSuspendedConjunctPattern =
	/[\p{L}\p{N}]+[-‐‑]\s*(?:,\s*|(?:und|oder|sowie)\s+)$/u;

function projectNounNormalizedSurface(args: {
	readonly input: {
		readonly markedContext: string;
		readonly members: readonly string[];
	};
	readonly memberOrthographies: readonly ("Standard" | "Typo")[];
	readonly normalizedMembers: readonly string[];
	readonly surfaceKind: "Citation" | "Inflection";
}): string {
	const member = args.input.members[0];
	const normalized = args.normalizedMembers[0];
	if (
		args.input.members.length !== 1 ||
		member === undefined ||
		normalized === undefined ||
		!trailingErgaenzungsstrich.test(member)
	)
		return constructNormalizedSurface(
			args.input.members,
			args.normalizedMembers,
			args.memberOrthographies,
		);
	if (
		args.memberOrthographies.length !== 1 ||
		args.normalizedMembers.length !== 1 ||
		args.surfaceKind !== "Inflection"
	)
		throw invalidNounSuspension();
	const match = rightConjunctPattern.exec(args.input.markedContext);
	const rightConjunct = match?.[1];
	if (match === null || rightConjunct === undefined)
		throw invalidNounSuspension();
	const targetStart = args.input.markedContext.indexOf("<TARGET>");
	if (
		targetStart < 0 ||
		precedingSuspendedConjunctPattern.test(
			args.input.markedContext.slice(0, targetStart),
		)
	)
		throw invalidNounSuspension();
	const followingContext = args.input.markedContext.slice(
		match.index + match[0].length,
	);
	if (/^\s*(?:,\s*)?(?:und\b|oder\b|sowie\b)/u.test(followingContext))
		throw invalidNounSuspension();

	const attestedPrefix = member.slice(0, -1);
	if (attestedPrefix.length === 0) throw invalidNounSuspension();
	const normalizedRepresentation = foldGerman(normalized);
	const rightConjunctRepresentation = foldGerman(rightConjunct);
	const orthography = args.memberOrthographies[0];
	let sharedSuffixRepresentation: string;
	if (orthography === "Standard") {
		const attestedPrefixRepresentation = foldGerman(attestedPrefix);
		if (!normalizedRepresentation.startsWith(attestedPrefixRepresentation))
			throw invalidNounSuspension();
		sharedSuffixRepresentation = normalizedRepresentation.slice(
			attestedPrefixRepresentation.length,
		);
	} else if (orthography === "Typo") {
		sharedSuffixRepresentation = longestCommonSuffix(
			normalizedRepresentation,
			rightConjunctRepresentation,
		);
	} else {
		throw invalidNounSuspension();
	}
	if (
		sharedSuffixRepresentation.length === 0 ||
		!rightConjunctRepresentation.endsWith(sharedSuffixRepresentation) ||
		rightConjunctRepresentation.length ===
			sharedSuffixRepresentation.length ||
		normalizedRepresentation.length === sharedSuffixRepresentation.length
	)
		throw invalidNounSuspension();
	return normalized;
}

function longestCommonSuffix(left: string, right: string): string {
	let leftIndex = left.length;
	let rightIndex = right.length;
	while (
		leftIndex > 0 &&
		rightIndex > 0 &&
		left[leftIndex - 1] === right[rightIndex - 1]
	) {
		leftIndex -= 1;
		rightIndex -= 1;
	}
	return left.slice(leftIndex);
}

function foldGerman(value: string): string {
	return value.normalize("NFC").toLocaleLowerCase("de");
}

function invalidNounSuspension(): Error {
	return new Error(
		"NOUN suspended completion requires one trailing Divis member, binary und/oder coordination, and a literal shared suffix from one full right compound.",
	);
}

function normalizeSurfaceFeatures(
	surface: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
	const features = surface.surfaceFeatures;
	return isRecord(features) && features.historicalStatus === null
		? { ...surface, surfaceFeatures: null }
		: surface;
}

function requirePhrasemeCoverage(
	value: "Full" | "Partial" | undefined,
): "Full" | "Partial" {
	if (value === "Full" || value === "Partial") return value;
	throw new Error(
		"Phraseme Grammatical Resolution must return realizationCoverage.",
	);
}

function assertSupportedClassification(
	rawInput: unknown,
	rawOutput: unknown,
): void {
	const input = rawInput as { language: string };
	const output = rawOutput as {
		decision: string;
		target: { family: string; kind: string } | null;
	};
	if (output.decision === "Unresolved") return;
	if (output.target === null)
		throw new Error("Resolved Unit Shadow classification has no target.");
	const route = `${input.language}/${output.target.family}/${output.target.kind}`;
	if (
		!encodedDumgenValidationArtifacts.supportedUnitShadowRoutes
			.split("\n")
			.includes(route)
	)
		throw new Error(`${route} is not a supported Dumling Lemma route.`);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
