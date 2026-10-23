import { ParsingError } from "common-utils/validation";

/** Where an issue sits in the checked input. */
export type Path = (number | string)[];

/** A ParsingError with one custom issue at `path`. */
export function issue(path: Path, message: string): ParsingError {
	return new ParsingError([{ code: "custom", path, message }]);
}
