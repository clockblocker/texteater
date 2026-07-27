import { type PolicyMode, validateManifestPolicy } from "./lib/manifest-policy";

const mode = process.argv[2] as PolicyMode | undefined;
if (mode !== "package" && mode !== "repository") {
	console.error("Usage: bun tooling/manifest-policy.ts <package|repository>");
	process.exit(2);
}

const issues = await validateManifestPolicy({
	cwd: process.cwd(),
	mode,
});
if (issues.length > 0) {
	console.error(`Manifest policy failed (${mode} mode):`);
	for (const issue of issues) {
		console.error(`- ${issue.location}: ${issue.message}`);
	}
	process.exit(1);
}
console.log(`Manifest policy passed (${mode} mode).`);
