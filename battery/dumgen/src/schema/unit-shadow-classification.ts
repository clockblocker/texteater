import { encodedDumgenValidationArtifacts } from "../generated/validation-artifacts";

type UnitShadowClassificationInput = {
	readonly language: string;
	readonly [key: string]: unknown;
};

type UnitShadowClassification =
	| { readonly decision: "Unresolved" }
	| {
			readonly decision: "Resolved";
			readonly target: null | {
				readonly family: string;
				readonly kind: string;
			};
	  };

let supportedRoutes: ReadonlySet<string> | undefined;

export function assertSupportedUnitShadowClassification(
	input: UnitShadowClassificationInput,
	classification: UnitShadowClassification,
): void {
	if (classification.decision === "Unresolved") return;
	if (classification.target === null) {
		throw new Error("Resolved Unit Shadow classification has no target.");
	}

	supportedRoutes ??= new Set(
		encodedDumgenValidationArtifacts.supportedUnitShadowRoutes.split("\n"),
	);
	const route = `${input.language}/${classification.target.family}/${classification.target.kind}`;
	if (!supportedRoutes.has(route)) {
		throw new Error(
			`${input.language}/${classification.target.family}/${classification.target.kind} is not a supported Dumling Lemma route.`,
		);
	}
}
