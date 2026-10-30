import { Context, Effect, FileSystem, Layer, Path } from "effect";
import { FileNotFound, NotTxtFile } from "../shared/errors.ts";

// The business logic, written once. Both transports call this service and
// know nothing about the file system.
export class FileReader extends Context.Service<
	FileReader,
	{
		readonly read: (
			name: string,
		) => Effect.Effect<string, NotTxtFile | FileNotFound>;
	}
>()("effect-playground/FileReader") {
	static readonly layer = Layer.effect(
		FileReader,
		Effect.gen(function* () {
			const fs = yield* FileSystem.FileSystem;
			const path = yield* Path.Path;
			const directory = path.join(import.meta.dirname, "../../files");

			const read = Effect.fn("FileReader.read")(function* (name: string) {
				if (path.extname(name) !== ".txt") {
					return yield* new NotTxtFile({ name });
				}
				// basename keeps "../../etc/passwd.txt" inside the files folder.
				return yield* fs
					.readFileString(path.join(directory, path.basename(name)))
					.pipe(
						Effect.catchReason(
							"PlatformError",
							"NotFound",
							() => Effect.fail(new FileNotFound({ name })),
							// Any other reason (permissions, a directory named x.txt) is
							// a bug, not a case the client handles: make it a defect.
							Effect.die,
						),
					);
			});

			return FileReader.of({ read });
		}),
	);
}
