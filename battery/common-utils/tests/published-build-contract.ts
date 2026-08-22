import { ParsingError as SourceParsingError } from "../src/parsing-error";
import {
	parseValidationArtifact as parseSourceValidationArtifact,
	type ValidationArtifact,
} from "../src/validation-artifact";

const sourceModule = await import("../src/index");
const publishedModule = await import("../dist/index.js");

function invariant(condition: unknown, message: string): asserts condition {
	if (!condition)
		throw new Error(`Published common-utils build drifted: ${message}`);
}

invariant(
	JSON.stringify(Object.keys(publishedModule).sort()) ===
		JSON.stringify(Object.keys(sourceModule).sort()),
	"exported runtime keys differ from source",
);
for (const [key, value] of Object.entries(sourceModule)) {
	if (typeof value !== "function") continue;
	const published = publishedModule[key as keyof typeof publishedModule];
	invariant(
		typeof published === "function",
		`${key} is no longer a function`,
	);
	invariant(
		(published as (...args: never[]) => unknown).name === value.name,
		`${key}.name changed`,
	);
}

const artifact = {
	definitions: {},
	root: ["pipe", ["string"], [["operation", "uppercase"]]],
	version: 1,
} as const satisfies ValidationArtifact<string>;
const operations = {
	uppercase: (value: unknown) => ({
		value: String(value).toUpperCase(),
	}),
};
invariant(
	JSON.stringify(
		publishedModule.parseValidationArtifact(artifact, "stable", operations),
	) ===
		JSON.stringify(
			parseSourceValidationArtifact(artifact, "stable", operations),
		),
	"validation output differs from source",
);
const sourceError = new SourceParsingError([
	{
		code: "custom",
		message: "stable",
		path: ["value"],
	},
]);
const publishedError = new publishedModule.ParsingError(sourceError.issues);
invariant(
	publishedError.name === sourceError.name,
	"ParsingError.name changed",
);
invariant(
	publishedError.message === sourceError.message,
	"ParsingError.message changed",
);
invariant(
	JSON.stringify(publishedError.issues) ===
		JSON.stringify(sourceError.issues),
	"ParsingError issues changed",
);

process.stdout.write("Published common-utils build contract passed.\n");
