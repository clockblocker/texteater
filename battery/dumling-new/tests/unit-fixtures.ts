import type { z } from "zod";
import type { SourceRoute } from "../codegen/routes.js";

interface Shape {
	anyOf?: Shape[];
	const?: unknown;
	enum?: unknown[];
	items?: Shape;
	properties?: Record<string, Shape>;
	type?: string;
}
function example(shape: Shape): unknown {
	if (shape.anyOf)
		return example(
			shape.anyOf.find((option) => option.type !== "null") ??
				shape.anyOf[0] ??
				{},
		);
	if ("const" in shape) return shape.const;
	if (shape.enum) return shape.enum[0];
	if (shape.type === "object")
		return Object.fromEntries(
			Object.entries(shape.properties ?? {}).map(([key, value]) => [
				key,
				example(value),
			]),
		);
	if (shape.type === "array") return [example(shape.items ?? {})];
	if (shape.type === "null") return null;
	if (shape.type === "boolean") return true;
	if (shape.type === "number" || shape.type === "integer") return 1;
	return "example";
}
export function unitFixtures(route: SourceRoute, zod: typeof z) {
	const sample = example(zod.toJSONSchema(route.bag) as Shape) as {
		core: Record<string, unknown>;
	};
	if (route.key === "de/Lexeme/PRON")
		sample.core = Object.fromEntries(
			Object.keys(sample.core).map((key) => [key, null]),
		);
	const bag = route.bag.parse(sample);
	const Lemma = {
		unitKind: "Lemma",
		language: route.language,
		family: route.family,
		kind: route.kind,
		canonicalForm: "example",
		coreFeatures: bag.core,
	};
	const Surface = {
		unitKind: "Surface",
		language: route.language,
		lemma: Lemma,
		normalizedSurface: "example",
		spelling: "Canonical",
		surfaceFeatures: null,
		...(Object.hasOwn(bag, "inflectional")
			? { inflectionalFeatures: bag.inflectional }
			: {}),
	};
	const Reading = {
		unitKind: "Reading",
		lemma: Lemma,
		emojiDescription: "🏠",
	};
	const Attestation = {
		unitKind: "Attestation",
		surface: Surface,
		members: [{ attested: "example", orthography: "Standard" }],
		realizationCoverage: "Full",
	};
	return { Lemma, Surface, Reading, Attestation };
}
