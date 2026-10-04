/**
 * The repository gates CI runs on every push to `main`, in order.
 * `.github/workflows/ci.yml` runs each one as its own step through
 * `bun tooling/ci.ts <name>`, and `bun run ci` runs them all locally.
 */
export const ciGates = [
	{
		// First: dumling-docs' type-check and tests read the content and the
		// Astro types its build generates, which are gitignored.
		name: "build",
		args: ["bun", "run", "build"],
	},
	{
		// Covers tf-demo's project references, which `validate` skips.
		name: "check",
		args: ["bun", "run", "check"],
	},
	{
		// Manifest policy, architecture, documentation, tooling tests, and
		// every workspace's format, lint, types, tests and dependencies.
		name: "validate",
		args: ["bun", "tooling/validate-repository.ts"],
	},
	{
		name: "dum-runtime",
		args: ["bun", "tooling/dum-runtime-verification/verify.ts"],
	},
] as const;
