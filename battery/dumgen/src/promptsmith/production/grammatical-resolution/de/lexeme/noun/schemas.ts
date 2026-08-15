import { z } from "zod";
import {
	deNounModelCitationSurfaceSchema,
	deNounModelInflectionSurfaceSchema,
	deNounModelLemmaSchema,
} from "../../../../../../schema/de-noun-codecs";
import {
	constructNormalizedSurface,
	extractMarkedContextMembers,
	NormalizedSurfaceProjectionError,
} from "../../../../../../schema/normalized-surface-projection";
import {
	normalizedMembersSchema,
	type PromptInputSchema,
	type PromptOutputSchema,
} from "../../../../../assembly";

export const inputSchema = z
	.strictObject({
		markedContext: z.string().min(1),
		members: z.array(z.string().min(1)).min(1),
	})
	.superRefine((value, context) => {
		let markedMembers: readonly string[];
		try {
			markedMembers = extractMarkedContextMembers(value.markedContext);
		} catch (cause) {
			context.addIssue({
				code: "custom",
				path: ["markedContext"],
				message:
					cause instanceof Error
						? cause.message
						: "markedContext is invalid.",
			});
			return;
		}
		if (
			markedMembers.length !== value.members.length ||
			markedMembers.some(
				(member, position) => member !== value.members[position],
			)
		) {
			context.addIssue({
				code: "custom",
				path: ["members"],
				message:
					"members must exactly match TARGET contents in source order.",
			});
		}
	}) satisfies PromptInputSchema;

export const outputSchema = z.strictObject({
	memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(1),
	normalizedMembers: normalizedMembersSchema,
	surface: z.union([
		deNounModelCitationSurfaceSchema.omit({ normalizedSurface: true }),
		deNounModelInflectionSurfaceSchema.omit({ normalizedSurface: true }),
	]),
	lemma: deNounModelLemmaSchema,
}) satisfies PromptOutputSchema;

type NounProjectionArgs = {
	readonly input: {
		readonly markedContext: string;
		readonly members: readonly string[];
	};
	readonly memberOrthographies: readonly ("Standard" | "Typo")[];
	readonly normalizedMembers: readonly string[];
	readonly lemma: unknown;
	readonly surface: { readonly surfaceKind: string };
};

const trailingErgaenzungsstrich = /[-‐‑]$/u;
const rightConjunctPattern =
	/<\/TARGET>\s+(?:und|oder)\s+([\p{L}\p{N}]+(?:[-‐‑'][\p{L}\p{N}]+)*)/u;
const precedingSuspendedConjunctPattern =
	/[\p{L}\p{N}]+[-‐‑]\s*(?:,\s*|(?:und|oder|sowie)\s+)$/u;

/** Applies the narrow trailing Ergänzungsstrich contract decided in #93. */
export function projectNounNormalizedSurface(args: NounProjectionArgs): string {
	const member = args.input.members[0];
	const normalized = args.normalizedMembers[0];
	if (
		args.input.members.length !== 1 ||
		member === undefined ||
		normalized === undefined ||
		!trailingErgaenzungsstrich.test(member)
	) {
		return strictProjection(args);
	}

	if (
		args.memberOrthographies.length !== 1 ||
		args.normalizedMembers.length !== 1 ||
		args.surface.surfaceKind !== "Inflection"
	) {
		throw invalidSuspension();
	}
	const match = rightConjunctPattern.exec(args.input.markedContext);
	if (match === null) throw invalidSuspension();
	const rightConjunct = match[1];
	if (rightConjunct === undefined) throw invalidSuspension();
	const targetStart = args.input.markedContext.indexOf("<TARGET>");
	if (
		targetStart < 0 ||
		precedingSuspendedConjunctPattern.test(
			args.input.markedContext.slice(0, targetStart),
		)
	) {
		throw invalidSuspension();
	}
	const followingContext = args.input.markedContext.slice(
		match.index + match[0].length,
	);
	if (/^\s*(?:,\s*)?(?:und\b|oder\b|sowie\b)/u.test(followingContext)) {
		throw invalidSuspension();
	}

	const attestedPrefix = member.slice(0, -1);
	if (attestedPrefix.length === 0) throw invalidSuspension();
	const normalizedRepresentation = fold(normalized);
	const rightConjunctRepresentation = fold(rightConjunct);
	const orthography = args.memberOrthographies[0];
	let sharedSuffixRepresentation: string;
	if (orthography === "Standard") {
		const attestedPrefixRepresentation = fold(attestedPrefix);
		if (
			!normalizedRepresentation.startsWith(attestedPrefixRepresentation)
		) {
			throw invalidSuspension();
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
		throw invalidSuspension();
	}

	if (
		sharedSuffixRepresentation.length === 0 ||
		!rightConjunctRepresentation.endsWith(sharedSuffixRepresentation) ||
		rightConjunctRepresentation.length ===
			sharedSuffixRepresentation.length ||
		normalizedRepresentation.length === sharedSuffixRepresentation.length
	) {
		throw invalidSuspension();
	}

	return normalized;
}

function strictProjection(args: NounProjectionArgs): string {
	return constructNormalizedSurface({
		attestedMembers: args.input.members,
		normalizedMembers: args.normalizedMembers,
		memberOrthographies: args.memberOrthographies,
	});
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

function fold(value: string): string {
	return value.normalize("NFC").toLocaleLowerCase("de");
}

function invalidSuspension(): NormalizedSurfaceProjectionError {
	return new NormalizedSurfaceProjectionError(
		"NOUN suspended completion requires one trailing Divis member, binary und/oder coordination, and a literal shared suffix from one full right compound.",
	);
}
