import type { EntityValue } from "../../../../../src/types/public-types.ts";
import type { AttestationSource } from "../../shared/types";
import { isEntityValue } from "../entity/guards";

export function getDirectAttestation(
	moduleExports: Record<string, unknown>,
	sourcePath: string,
): Omit<AttestationSource, "sourcePath"> {
	const entityExports = Object.entries(moduleExports).filter(([, value]) =>
		isEntityValue(value),
	);
	if (entityExports.length !== 1) {
		throw new Error(
			`${sourcePath} must export exactly one dumling entity or one attestation wrapper.`,
		);
	}

	return { entity: entityExports[0]?.[1] as EntityValue };
}
