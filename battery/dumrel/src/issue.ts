import { ParsingError } from "common-utils/validation";

/** Where an issue sits in the checked input. */
export type Path = (number | string)[];

/** A ParsingError with one custom issue at `path`. */
export function issue(path: Path, message: string): ParsingError {
	return new ParsingError([{ code: "custom", path, message }]);
}

/**
 * Re-prefixes every issue in `error` with `prefix`, optionally dropping `drop`
 * leading path segments from each issue first.
 */
export function prefixIssues(
	error: ParsingError,
	prefix: readonly (number | string)[],
	drop = 0,
): ParsingError {
	return new ParsingError(
		error.issues.map((entry) => ({
			...entry,
			path: [
				...prefix,
				...(drop > 0 ? entry.path.slice(drop) : entry.path),
			],
		})),
	);
}
