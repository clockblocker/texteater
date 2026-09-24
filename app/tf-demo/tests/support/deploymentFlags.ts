import { afterEach, beforeEach } from "bun:test";

const FLAGS = ["TF_DEMO_ADMIN", "TF_INSPECTION"] as const;

/**
 * Sets both deployment flags around every test in the calling file, as local
 * development does, and restores them after each.
 */
export function enableDeploymentFlags(): void {
	let previous: Partial<Record<(typeof FLAGS)[number], string>> = {};
	beforeEach(() => {
		previous = {};
		for (const name of FLAGS) {
			const value = process.env[name];
			if (value !== undefined) previous[name] = value;
			process.env[name] = "1";
		}
	});
	afterEach(() => {
		for (const name of FLAGS) {
			const value = previous[name];
			if (value === undefined) delete process.env[name];
			else process.env[name] = value;
		}
	});
}
