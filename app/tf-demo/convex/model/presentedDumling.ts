import { type Infer, v } from "convex/values";
import { germanFusionOneLiner } from "dumgen/authored";
import { checkIfGrundform, parseUnit } from "dumling";
import {
	attestationMemberValidator,
	familyValidator,
	fusionValidator,
	grundformValidator,
	kindValidator,
	languageValidator,
	realizationCoverageValidator,
	surfaceSpellingValidator,
} from "./validators";

const presentedFeatureValueValidator = v.union(
	v.null(),
	v.string(),
	v.array(v.string()),
);

/** Convex records support bracketed Dumling feature names; objects do not. */
export const presentedFeatureSetValidator = v.record(
	v.string(),
	presentedFeatureValueValidator,
);

export const presentedLemmaValidator = v.object({
	language: languageValidator,
	canonicalForm: v.string(),
	family: familyValidator,
	kind: kindValidator,
	coreFeatures: presentedFeatureSetValidator,
});

export const presentedSurfaceValidator = v.object({
	language: languageValidator,
	normalizedSurface: v.string(),
	spelling: surfaceSpellingValidator,
	grundform: grundformValidator,
	surfaceFeatures: v.object({
		historicalStatus: v.union(v.null(), v.literal("Archaic")),
	}),
	lemma: presentedLemmaValidator,
	inflectionalFeatures: presentedFeatureSetValidator,
});

/**
 * A Fusion one Attestation reaches (ADR 0035): the fused word, the
 * components this Attestation realizes, and the authored one-liner, if any.
 */
export const presentedFusionValidator = v.object({
	...fusionValidator.fields,
	realized: v.array(v.number()),
	oneLiner: v.union(v.null(), v.string()),
});

export const presentedAttestationValidator = v.object({
	members: v.array(attestationMemberValidator),
	realizationCoverage: realizationCoverageValidator,
	surface: presentedSurfaceValidator,
	fusions: v.array(presentedFusionValidator),
});

export function presentLemma(
	value: unknown,
): Infer<typeof presentedLemmaValidator> {
	const parsed = parseUnit(value);
	if (!parsed.success) throw parsed.error;
	if (parsed.chain.unitKind !== "Lemma" || parsed.chain.language === "en")
		throw new Error("Expected a Lemma.");
	const { language, family, kind, canonicalForm, coreFeatures } =
		parsed.chain.value;
	return {
		language,
		family,
		kind,
		canonicalForm,
		coreFeatures: coreFeatures ?? {},
	};
}
export function presentSurface(
	value: unknown,
): Infer<typeof presentedSurfaceValidator> {
	const parsed = parseUnit(value);
	if (!parsed.success) throw parsed.error;
	if (parsed.chain.unitKind !== "Surface" || parsed.chain.language === "en")
		throw new Error("Expected a Surface.");
	const surface = parsed.chain.value;
	const assessment = checkIfGrundform(surface);
	return {
		language: surface.language,
		normalizedSurface: surface.normalizedSurface,
		spelling: surface.spelling,
		grundform: assessment.success ? assessment.value : null,
		surfaceFeatures: {
			historicalStatus: surface.surfaceFeatures?.historicalStatus ?? null,
		},
		inflectionalFeatures:
			"inflectionalFeatures" in surface
				? (surface.inflectionalFeatures ?? {})
				: {},
		lemma: presentLemma(surface.lemma),
	};
}
export function presentAttestation(
	value: unknown,
): Infer<typeof presentedAttestationValidator> {
	const parsed = parseUnit(value);
	if (!parsed.success) throw parsed.error;
	if (parsed.chain.unitKind !== "Attestation")
		throw new Error("Expected an Attestation.");
	const attestation = parsed.chain.value;
	return {
		members: attestation.members.map((member) =>
			member.orthography === "Fused"
				? {
						attested: member.attested,
						orthography: member.orthography,
						fusion: cloneFusion(member.fusion),
						component: member.component,
					}
				: {
						attested: member.attested,
						orthography: member.orthography,
					},
		),
		realizationCoverage: attestation.realizationCoverage,
		surface: presentSurface(attestation.surface),
		fusions: reachedFusions(attestation),
	};
}

type Fusion = Infer<typeof fusionValidator>;

function cloneFusion(fusion: {
	readonly spelling: string;
	readonly components: readonly { span: string; surface: string }[];
}): Fusion {
	return {
		spelling: fusion.spelling,
		components: fusion.components.map(({ span, surface }) => ({
			span,
			surface,
		})),
	};
}

/**
 * Every Fusion an Attestation reaches: through its `Fused` members, or
 * through a hidden article component (Hebrew `בבית`), in member order.
 */
function reachedFusions(attestation: {
	readonly members: readonly (
		| { readonly orthography: "Standard" | "Typo" | "Shorthand" }
		| {
				readonly orthography: "Fused";
				readonly fusion: Fusion;
				readonly component: number;
		  }
	)[];
	readonly articleEvidence?: unknown;
	readonly surface: { readonly language: string };
}): Infer<typeof presentedFusionValidator>[] {
	const evidence = attestation.articleEvidence as
		| { kind: "Hidden"; fusion: Fusion; component: number }
		| { kind: "Owned" | "Shared" }
		| null
		| undefined;
	const pieces = [
		...attestation.members.flatMap((member) =>
			member.orthography === "Fused" ? [member] : [],
		),
		...(evidence?.kind === "Hidden" ? [evidence] : []),
	];
	const reached = new Map<string, Infer<typeof presentedFusionValidator>>();
	for (const { fusion, component } of pieces) {
		const key = JSON.stringify(fusion);
		const known = reached.get(key);
		if (known) {
			if (!known.realized.includes(component))
				known.realized.push(component);
			continue;
		}
		reached.set(key, {
			...cloneFusion(fusion),
			realized: [component],
			oneLiner:
				attestation.surface.language === "de"
					? (germanFusionOneLiner(fusion) ?? null)
					: null,
		});
	}
	return [...reached.values()];
}
