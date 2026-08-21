# common-utils

`common-utils` is the Zod-free runtime shared by generated textfresser
validators. It exposes `ParsingError`, the versioned validation-artifact types,
and `parseValidationArtifact`.

Canonical schemas and artifact generation remain in their owning packages.
This package interprets committed artifacts at operational runtime and has no
runtime dependency on Zod.

```ts
import {
	parseValidationArtifact,
	type ValidationArtifact,
} from "common-utils";

interface Greeting {
	message: string;
}

const artifact: ValidationArtifact<Greeting> = {
	version: 1,
	root: ["object", { message: ["string", [["min", 1]]] }, "strict"],
};

const greeting = parseValidationArtifact(artifact, { message: "hello" });
```

An invalid value returns `ParsingError`; an unknown artifact version or
reference throws because it indicates incompatible or corrupt generated code.
