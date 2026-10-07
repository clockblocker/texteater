/**
 * The repository gates CI runs on every push to `main`, in order.
 * `.github/workflows/ci.yml` runs each one as its own step through
 * `bun tooling/ci.ts <name>`, and `bun run ci` runs them all locally.
 * `bun run validate` runs only `validate`, `knip` and `dum-runtime`.
 */
export const ciGates = [
	{
		// Every package's `build:package`; also warms Turbo's cache for the
		// builds `validate` reaches.
		name: "build",
		args: ["bun", "run", "build"],
	},
	{
		// Turbo runs each workspace's check, lint, test, generated-file
		// freshness and policy stages (turbo.json), next to the repository's manifest policy, import
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
	{
		// tf-demo's backend-free Playwright specs (its `playground` project).
		// The Convex-backed specs stay local. Slow, so `validate` skips it.
		name: "e2e",
		args: ["bun", "run", "--cwd", "app/tf-demo", "test:e2e:playground"],
	},
] as const;
