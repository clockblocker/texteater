type DeMemberOrthography = "Standard" | "Typo";
type GrammaticalResolutionInput = {
	readonly markedContext: string;
	readonly members: readonly string[];
};
class DeGrammaticalResolutionProjectionError extends Error {}
export type GrammarOutput = {
	lemma: Record<string, unknown>;
	surface: Record<string, unknown>;
	memberOrthographies: DeMemberOrthography[];
	normalizedMembers: string[];
	realizationCoverage: "Full" | "Partial";
};
export function normalizeGrammarSurface(
	input: GrammaticalResolutionInput,
	output: GrammarOutput,
	route: { family: string; kind: string },
): string {
	return route.family === "Lexeme" && route.kind === "NOUN"
		? constructNounNormalizedSurface({
				input,
				memberOrthographies: output.memberOrthographies,
				normalizedMembers: output.normalizedMembers,
				surfaceKind: output.surface.inflectionalFeatures
					? "Inflection"
					: "Citation",
			})
		: constructNormalizedSurface({
				attestedMembers: input.members,
				memberOrthographies: output.memberOrthographies,
				normalizedMembers: output.normalizedMembers,
			});
}
function constructNormalizedSurface(args: {
	readonly attestedMembers: readonly string[];
	readonly memberOrthographies: readonly DeMemberOrthography[];
	readonly normalizedMembers: readonly string[];
}): string {
	const { attestedMembers, memberOrthographies, normalizedMembers } = args;
	assertAlignedMembers(args);

	for (let position = 0; position < attestedMembers.length; position += 1) {
		const attested = attestedMembers[position];
		const normalized = normalizedMembers[position];
		const orthography = memberOrthographies[position];
		if (
			attested === undefined ||
			normalized === undefined ||
			orthography === undefined
		) {
			throw invalidMemberAlignment();
		}
		assertCanonicalNormalizedMember(normalized, position);
		if (!isLicensedNormalization(attested, normalized, orthography)) {
			throw new DeGrammaticalResolutionProjectionError(
				`Normalized member ${position} is not a positional normalization of its attested member.`,
			);
		}
	}

	return normalizedMembers.join(" ");
}

const trailingErgaenzungsstrich = /[-‐‑]$/u;
const rightConjunctPattern =
	/<\/TARGET>\s+(?:und|oder)\s+([\p{L}\p{N}]+(?:[-‐‑'][\p{L}\p{N}]+)*)/u;
const precedingSuspendedConjunctPattern =
	/[\p{L}\p{N}]+[-‐‑]\s*(?:,\s*|(?:und|oder|sowie)\s+)$/u;

function constructNounNormalizedSurface(args: {
	readonly input: GrammaticalResolutionInput;
	readonly memberOrthographies: readonly DeMemberOrthography[];
	readonly normalizedMembers: readonly string[];
	readonly surfaceKind: "Citation" | "Inflection";
}): string {
	const { input, memberOrthographies, normalizedMembers, surfaceKind } = args;
	assertAlignedMembers({
		attestedMembers: input.members,
		memberOrthographies,
		normalizedMembers,
	});
	for (const [position, normalized] of normalizedMembers.entries()) {
		assertCanonicalNormalizedMember(normalized, position);
	}

	const member = input.members[0];
	const normalized = normalizedMembers[0];
	if (
		input.members.length !== 1 ||
		member === undefined ||
		normalized === undefined ||
		!trailingErgaenzungsstrich.test(member)
	) {
		return constructNormalizedSurface({
			attestedMembers: input.members,
			memberOrthographies,
			normalizedMembers,
		});
	}
	if (surfaceKind !== "Inflection") throw invalidNounSuspension();

	const match = rightConjunctPattern.exec(input.markedContext);
	const rightConjunct = match?.[1];
	if (match === null || rightConjunct === undefined) {
		throw invalidNounSuspension();
	}
	const targetStart = input.markedContext.indexOf("<TARGET>");
	if (
		targetStart < 0 ||
		precedingSuspendedConjunctPattern.test(
			input.markedContext.slice(0, targetStart),
		)
	) {
		throw invalidNounSuspension();
	}
	const followingContext = input.markedContext.slice(
		match.index + match[0].length,
	);
	if (/^\s*(?:,\s*)?(?:und\b|oder\b|sowie\b)/u.test(followingContext)) {
		throw invalidNounSuspension();
	}

	const attestedPrefix = member.slice(0, -1);
	if (attestedPrefix.length === 0) throw invalidNounSuspension();
	const normalizedRepresentation = foldGerman(normalized);
	const rightConjunctRepresentation = foldGerman(rightConjunct);
	const orthography = memberOrthographies[0];
	let sharedSuffixRepresentation: string;
	if (orthography === "Standard") {
		const attestedPrefixRepresentation = foldGerman(attestedPrefix);
		if (
			!normalizedRepresentation.startsWith(attestedPrefixRepresentation)
		) {
			throw invalidNounSuspension();
		}
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
	) {
		throw invalidNounSuspension();
	}
	return normalized;
}

function assertAlignedMembers(args: {
	readonly attestedMembers: readonly string[];
	readonly memberOrthographies: readonly DeMemberOrthography[];
	readonly normalizedMembers: readonly string[];
}): void {
	if (
		args.attestedMembers.length === 0 ||
		args.normalizedMembers.length !== args.attestedMembers.length ||
		args.memberOrthographies.length !== args.attestedMembers.length
	) {
		throw invalidMemberAlignment();
	}
}

function assertCanonicalNormalizedMember(
	normalized: string,
	position: number,
): void {
	if (normalized.length === 0 || /\s/u.test(normalized)) {
		throw new DeGrammaticalResolutionProjectionError(
			`Normalized member ${position} contains whitespace.`,
		);
	}
}

function isLicensedNormalization(
	attested: string,
	normalized: string,
	orthography: DeMemberOrthography,
): boolean {
	if (
		attested === normalized ||
		foldGerman(attested) === foldGerman(normalized)
	) {
		return true;
	}
	// Typo repair is a linguistic judgment made by the route prompt. Do not add
	// an edit-distance policy here.
	return orthography === "Typo";
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

function invalidMemberAlignment(): DeGrammaticalResolutionProjectionError {
	return new DeGrammaticalResolutionProjectionError(
		"Attested, normalized, and orthography members must align one-to-one.",
	);
}

function invalidNounSuspension(): DeGrammaticalResolutionProjectionError {
	return new DeGrammaticalResolutionProjectionError(
		"NOUN suspended completion requires one trailing Divis member, binary und/oder coordination, and a literal shared suffix from one full right compound.",
	);
}
