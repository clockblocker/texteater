import { lexemeANFixtures } from "./lexeme-a-n";
import { lexemePZFixtures } from "./lexeme-p-z";
import { locutionFixtures } from "./locution";
import { morphemeFixtures } from "./morpheme";
import { sayingFixtures } from "./saying";

export const NOTE_STUDY_FIXTURES = [
	...lexemeANFixtures,
	...lexemePZFixtures,
	...locutionFixtures,
	...sayingFixtures,
	...morphemeFixtures,
] as const;
