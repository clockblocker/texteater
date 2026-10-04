/**
 * The repository gates CI runs on every push to `main`, in order.
 * `.github/workflows/ci.yml` runs each one as its own step through
 * `bun tooling/ci.ts <name>`, `bun run ci` runs them all locally, and
 * `bun run validate` runs every gate but `build`.
 */
export const ciGates = [
	{
		// Every package's `build:package`; also warms Turbo's cache for the
		// builds `validate` reaches.
		name: "build",
		args: ["bun", "run", "build"],
	},
	{
		// Turbo runs each workspace's check, lint, test and policy stages
		// (turbo.json), next to the repository's manifest policy, import
		// policy, documentation integrity and tooling's types, lint and tests.
		name: "validate",
		args: [
			"node_modules/.bin/turbo",
			"run",
			"validate",
			"validate:manifests",
			"validate:imports",
			"check:docs",
			"check:tooling",
			"lint:tooling",
			"test:tooling",
			"--continue",
		],
	},
	{
		// Unused files, exports and dependencies across the repository,
		// against tooling/knip-baseline.json.
		name: "knip",
		args: ["bun", "tooling/knip.ts"],
	},
	{
		name: "dum-runtime",
		args: ["bun", "tooling/dum-runtime-verification/verify.ts"],
	},
] as const;
