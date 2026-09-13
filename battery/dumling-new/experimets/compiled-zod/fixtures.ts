import values from "./fixtures.json" with {type: "json"};
export const samples: unknown[] = values;
export function sample(): unknown { return values.find(value => value.language === "de" && value.kind === "NOUN")!; }
