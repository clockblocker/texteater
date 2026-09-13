import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";

export function parseGermanLemma(input: unknown): Dumling.Lemma<"de"> {
	const parsed = parseUnit(input);
	if (!parsed.success) throw parsed.error;
	if (parsed.chain.unitKind !== "Lemma" || parsed.chain.language !== "de")
		throw new Error("Expected a German Lemma.");
	return parsed.chain.value;
}
export function parseGermanReading(input: unknown): Dumling.Reading<"de"> {
	const parsed = parseUnit(input);
	if (!parsed.success) throw parsed.error;
	if (parsed.chain.unitKind !== "Reading" || parsed.chain.language !== "de")
		throw new Error("Expected a German Reading.");
	return parsed.chain.value;
}
export function parseGermanSurface(input: unknown): Dumling.Surface<"de"> {
	const parsed = parseUnit(input);
	if (!parsed.success) throw parsed.error;
	if (parsed.chain.unitKind !== "Surface" || parsed.chain.language !== "de")
		throw new Error("Expected a German Surface.");
	return parsed.chain.value;
}
export function parseGermanAttestation(
	input: unknown,
): Dumling.Attestation<"de"> {
	const parsed = parseUnit(input);
	if (!parsed.success) throw parsed.error;
	if (
		parsed.chain.unitKind !== "Attestation" ||
		parsed.chain.language !== "de"
	)
		throw new Error("Expected a German Attestation.");
	return parsed.chain.value;
}
