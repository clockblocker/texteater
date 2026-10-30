import { Schema } from "effect";

// Errors are schemas, so they cross the wire and arrive on the client as the
// same classes. `httpApiStatus` is read only by the REST transport.

export class NotTxtFile extends Schema.TaggedError<NotTxtFile>()(
	"NotTxtFile",
	{ name: Schema.String },
	{ httpApiStatus: 415 },
) {}

export class FileNotFound extends Schema.TaggedError<FileNotFound>()(
	"FileNotFound",
	{ name: Schema.String },
	{ httpApiStatus: 404 },
) {}
