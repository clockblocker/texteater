// Generated public DTOs.
type _Output1 = "ResolvableText" | "OpaqueText" | "Whitespace" | "Punctuation";
type _Output2 = string;
type _Output0 = { kind: _Output1; text: _Output2 };
type _Output4 = string;
type _Output5 = "de" | "en" | "he";
type _Output6 = Array<_Output0>;
type _Output3 = { id: _Output4; language: _Output5; segments: _Output6 };
type _Output9 = "Accepted";
type _Output10 = "de";
type _Output12 = "de";
type _Output11 = { id: _Output4; language: _Output12; segments: _Output6 };
type _Output8 = {
	decision: _Output9;
	language: _Output10;
	sentence: _Output11;
};
type _Output14 = "Accepted";
type _Output15 = "he";
type _Output17 = "he";
type _Output16 = { id: _Output4; language: _Output17; segments: _Output6 };
type _Output13 = {
	decision: _Output14;
	language: _Output15;
	sentence: _Output16;
};
type _Output19 = "UnsupportedLanguage";
type _Output18 = { decision: _Output19 };
type _Output21 = "Unintelligible";
type _Output20 = { decision: _Output21 };
type _Output7 = _Output8 | _Output13 | _Output18 | _Output20;
type _Output25 = "de";
type _Output24 = { id: _Output4; language: _Output25; segments: _Output6 };
type _Output27 = "Construction";
type _Output28 = "Fusion";
type _Output30 = number;
type _Output29 = [_Output30, ...Array<_Output30>];
type _Output26 = {
	family: _Output27;
	kind: _Output28;
	memberSegmentIndices: _Output29;
};
type _Output23 = { sentence: _Output24; target: _Output26 };
type _Output33 = "de";
type _Output32 = { id: _Output4; language: _Output33; segments: _Output6 };
type _Output35 = "Lexeme";
type _Output36 = "ADJ";
type _Output34 = {
	family: _Output35;
	kind: _Output36;
	memberSegmentIndices: _Output29;
};
type _Output31 = { sentence: _Output32; target: _Output34 };
type _Output39 = "de";
type _Output38 = { id: _Output4; language: _Output39; segments: _Output6 };
type _Output41 = "Lexeme";
type _Output42 = "ADP";
type _Output40 = {
	family: _Output41;
	kind: _Output42;
	memberSegmentIndices: _Output29;
};
type _Output37 = { sentence: _Output38; target: _Output40 };
type _Output45 = "de";
type _Output44 = { id: _Output4; language: _Output45; segments: _Output6 };
type _Output47 = "Lexeme";
type _Output48 = "ADV";
type _Output46 = {
	family: _Output47;
	kind: _Output48;
	memberSegmentIndices: _Output29;
};
type _Output43 = { sentence: _Output44; target: _Output46 };
type _Output51 = "de";
type _Output50 = { id: _Output4; language: _Output51; segments: _Output6 };
type _Output53 = "Lexeme";
type _Output54 = "AUX";
type _Output52 = {
	family: _Output53;
	kind: _Output54;
	memberSegmentIndices: _Output29;
};
type _Output49 = { sentence: _Output50; target: _Output52 };
type _Output57 = "de";
type _Output56 = { id: _Output4; language: _Output57; segments: _Output6 };
type _Output59 = "Lexeme";
type _Output60 = "CCONJ";
type _Output58 = {
	family: _Output59;
	kind: _Output60;
	memberSegmentIndices: _Output29;
};
type _Output55 = { sentence: _Output56; target: _Output58 };
type _Output63 = "de";
type _Output62 = { id: _Output4; language: _Output63; segments: _Output6 };
type _Output65 = "Lexeme";
type _Output66 = "DET";
type _Output64 = {
	family: _Output65;
	kind: _Output66;
	memberSegmentIndices: _Output29;
};
type _Output61 = { sentence: _Output62; target: _Output64 };
type _Output69 = "de";
type _Output68 = { id: _Output4; language: _Output69; segments: _Output6 };
type _Output71 = "Lexeme";
type _Output72 = "INTJ";
type _Output70 = {
	family: _Output71;
	kind: _Output72;
	memberSegmentIndices: _Output29;
};
type _Output67 = { sentence: _Output68; target: _Output70 };
type _Output75 = "de";
type _Output74 = { id: _Output4; language: _Output75; segments: _Output6 };
type _Output77 = "Lexeme";
type _Output78 = "NOUN";
type _Output76 = {
	family: _Output77;
	kind: _Output78;
	memberSegmentIndices: _Output29;
};
type _Output73 = { sentence: _Output74; target: _Output76 };
type _Output81 = "de";
type _Output80 = { id: _Output4; language: _Output81; segments: _Output6 };
type _Output83 = "Lexeme";
type _Output84 = "NUM";
type _Output82 = {
	family: _Output83;
	kind: _Output84;
	memberSegmentIndices: _Output29;
};
type _Output79 = { sentence: _Output80; target: _Output82 };
type _Output87 = "de";
type _Output86 = { id: _Output4; language: _Output87; segments: _Output6 };
type _Output89 = "Lexeme";
type _Output90 = "X";
type _Output88 = {
	family: _Output89;
	kind: _Output90;
	memberSegmentIndices: _Output29;
};
type _Output85 = { sentence: _Output86; target: _Output88 };
type _Output93 = "de";
type _Output92 = { id: _Output4; language: _Output93; segments: _Output6 };
type _Output95 = "Lexeme";
type _Output96 = "PART";
type _Output94 = {
	family: _Output95;
	kind: _Output96;
	memberSegmentIndices: _Output29;
};
type _Output91 = { sentence: _Output92; target: _Output94 };
type _Output99 = "de";
type _Output98 = { id: _Output4; language: _Output99; segments: _Output6 };
type _Output101 = "Lexeme";
type _Output102 = "PRON";
type _Output100 = {
	family: _Output101;
	kind: _Output102;
	memberSegmentIndices: _Output29;
};
type _Output97 = { sentence: _Output98; target: _Output100 };
type _Output105 = "de";
type _Output104 = { id: _Output4; language: _Output105; segments: _Output6 };
type _Output107 = "Lexeme";
type _Output108 = "PROPN";
type _Output106 = {
	family: _Output107;
	kind: _Output108;
	memberSegmentIndices: _Output29;
};
type _Output103 = { sentence: _Output104; target: _Output106 };
type _Output111 = "de";
type _Output110 = { id: _Output4; language: _Output111; segments: _Output6 };
type _Output113 = "Lexeme";
type _Output114 = "PUNCT";
type _Output112 = {
	family: _Output113;
	kind: _Output114;
	memberSegmentIndices: _Output29;
};
type _Output109 = { sentence: _Output110; target: _Output112 };
type _Output117 = "de";
type _Output116 = { id: _Output4; language: _Output117; segments: _Output6 };
type _Output119 = "Lexeme";
type _Output120 = "SCONJ";
type _Output118 = {
	family: _Output119;
	kind: _Output120;
	memberSegmentIndices: _Output29;
};
type _Output115 = { sentence: _Output116; target: _Output118 };
type _Output123 = "de";
type _Output122 = { id: _Output4; language: _Output123; segments: _Output6 };
type _Output125 = "Lexeme";
type _Output126 = "SYM";
type _Output124 = {
	family: _Output125;
	kind: _Output126;
	memberSegmentIndices: _Output29;
};
type _Output121 = { sentence: _Output122; target: _Output124 };
type _Output129 = "de";
type _Output128 = { id: _Output4; language: _Output129; segments: _Output6 };
type _Output131 = "Lexeme";
type _Output132 = "VERB";
type _Output130 = {
	family: _Output131;
	kind: _Output132;
	memberSegmentIndices: _Output29;
};
type _Output127 = { sentence: _Output128; target: _Output130 };
type _Output135 = "de";
type _Output134 = { id: _Output4; language: _Output135; segments: _Output6 };
type _Output137 = "Morpheme";
type _Output138 = "Circumfix";
type _Output136 = {
	family: _Output137;
	kind: _Output138;
	memberSegmentIndices: _Output29;
};
type _Output133 = { sentence: _Output134; target: _Output136 };
type _Output141 = "de";
type _Output140 = { id: _Output4; language: _Output141; segments: _Output6 };
type _Output143 = "Morpheme";
type _Output144 = "Clitic";
type _Output142 = {
	family: _Output143;
	kind: _Output144;
	memberSegmentIndices: _Output29;
};
type _Output139 = { sentence: _Output140; target: _Output142 };
type _Output147 = "de";
type _Output146 = { id: _Output4; language: _Output147; segments: _Output6 };
type _Output149 = "Morpheme";
type _Output150 = "Duplifix";
type _Output148 = {
	family: _Output149;
	kind: _Output150;
	memberSegmentIndices: _Output29;
};
type _Output145 = { sentence: _Output146; target: _Output148 };
type _Output153 = "de";
type _Output152 = { id: _Output4; language: _Output153; segments: _Output6 };
type _Output155 = "Morpheme";
type _Output156 = "Infix";
type _Output154 = {
	family: _Output155;
	kind: _Output156;
	memberSegmentIndices: _Output29;
};
type _Output151 = { sentence: _Output152; target: _Output154 };
type _Output159 = "de";
type _Output158 = { id: _Output4; language: _Output159; segments: _Output6 };
type _Output161 = "Morpheme";
type _Output162 = "Interfix";
type _Output160 = {
	family: _Output161;
	kind: _Output162;
	memberSegmentIndices: _Output29;
};
type _Output157 = { sentence: _Output158; target: _Output160 };
type _Output165 = "de";
type _Output164 = { id: _Output4; language: _Output165; segments: _Output6 };
type _Output167 = "Morpheme";
type _Output168 = "Prefix";
type _Output166 = {
	family: _Output167;
	kind: _Output168;
	memberSegmentIndices: _Output29;
};
type _Output163 = { sentence: _Output164; target: _Output166 };
type _Output171 = "de";
type _Output170 = { id: _Output4; language: _Output171; segments: _Output6 };
type _Output173 = "Morpheme";
type _Output174 = "Root";
type _Output172 = {
	family: _Output173;
	kind: _Output174;
	memberSegmentIndices: _Output29;
};
type _Output169 = { sentence: _Output170; target: _Output172 };
type _Output177 = "de";
type _Output176 = { id: _Output4; language: _Output177; segments: _Output6 };
type _Output179 = "Morpheme";
type _Output180 = "Suffix";
type _Output178 = {
	family: _Output179;
	kind: _Output180;
	memberSegmentIndices: _Output29;
};
type _Output175 = { sentence: _Output176; target: _Output178 };
type _Output183 = "de";
type _Output182 = { id: _Output4; language: _Output183; segments: _Output6 };
type _Output185 = "Morpheme";
type _Output186 = "Suffixoid";
type _Output184 = {
	family: _Output185;
	kind: _Output186;
	memberSegmentIndices: _Output29;
};
type _Output181 = { sentence: _Output182; target: _Output184 };
type _Output189 = "de";
type _Output188 = { id: _Output4; language: _Output189; segments: _Output6 };
type _Output191 = "Morpheme";
type _Output192 = "Transfix";
type _Output190 = {
	family: _Output191;
	kind: _Output192;
	memberSegmentIndices: _Output29;
};
type _Output187 = { sentence: _Output188; target: _Output190 };
type _Output195 = "de";
type _Output194 = { id: _Output4; language: _Output195; segments: _Output6 };
type _Output197 = "Phraseme";
type _Output198 = "Aphorism";
type _Output196 = {
	family: _Output197;
	kind: _Output198;
	memberSegmentIndices: _Output29;
};
type _Output193 = { sentence: _Output194; target: _Output196 };
type _Output201 = "de";
type _Output200 = { id: _Output4; language: _Output201; segments: _Output6 };
type _Output203 = "Phraseme";
type _Output204 = "Collocation";
type _Output202 = {
	family: _Output203;
	kind: _Output204;
	memberSegmentIndices: _Output29;
};
type _Output199 = { sentence: _Output200; target: _Output202 };
type _Output207 = "de";
type _Output206 = { id: _Output4; language: _Output207; segments: _Output6 };
type _Output209 = "Phraseme";
type _Output210 = "DiscourseFormula";
type _Output208 = {
	family: _Output209;
	kind: _Output210;
	memberSegmentIndices: _Output29;
};
type _Output205 = { sentence: _Output206; target: _Output208 };
type _Output213 = "de";
type _Output212 = { id: _Output4; language: _Output213; segments: _Output6 };
type _Output215 = "Phraseme";
type _Output216 = "Idiom";
type _Output214 = {
	family: _Output215;
	kind: _Output216;
	memberSegmentIndices: _Output29;
};
type _Output211 = { sentence: _Output212; target: _Output214 };
type _Output219 = "de";
type _Output218 = { id: _Output4; language: _Output219; segments: _Output6 };
type _Output221 = "Phraseme";
type _Output222 = "Proverb";
type _Output220 = {
	family: _Output221;
	kind: _Output222;
	memberSegmentIndices: _Output29;
};
type _Output217 = { sentence: _Output218; target: _Output220 };
type _Output225 = "en";
type _Output224 = { id: _Output4; language: _Output225; segments: _Output6 };
type _Output227 = "Construction";
type _Output228 = "Fusion";
type _Output226 = {
	family: _Output227;
	kind: _Output228;
	memberSegmentIndices: _Output29;
};
type _Output223 = { sentence: _Output224; target: _Output226 };
type _Output231 = "en";
type _Output230 = { id: _Output4; language: _Output231; segments: _Output6 };
type _Output233 = "Lexeme";
type _Output234 = "ADJ";
type _Output232 = {
	family: _Output233;
	kind: _Output234;
	memberSegmentIndices: _Output29;
};
type _Output229 = { sentence: _Output230; target: _Output232 };
type _Output237 = "en";
type _Output236 = { id: _Output4; language: _Output237; segments: _Output6 };
type _Output239 = "Lexeme";
type _Output240 = "ADP";
type _Output238 = {
	family: _Output239;
	kind: _Output240;
	memberSegmentIndices: _Output29;
};
type _Output235 = { sentence: _Output236; target: _Output238 };
type _Output243 = "en";
type _Output242 = { id: _Output4; language: _Output243; segments: _Output6 };
type _Output245 = "Lexeme";
type _Output246 = "ADV";
type _Output244 = {
	family: _Output245;
	kind: _Output246;
	memberSegmentIndices: _Output29;
};
type _Output241 = { sentence: _Output242; target: _Output244 };
type _Output249 = "en";
type _Output248 = { id: _Output4; language: _Output249; segments: _Output6 };
type _Output251 = "Lexeme";
type _Output252 = "AUX";
type _Output250 = {
	family: _Output251;
	kind: _Output252;
	memberSegmentIndices: _Output29;
};
type _Output247 = { sentence: _Output248; target: _Output250 };
type _Output255 = "en";
type _Output254 = { id: _Output4; language: _Output255; segments: _Output6 };
type _Output257 = "Lexeme";
type _Output258 = "CCONJ";
type _Output256 = {
	family: _Output257;
	kind: _Output258;
	memberSegmentIndices: _Output29;
};
type _Output253 = { sentence: _Output254; target: _Output256 };
type _Output261 = "en";
type _Output260 = { id: _Output4; language: _Output261; segments: _Output6 };
type _Output263 = "Lexeme";
type _Output264 = "DET";
type _Output262 = {
	family: _Output263;
	kind: _Output264;
	memberSegmentIndices: _Output29;
};
type _Output259 = { sentence: _Output260; target: _Output262 };
type _Output267 = "en";
type _Output266 = { id: _Output4; language: _Output267; segments: _Output6 };
type _Output269 = "Lexeme";
type _Output270 = "INTJ";
type _Output268 = {
	family: _Output269;
	kind: _Output270;
	memberSegmentIndices: _Output29;
};
type _Output265 = { sentence: _Output266; target: _Output268 };
type _Output273 = "en";
type _Output272 = { id: _Output4; language: _Output273; segments: _Output6 };
type _Output275 = "Lexeme";
type _Output276 = "NOUN";
type _Output274 = {
	family: _Output275;
	kind: _Output276;
	memberSegmentIndices: _Output29;
};
type _Output271 = { sentence: _Output272; target: _Output274 };
type _Output279 = "en";
type _Output278 = { id: _Output4; language: _Output279; segments: _Output6 };
type _Output281 = "Lexeme";
type _Output282 = "NUM";
type _Output280 = {
	family: _Output281;
	kind: _Output282;
	memberSegmentIndices: _Output29;
};
type _Output277 = { sentence: _Output278; target: _Output280 };
type _Output285 = "en";
type _Output284 = { id: _Output4; language: _Output285; segments: _Output6 };
type _Output287 = "Lexeme";
type _Output288 = "X";
type _Output286 = {
	family: _Output287;
	kind: _Output288;
	memberSegmentIndices: _Output29;
};
type _Output283 = { sentence: _Output284; target: _Output286 };
type _Output291 = "en";
type _Output290 = { id: _Output4; language: _Output291; segments: _Output6 };
type _Output293 = "Lexeme";
type _Output294 = "PART";
type _Output292 = {
	family: _Output293;
	kind: _Output294;
	memberSegmentIndices: _Output29;
};
type _Output289 = { sentence: _Output290; target: _Output292 };
type _Output297 = "en";
type _Output296 = { id: _Output4; language: _Output297; segments: _Output6 };
type _Output299 = "Lexeme";
type _Output300 = "PRON";
type _Output298 = {
	family: _Output299;
	kind: _Output300;
	memberSegmentIndices: _Output29;
};
type _Output295 = { sentence: _Output296; target: _Output298 };
type _Output303 = "en";
type _Output302 = { id: _Output4; language: _Output303; segments: _Output6 };
type _Output305 = "Lexeme";
type _Output306 = "PROPN";
type _Output304 = {
	family: _Output305;
	kind: _Output306;
	memberSegmentIndices: _Output29;
};
type _Output301 = { sentence: _Output302; target: _Output304 };
type _Output309 = "en";
type _Output308 = { id: _Output4; language: _Output309; segments: _Output6 };
type _Output311 = "Lexeme";
type _Output312 = "PUNCT";
type _Output310 = {
	family: _Output311;
	kind: _Output312;
	memberSegmentIndices: _Output29;
};
type _Output307 = { sentence: _Output308; target: _Output310 };
type _Output315 = "en";
type _Output314 = { id: _Output4; language: _Output315; segments: _Output6 };
type _Output317 = "Lexeme";
type _Output318 = "SCONJ";
type _Output316 = {
	family: _Output317;
	kind: _Output318;
	memberSegmentIndices: _Output29;
};
type _Output313 = { sentence: _Output314; target: _Output316 };
type _Output321 = "en";
type _Output320 = { id: _Output4; language: _Output321; segments: _Output6 };
type _Output323 = "Lexeme";
type _Output324 = "SYM";
type _Output322 = {
	family: _Output323;
	kind: _Output324;
	memberSegmentIndices: _Output29;
};
type _Output319 = { sentence: _Output320; target: _Output322 };
type _Output327 = "en";
type _Output326 = { id: _Output4; language: _Output327; segments: _Output6 };
type _Output329 = "Lexeme";
type _Output330 = "VERB";
type _Output328 = {
	family: _Output329;
	kind: _Output330;
	memberSegmentIndices: _Output29;
};
type _Output325 = { sentence: _Output326; target: _Output328 };
type _Output333 = "en";
type _Output332 = { id: _Output4; language: _Output333; segments: _Output6 };
type _Output335 = "Morpheme";
type _Output336 = "Circumfix";
type _Output334 = {
	family: _Output335;
	kind: _Output336;
	memberSegmentIndices: _Output29;
};
type _Output331 = { sentence: _Output332; target: _Output334 };
type _Output339 = "en";
type _Output338 = { id: _Output4; language: _Output339; segments: _Output6 };
type _Output341 = "Morpheme";
type _Output342 = "Clitic";
type _Output340 = {
	family: _Output341;
	kind: _Output342;
	memberSegmentIndices: _Output29;
};
type _Output337 = { sentence: _Output338; target: _Output340 };
type _Output345 = "en";
type _Output344 = { id: _Output4; language: _Output345; segments: _Output6 };
type _Output347 = "Morpheme";
type _Output348 = "Duplifix";
type _Output346 = {
	family: _Output347;
	kind: _Output348;
	memberSegmentIndices: _Output29;
};
type _Output343 = { sentence: _Output344; target: _Output346 };
type _Output351 = "en";
type _Output350 = { id: _Output4; language: _Output351; segments: _Output6 };
type _Output353 = "Morpheme";
type _Output354 = "Infix";
type _Output352 = {
	family: _Output353;
	kind: _Output354;
	memberSegmentIndices: _Output29;
};
type _Output349 = { sentence: _Output350; target: _Output352 };
type _Output357 = "en";
type _Output356 = { id: _Output4; language: _Output357; segments: _Output6 };
type _Output359 = "Morpheme";
type _Output360 = "Interfix";
type _Output358 = {
	family: _Output359;
	kind: _Output360;
	memberSegmentIndices: _Output29;
};
type _Output355 = { sentence: _Output356; target: _Output358 };
type _Output363 = "en";
type _Output362 = { id: _Output4; language: _Output363; segments: _Output6 };
type _Output365 = "Morpheme";
type _Output366 = "Prefix";
type _Output364 = {
	family: _Output365;
	kind: _Output366;
	memberSegmentIndices: _Output29;
};
type _Output361 = { sentence: _Output362; target: _Output364 };
type _Output369 = "en";
type _Output368 = { id: _Output4; language: _Output369; segments: _Output6 };
type _Output371 = "Morpheme";
type _Output372 = "Root";
type _Output370 = {
	family: _Output371;
	kind: _Output372;
	memberSegmentIndices: _Output29;
};
type _Output367 = { sentence: _Output368; target: _Output370 };
type _Output375 = "en";
type _Output374 = { id: _Output4; language: _Output375; segments: _Output6 };
type _Output377 = "Morpheme";
type _Output378 = "Suffix";
type _Output376 = {
	family: _Output377;
	kind: _Output378;
	memberSegmentIndices: _Output29;
};
type _Output373 = { sentence: _Output374; target: _Output376 };
type _Output381 = "en";
type _Output380 = { id: _Output4; language: _Output381; segments: _Output6 };
type _Output383 = "Morpheme";
type _Output384 = "Suffixoid";
type _Output382 = {
	family: _Output383;
	kind: _Output384;
	memberSegmentIndices: _Output29;
};
type _Output379 = { sentence: _Output380; target: _Output382 };
type _Output387 = "en";
type _Output386 = { id: _Output4; language: _Output387; segments: _Output6 };
type _Output389 = "Morpheme";
type _Output390 = "ToneMarking";
type _Output388 = {
	family: _Output389;
	kind: _Output390;
	memberSegmentIndices: _Output29;
};
type _Output385 = { sentence: _Output386; target: _Output388 };
type _Output393 = "en";
type _Output392 = { id: _Output4; language: _Output393; segments: _Output6 };
type _Output395 = "Morpheme";
type _Output396 = "Transfix";
type _Output394 = {
	family: _Output395;
	kind: _Output396;
	memberSegmentIndices: _Output29;
};
type _Output391 = { sentence: _Output392; target: _Output394 };
type _Output399 = "en";
type _Output398 = { id: _Output4; language: _Output399; segments: _Output6 };
type _Output401 = "Phraseme";
type _Output402 = "Aphorism";
type _Output400 = {
	family: _Output401;
	kind: _Output402;
	memberSegmentIndices: _Output29;
};
type _Output397 = { sentence: _Output398; target: _Output400 };
type _Output405 = "en";
type _Output404 = { id: _Output4; language: _Output405; segments: _Output6 };
type _Output407 = "Phraseme";
type _Output408 = "DiscourseFormula";
type _Output406 = {
	family: _Output407;
	kind: _Output408;
	memberSegmentIndices: _Output29;
};
type _Output403 = { sentence: _Output404; target: _Output406 };
type _Output411 = "en";
type _Output410 = { id: _Output4; language: _Output411; segments: _Output6 };
type _Output413 = "Phraseme";
type _Output414 = "Idiom";
type _Output412 = {
	family: _Output413;
	kind: _Output414;
	memberSegmentIndices: _Output29;
};
type _Output409 = { sentence: _Output410; target: _Output412 };
type _Output417 = "en";
type _Output416 = { id: _Output4; language: _Output417; segments: _Output6 };
type _Output419 = "Phraseme";
type _Output420 = "Proverb";
type _Output418 = {
	family: _Output419;
	kind: _Output420;
	memberSegmentIndices: _Output29;
};
type _Output415 = { sentence: _Output416; target: _Output418 };
type _Output423 = "he";
type _Output422 = { id: _Output4; language: _Output423; segments: _Output6 };
type _Output425 = "Construction";
type _Output426 = "Fusion";
type _Output424 = {
	family: _Output425;
	kind: _Output426;
	memberSegmentIndices: _Output29;
};
type _Output421 = { sentence: _Output422; target: _Output424 };
type _Output429 = "he";
type _Output428 = { id: _Output4; language: _Output429; segments: _Output6 };
type _Output431 = "Lexeme";
type _Output432 = "ADJ";
type _Output430 = {
	family: _Output431;
	kind: _Output432;
	memberSegmentIndices: _Output29;
};
type _Output427 = { sentence: _Output428; target: _Output430 };
type _Output435 = "he";
type _Output434 = { id: _Output4; language: _Output435; segments: _Output6 };
type _Output437 = "Lexeme";
type _Output438 = "ADP";
type _Output436 = {
	family: _Output437;
	kind: _Output438;
	memberSegmentIndices: _Output29;
};
type _Output433 = { sentence: _Output434; target: _Output436 };
type _Output441 = "he";
type _Output440 = { id: _Output4; language: _Output441; segments: _Output6 };
type _Output443 = "Lexeme";
type _Output444 = "ADV";
type _Output442 = {
	family: _Output443;
	kind: _Output444;
	memberSegmentIndices: _Output29;
};
type _Output439 = { sentence: _Output440; target: _Output442 };
type _Output447 = "he";
type _Output446 = { id: _Output4; language: _Output447; segments: _Output6 };
type _Output449 = "Lexeme";
type _Output450 = "AUX";
type _Output448 = {
	family: _Output449;
	kind: _Output450;
	memberSegmentIndices: _Output29;
};
type _Output445 = { sentence: _Output446; target: _Output448 };
type _Output453 = "he";
type _Output452 = { id: _Output4; language: _Output453; segments: _Output6 };
type _Output455 = "Lexeme";
type _Output456 = "CCONJ";
type _Output454 = {
	family: _Output455;
	kind: _Output456;
	memberSegmentIndices: _Output29;
};
type _Output451 = { sentence: _Output452; target: _Output454 };
type _Output459 = "he";
type _Output458 = { id: _Output4; language: _Output459; segments: _Output6 };
type _Output461 = "Lexeme";
type _Output462 = "DET";
type _Output460 = {
	family: _Output461;
	kind: _Output462;
	memberSegmentIndices: _Output29;
};
type _Output457 = { sentence: _Output458; target: _Output460 };
type _Output465 = "he";
type _Output464 = { id: _Output4; language: _Output465; segments: _Output6 };
type _Output467 = "Lexeme";
type _Output468 = "INTJ";
type _Output466 = {
	family: _Output467;
	kind: _Output468;
	memberSegmentIndices: _Output29;
};
type _Output463 = { sentence: _Output464; target: _Output466 };
type _Output471 = "he";
type _Output470 = { id: _Output4; language: _Output471; segments: _Output6 };
type _Output473 = "Lexeme";
type _Output474 = "NOUN";
type _Output472 = {
	family: _Output473;
	kind: _Output474;
	memberSegmentIndices: _Output29;
};
type _Output469 = { sentence: _Output470; target: _Output472 };
type _Output477 = "he";
type _Output476 = { id: _Output4; language: _Output477; segments: _Output6 };
type _Output479 = "Lexeme";
type _Output480 = "NUM";
type _Output478 = {
	family: _Output479;
	kind: _Output480;
	memberSegmentIndices: _Output29;
};
type _Output475 = { sentence: _Output476; target: _Output478 };
type _Output483 = "he";
type _Output482 = { id: _Output4; language: _Output483; segments: _Output6 };
type _Output485 = "Lexeme";
type _Output486 = "X";
type _Output484 = {
	family: _Output485;
	kind: _Output486;
	memberSegmentIndices: _Output29;
};
type _Output481 = { sentence: _Output482; target: _Output484 };
type _Output489 = "he";
type _Output488 = { id: _Output4; language: _Output489; segments: _Output6 };
type _Output491 = "Lexeme";
type _Output492 = "PART";
type _Output490 = {
	family: _Output491;
	kind: _Output492;
	memberSegmentIndices: _Output29;
};
type _Output487 = { sentence: _Output488; target: _Output490 };
type _Output495 = "he";
type _Output494 = { id: _Output4; language: _Output495; segments: _Output6 };
type _Output497 = "Lexeme";
type _Output498 = "PRON";
type _Output496 = {
	family: _Output497;
	kind: _Output498;
	memberSegmentIndices: _Output29;
};
type _Output493 = { sentence: _Output494; target: _Output496 };
type _Output501 = "he";
type _Output500 = { id: _Output4; language: _Output501; segments: _Output6 };
type _Output503 = "Lexeme";
type _Output504 = "PROPN";
type _Output502 = {
	family: _Output503;
	kind: _Output504;
	memberSegmentIndices: _Output29;
};
type _Output499 = { sentence: _Output500; target: _Output502 };
type _Output507 = "he";
type _Output506 = { id: _Output4; language: _Output507; segments: _Output6 };
type _Output509 = "Lexeme";
type _Output510 = "PUNCT";
type _Output508 = {
	family: _Output509;
	kind: _Output510;
	memberSegmentIndices: _Output29;
};
type _Output505 = { sentence: _Output506; target: _Output508 };
type _Output513 = "he";
type _Output512 = { id: _Output4; language: _Output513; segments: _Output6 };
type _Output515 = "Lexeme";
type _Output516 = "SCONJ";
type _Output514 = {
	family: _Output515;
	kind: _Output516;
	memberSegmentIndices: _Output29;
};
type _Output511 = { sentence: _Output512; target: _Output514 };
type _Output519 = "he";
type _Output518 = { id: _Output4; language: _Output519; segments: _Output6 };
type _Output521 = "Lexeme";
type _Output522 = "SYM";
type _Output520 = {
	family: _Output521;
	kind: _Output522;
	memberSegmentIndices: _Output29;
};
type _Output517 = { sentence: _Output518; target: _Output520 };
type _Output525 = "he";
type _Output524 = { id: _Output4; language: _Output525; segments: _Output6 };
type _Output527 = "Lexeme";
type _Output528 = "VERB";
type _Output526 = {
	family: _Output527;
	kind: _Output528;
	memberSegmentIndices: _Output29;
};
type _Output523 = { sentence: _Output524; target: _Output526 };
type _Output531 = "he";
type _Output530 = { id: _Output4; language: _Output531; segments: _Output6 };
type _Output533 = "Morpheme";
type _Output534 = "Circumfix";
type _Output532 = {
	family: _Output533;
	kind: _Output534;
	memberSegmentIndices: _Output29;
};
type _Output529 = { sentence: _Output530; target: _Output532 };
type _Output537 = "he";
type _Output536 = { id: _Output4; language: _Output537; segments: _Output6 };
type _Output539 = "Morpheme";
type _Output540 = "Clitic";
type _Output538 = {
	family: _Output539;
	kind: _Output540;
	memberSegmentIndices: _Output29;
};
type _Output535 = { sentence: _Output536; target: _Output538 };
type _Output543 = "he";
type _Output542 = { id: _Output4; language: _Output543; segments: _Output6 };
type _Output545 = "Morpheme";
type _Output546 = "Duplifix";
type _Output544 = {
	family: _Output545;
	kind: _Output546;
	memberSegmentIndices: _Output29;
};
type _Output541 = { sentence: _Output542; target: _Output544 };
type _Output549 = "he";
type _Output548 = { id: _Output4; language: _Output549; segments: _Output6 };
type _Output551 = "Morpheme";
type _Output552 = "Infix";
type _Output550 = {
	family: _Output551;
	kind: _Output552;
	memberSegmentIndices: _Output29;
};
type _Output547 = { sentence: _Output548; target: _Output550 };
type _Output555 = "he";
type _Output554 = { id: _Output4; language: _Output555; segments: _Output6 };
type _Output557 = "Morpheme";
type _Output558 = "Interfix";
type _Output556 = {
	family: _Output557;
	kind: _Output558;
	memberSegmentIndices: _Output29;
};
type _Output553 = { sentence: _Output554; target: _Output556 };
type _Output561 = "he";
type _Output560 = { id: _Output4; language: _Output561; segments: _Output6 };
type _Output563 = "Morpheme";
type _Output564 = "Prefix";
type _Output562 = {
	family: _Output563;
	kind: _Output564;
	memberSegmentIndices: _Output29;
};
type _Output559 = { sentence: _Output560; target: _Output562 };
type _Output567 = "he";
type _Output566 = { id: _Output4; language: _Output567; segments: _Output6 };
type _Output569 = "Morpheme";
type _Output570 = "Root";
type _Output568 = {
	family: _Output569;
	kind: _Output570;
	memberSegmentIndices: _Output29;
};
type _Output565 = { sentence: _Output566; target: _Output568 };
type _Output573 = "he";
type _Output572 = { id: _Output4; language: _Output573; segments: _Output6 };
type _Output575 = "Morpheme";
type _Output576 = "Suffix";
type _Output574 = {
	family: _Output575;
	kind: _Output576;
	memberSegmentIndices: _Output29;
};
type _Output571 = { sentence: _Output572; target: _Output574 };
type _Output579 = "he";
type _Output578 = { id: _Output4; language: _Output579; segments: _Output6 };
type _Output581 = "Morpheme";
type _Output582 = "Suffixoid";
type _Output580 = {
	family: _Output581;
	kind: _Output582;
	memberSegmentIndices: _Output29;
};
type _Output577 = { sentence: _Output578; target: _Output580 };
type _Output585 = "he";
type _Output584 = { id: _Output4; language: _Output585; segments: _Output6 };
type _Output587 = "Morpheme";
type _Output588 = "ToneMarking";
type _Output586 = {
	family: _Output587;
	kind: _Output588;
	memberSegmentIndices: _Output29;
};
type _Output583 = { sentence: _Output584; target: _Output586 };
type _Output591 = "he";
type _Output590 = { id: _Output4; language: _Output591; segments: _Output6 };
type _Output593 = "Morpheme";
type _Output594 = "Transfix";
type _Output592 = {
	family: _Output593;
	kind: _Output594;
	memberSegmentIndices: _Output29;
};
type _Output589 = { sentence: _Output590; target: _Output592 };
type _Output597 = "he";
type _Output596 = { id: _Output4; language: _Output597; segments: _Output6 };
type _Output599 = "Phraseme";
type _Output600 = "Aphorism";
type _Output598 = {
	family: _Output599;
	kind: _Output600;
	memberSegmentIndices: _Output29;
};
type _Output595 = { sentence: _Output596; target: _Output598 };
type _Output603 = "he";
type _Output602 = { id: _Output4; language: _Output603; segments: _Output6 };
type _Output605 = "Phraseme";
type _Output606 = "DiscourseFormula";
type _Output604 = {
	family: _Output605;
	kind: _Output606;
	memberSegmentIndices: _Output29;
};
type _Output601 = { sentence: _Output602; target: _Output604 };
type _Output609 = "he";
type _Output608 = { id: _Output4; language: _Output609; segments: _Output6 };
type _Output611 = "Phraseme";
type _Output612 = "Idiom";
type _Output610 = {
	family: _Output611;
	kind: _Output612;
	memberSegmentIndices: _Output29;
};
type _Output607 = { sentence: _Output608; target: _Output610 };
type _Output615 = "he";
type _Output614 = { id: _Output4; language: _Output615; segments: _Output6 };
type _Output617 = "Phraseme";
type _Output618 = "Proverb";
type _Output616 = {
	family: _Output617;
	kind: _Output618;
	memberSegmentIndices: _Output29;
};
type _Output613 = { sentence: _Output614; target: _Output616 };
type _Output22 =
	| _Output23
	| _Output31
	| _Output37
	| _Output43
	| _Output49
	| _Output55
	| _Output61
	| _Output67
	| _Output73
	| _Output79
	| _Output85
	| _Output91
	| _Output97
	| _Output103
	| _Output109
	| _Output115
	| _Output121
	| _Output127
	| _Output133
	| _Output139
	| _Output145
	| _Output151
	| _Output157
	| _Output163
	| _Output169
	| _Output175
	| _Output181
	| _Output187
	| _Output193
	| _Output199
	| _Output205
	| _Output211
	| _Output217
	| _Output223
	| _Output229
	| _Output235
	| _Output241
	| _Output247
	| _Output253
	| _Output259
	| _Output265
	| _Output271
	| _Output277
	| _Output283
	| _Output289
	| _Output295
	| _Output301
	| _Output307
	| _Output313
	| _Output319
	| _Output325
	| _Output331
	| _Output337
	| _Output343
	| _Output349
	| _Output355
	| _Output361
	| _Output367
	| _Output373
	| _Output379
	| _Output385
	| _Output391
	| _Output397
	| _Output403
	| _Output409
	| _Output415
	| _Output421
	| _Output427
	| _Output433
	| _Output439
	| _Output445
	| _Output451
	| _Output457
	| _Output463
	| _Output469
	| _Output475
	| _Output481
	| _Output487
	| _Output493
	| _Output499
	| _Output505
	| _Output511
	| _Output517
	| _Output523
	| _Output529
	| _Output535
	| _Output541
	| _Output547
	| _Output553
	| _Output559
	| _Output565
	| _Output571
	| _Output577
	| _Output583
	| _Output589
	| _Output595
	| _Output601
	| _Output607
	| _Output613;
type _Output622 = "Lemma";
type _Output623 = "de";
type _Output624 = string;
type _Output625 = Record<string, never>;
type _Output621 = {
	unitKind: _Output622;
	language: _Output623;
	family: _Output27;
	kind: _Output28;
	canonicalForm: _Output624;
	coreFeatures: _Output625;
};
type _Output620 = { encounter: _Output23; lemma: _Output621 };
type _Output628 = "Lemma";
type _Output629 = "de";
type _Output632 = "Yes";
type _Output631 = _Output632 | null;
type _Output634 = "Yes";
type _Output633 = _Output634 | null;
type _Output636 = "Card" | "Ord";
type _Output635 = _Output636 | null;
type _Output638 = "Short";
type _Output637 = _Output638 | null;
type _Output630 = {
	abbr: _Output631;
	foreign: _Output633;
	numType: _Output635;
	variant: _Output637;
};
type _Output627 = {
	unitKind: _Output628;
	language: _Output629;
	family: _Output35;
	kind: _Output36;
	canonicalForm: _Output624;
	coreFeatures: _Output630;
};
type _Output626 = { encounter: _Output31; lemma: _Output627 };
type _Output641 = "Lemma";
type _Output642 = "de";
type _Output644 = _Output632 | null;
type _Output646 = "Circ" | "Post" | "Prep";
type _Output645 = _Output646 | null;
type _Output648 = "ADV" | "SCONJ";
type _Output647 = _Output648 | null;
type _Output649 = _Output634 | null;
type _Output651 =
	| "Acc"
	| "Abe"
	| "Ben"
	| "Cau"
	| "Cmp"
	| "Cns"
	| "Com"
	| "Dat"
	| "Dis"
	| "Equ"
	| "Gen"
	| "Ins"
	| "Par"
	| "Tem"
	| "Abl"
	| "Add"
	| "Ade"
	| "All"
	| "Del"
	| "Ela"
	| "Ess"
	| "Ill"
	| "Ine"
	| "Lat"
	| "Loc"
	| "Nom"
	| "Per"
	| "Sbe"
	| "Sbl"
	| "Spl"
	| "Sub"
	| "Sup"
	| "Ter";
type _Output650 = _Output651 | null;
type _Output653 = "Vbp";
type _Output652 = _Output653 | null;
type _Output643 = {
	abbr: _Output644;
	adpType: _Output645;
	extPos: _Output647;
	foreign: _Output649;
	governedCase: _Output650;
	partType: _Output652;
};
type _Output640 = {
	unitKind: _Output641;
	language: _Output642;
	family: _Output41;
	kind: _Output42;
	canonicalForm: _Output624;
	coreFeatures: _Output643;
};
type _Output639 = { encounter: _Output37; lemma: _Output640 };
type _Output656 = "Lemma";
type _Output657 = "de";
type _Output659 = _Output634 | null;
type _Output661 = "Card" | "Mult";
type _Output660 = _Output661 | null;
type _Output663 = "Dem" | "Ind" | "Int" | "Neg" | "Rel";
type _Output662 = _Output663 | null;
type _Output658 = {
	foreign: _Output659;
	numType: _Output660;
	pronType: _Output662;
};
type _Output655 = {
	unitKind: _Output656;
	language: _Output657;
	family: _Output47;
	kind: _Output48;
	canonicalForm: _Output624;
	coreFeatures: _Output658;
};
type _Output654 = { encounter: _Output43; lemma: _Output655 };
type _Output666 = "Lemma";
type _Output667 = "de";
type _Output670 = "Mod";
type _Output669 = _Output670 | null;
type _Output668 = { verbType: _Output669 };
type _Output665 = {
	unitKind: _Output666;
	language: _Output667;
	family: _Output53;
	kind: _Output54;
	canonicalForm: _Output624;
	coreFeatures: _Output668;
};
type _Output664 = { encounter: _Output49; lemma: _Output665 };
type _Output673 = "Lemma";
type _Output674 = "de";
type _Output677 = "Comp";
type _Output676 = _Output677 | null;
type _Output675 = { conjType: _Output676 };
type _Output672 = {
	unitKind: _Output673;
	language: _Output674;
	family: _Output59;
	kind: _Output60;
	canonicalForm: _Output624;
	coreFeatures: _Output675;
};
type _Output671 = { encounter: _Output55; lemma: _Output672 };
type _Output680 = "Lemma";
type _Output681 = "de";
type _Output684 = "Def" | "Ind";
type _Output683 = _Output684 | null;
type _Output686 = "ADV" | "DET";
type _Output685 = _Output686 | null;
type _Output687 = _Output634 | null;
type _Output689 = "Card" | "Ord";
type _Output688 = _Output689 | null;
type _Output691 = "1" | "2" | "3";
type _Output690 = _Output691 | null;
type _Output693 = "Form" | "Infm";
type _Output692 = _Output693 | null;
type _Output695 = "Yes";
type _Output694 = _Output695 | null;
type _Output697 =
	| "Art"
	| "Dem"
	| "Emp"
	| "Exc"
	| "Ind"
	| "Int"
	| "Neg"
	| "Prs"
	| "Rel"
	| "Tot";
type _Output696 = _Output697 | null;
type _Output682 = {
	definite: _Output683;
	extPos: _Output685;
	foreign: _Output687;
	numType: _Output688;
	person: _Output690;
	polite: _Output692;
	poss: _Output694;
	pronType: _Output696;
};
type _Output679 = {
	unitKind: _Output680;
	language: _Output681;
	family: _Output65;
	kind: _Output66;
	canonicalForm: _Output624;
	coreFeatures: _Output682;
};
type _Output678 = { encounter: _Output61; lemma: _Output679 };
type _Output700 = "Lemma";
type _Output701 = "de";
type _Output704 = "Res";
type _Output703 = _Output704 | null;
type _Output702 = { partType: _Output703 };
type _Output699 = {
	unitKind: _Output700;
	language: _Output701;
	family: _Output71;
	kind: _Output72;
	canonicalForm: _Output624;
	coreFeatures: _Output702;
};
type _Output698 = { encounter: _Output67; lemma: _Output699 };
type _Output707 = "Lemma";
type _Output708 = "de";
type _Output711 = "Fem" | "Masc" | "Neut";
type _Output710 = _Output711 | null;
type _Output713 = "Yes";
type _Output712 = _Output713 | null;
type _Output709 = { gender: _Output710; hyph: _Output712 };
type _Output706 = {
	unitKind: _Output707;
	language: _Output708;
	family: _Output77;
	kind: _Output78;
	canonicalForm: _Output624;
	coreFeatures: _Output709;
};
type _Output705 = { encounter: _Output73; lemma: _Output706 };
type _Output716 = "Lemma";
type _Output717 = "de";
type _Output719 = _Output632 | null;
type _Output720 = _Output634 | null;
type _Output722 = "Card" | "Frac" | "Mult" | "Range";
type _Output721 = _Output722 | null;
type _Output718 = {
	abbr: _Output719;
	foreign: _Output720;
	numType: _Output721;
};
type _Output715 = {
	unitKind: _Output716;
	language: _Output717;
	family: _Output83;
	kind: _Output84;
	canonicalForm: _Output624;
	coreFeatures: _Output718;
};
type _Output714 = { encounter: _Output79; lemma: _Output715 };
type _Output725 = "Lemma";
type _Output726 = "de";
type _Output728 = _Output632 | null;
type _Output729 = _Output634 | null;
type _Output730 = _Output713 | null;
type _Output732 = "Card" | "Mult" | "Range";
type _Output731 = _Output732 | null;
type _Output727 = {
	abbr: _Output728;
	foreign: _Output729;
	hyph: _Output730;
	numType: _Output731;
};
type _Output724 = {
	unitKind: _Output725;
	language: _Output726;
	family: _Output89;
	kind: _Output90;
	canonicalForm: _Output624;
	coreFeatures: _Output727;
};
type _Output723 = { encounter: _Output85; lemma: _Output724 };
type _Output735 = "Lemma";
type _Output736 = "de";
type _Output738 = _Output632 | null;
type _Output739 = _Output634 | null;
type _Output741 = "Inf";
type _Output740 = _Output741 | null;
type _Output743 = "Neg" | "Pos";
type _Output742 = _Output743 | null;
type _Output737 = {
	abbr: _Output738;
	foreign: _Output739;
	partType: _Output740;
	polarity: _Output742;
};
type _Output734 = {
	unitKind: _Output735;
	language: _Output736;
	family: _Output95;
	kind: _Output96;
	canonicalForm: _Output624;
	coreFeatures: _Output737;
};
type _Output733 = { encounter: _Output91; lemma: _Output734 };
type _Output746 = "Lemma";
type _Output747 = "de";
type _Output750 = "Acc" | "Dat" | "Gen" | "Nom";
type _Output749 = _Output750 | null;
type _Output752 = "Plur" | "Sing";
type _Output751 = _Output752 | null;
type _Output754 = "Fem" | "Masc" | "Neut";
type _Output753 = _Output754 | null;
type _Output756 = "DET";
type _Output755 = _Output756 | null;
type _Output757 = _Output634 | null;
type _Output759 = "1" | "2" | "3";
type _Output758 = _Output759 | null;
type _Output761 = "Form" | "Infm";
type _Output760 = _Output761 | null;
type _Output762 = _Output695 | null;
type _Output764 = "Dem" | "Ind" | "Int" | "Neg" | "Prs" | "Rcp" | "Rel" | "Tot";
type _Output763 = _Output764 | null;
type _Output766 = "Fem" | "Masc" | "Neut";
type _Output765 = _Output766 | null;
type _Output768 = "Plur" | "Sing";
type _Output767 = _Output768 | null;
type _Output748 = {
	case: _Output749;
	number: _Output751;
	"gender[psor]": _Output753;
	extPos: _Output755;
	foreign: _Output757;
	person: _Output758;
	polite: _Output760;
	poss: _Output762;
	pronType: _Output763;
	gender: _Output765;
	referenceNumber: _Output767;
};
type _Output745 = {
	unitKind: _Output746;
	language: _Output747;
	family: _Output101;
	kind: _Output102;
	canonicalForm: _Output624;
	coreFeatures: _Output748;
};
type _Output744 = { encounter: _Output97; lemma: _Output745 };
type _Output771 = "Lemma";
type _Output772 = "de";
type _Output774 = _Output632 | null;
type _Output775 = _Output634 | null;
type _Output777 = "Fem" | "Masc" | "Neut";
type _Output776 = _Output777 | null;
type _Output773 = { abbr: _Output774; foreign: _Output775; gender: _Output776 };
type _Output770 = {
	unitKind: _Output771;
	language: _Output772;
	family: _Output107;
	kind: _Output108;
	canonicalForm: _Output624;
	coreFeatures: _Output773;
};
type _Output769 = { encounter: _Output103; lemma: _Output770 };
type _Output780 = "Lemma";
type _Output781 = "de";
type _Output784 =
	| "Brck"
	| "Colo"
	| "Comm"
	| "Dash"
	| "Elip"
	| "Excl"
	| "Peri"
	| "Qest"
	| "Quot";
type _Output783 = _Output784 | null;
type _Output782 = { punctType: _Output783 };
type _Output779 = {
	unitKind: _Output780;
	language: _Output781;
	family: _Output113;
	kind: _Output114;
	canonicalForm: _Output624;
	coreFeatures: _Output782;
};
type _Output778 = { encounter: _Output109; lemma: _Output779 };
type _Output787 = "Lemma";
type _Output788 = "de";
type _Output791 = "Comp";
type _Output790 = _Output791 | null;
type _Output789 = { conjType: _Output790 };
type _Output786 = {
	unitKind: _Output787;
	language: _Output788;
	family: _Output119;
	kind: _Output120;
	canonicalForm: _Output624;
	coreFeatures: _Output789;
};
type _Output785 = { encounter: _Output115; lemma: _Output786 };
type _Output794 = "Lemma";
type _Output795 = "de";
type _Output797 = _Output634 | null;
type _Output799 = "Card" | "Range";
type _Output798 = _Output799 | null;
type _Output796 = { foreign: _Output797; numType: _Output798 };
type _Output793 = {
	unitKind: _Output794;
	language: _Output795;
	family: _Output125;
	kind: _Output126;
	canonicalForm: _Output624;
	coreFeatures: _Output796;
};
type _Output792 = { encounter: _Output121; lemma: _Output793 };
type _Output802 = "Lemma";
type _Output803 = "de";
type _Output806 = string;
type _Output805 = _Output806 | null;
type _Output808 = string;
type _Output807 = _Output808 | null;
type _Output810 = "Yes";
type _Output809 = _Output810 | null;
type _Output811 = _Output670 | null;
type _Output804 = {
	hasGovPrep: _Output805;
	hasSepPrefix: _Output807;
	lexicallyReflexive: _Output809;
	verbType: _Output811;
};
type _Output801 = {
	unitKind: _Output802;
	language: _Output803;
	family: _Output131;
	kind: _Output132;
	canonicalForm: _Output624;
	coreFeatures: _Output804;
};
type _Output800 = { encounter: _Output127; lemma: _Output801 };
type _Output814 = "Lemma";
type _Output815 = "de";
type _Output816 = Record<string, never>;
type _Output813 = {
	unitKind: _Output814;
	language: _Output815;
	family: _Output137;
	kind: _Output138;
	canonicalForm: _Output624;
	coreFeatures: _Output816;
};
type _Output812 = { encounter: _Output133; lemma: _Output813 };
type _Output819 = "Lemma";
type _Output820 = "de";
type _Output821 = Record<string, never>;
type _Output818 = {
	unitKind: _Output819;
	language: _Output820;
	family: _Output143;
	kind: _Output144;
	canonicalForm: _Output624;
	coreFeatures: _Output821;
};
type _Output817 = { encounter: _Output139; lemma: _Output818 };
type _Output824 = "Lemma";
type _Output825 = "de";
type _Output826 = Record<string, never>;
type _Output823 = {
	unitKind: _Output824;
	language: _Output825;
	family: _Output149;
	kind: _Output150;
	canonicalForm: _Output624;
	coreFeatures: _Output826;
};
type _Output822 = { encounter: _Output145; lemma: _Output823 };
type _Output829 = "Lemma";
type _Output830 = "de";
type _Output831 = Record<string, never>;
type _Output828 = {
	unitKind: _Output829;
	language: _Output830;
	family: _Output155;
	kind: _Output156;
	canonicalForm: _Output624;
	coreFeatures: _Output831;
};
type _Output827 = { encounter: _Output151; lemma: _Output828 };
type _Output834 = "Lemma";
type _Output835 = "de";
type _Output836 = Record<string, never>;
type _Output833 = {
	unitKind: _Output834;
	language: _Output835;
	family: _Output161;
	kind: _Output162;
	canonicalForm: _Output624;
	coreFeatures: _Output836;
};
type _Output832 = { encounter: _Output157; lemma: _Output833 };
type _Output839 = "Lemma";
type _Output840 = "de";
type _Output842 = _Output808 | null;
type _Output841 = { hasSepPrefix: _Output842 };
type _Output838 = {
	unitKind: _Output839;
	language: _Output840;
	family: _Output167;
	kind: _Output168;
	canonicalForm: _Output624;
	coreFeatures: _Output841;
};
type _Output837 = { encounter: _Output163; lemma: _Output838 };
type _Output845 = "Lemma";
type _Output846 = "de";
type _Output847 = Record<string, never>;
type _Output844 = {
	unitKind: _Output845;
	language: _Output846;
	family: _Output173;
	kind: _Output174;
	canonicalForm: _Output624;
	coreFeatures: _Output847;
};
type _Output843 = { encounter: _Output169; lemma: _Output844 };
type _Output850 = "Lemma";
type _Output851 = "de";
type _Output852 = Record<string, never>;
type _Output849 = {
	unitKind: _Output850;
	language: _Output851;
	family: _Output179;
	kind: _Output180;
	canonicalForm: _Output624;
	coreFeatures: _Output852;
};
type _Output848 = { encounter: _Output175; lemma: _Output849 };
type _Output855 = "Lemma";
type _Output856 = "de";
type _Output857 = Record<string, never>;
type _Output854 = {
	unitKind: _Output855;
	language: _Output856;
	family: _Output185;
	kind: _Output186;
	canonicalForm: _Output624;
	coreFeatures: _Output857;
};
type _Output853 = { encounter: _Output181; lemma: _Output854 };
type _Output860 = "Lemma";
type _Output861 = "de";
type _Output862 = Record<string, never>;
type _Output859 = {
	unitKind: _Output860;
	language: _Output861;
	family: _Output191;
	kind: _Output192;
	canonicalForm: _Output624;
	coreFeatures: _Output862;
};
type _Output858 = { encounter: _Output187; lemma: _Output859 };
type _Output865 = "Lemma";
type _Output866 = "de";
type _Output867 = Record<string, never>;
type _Output864 = {
	unitKind: _Output865;
	language: _Output866;
	family: _Output197;
	kind: _Output198;
	canonicalForm: _Output624;
	coreFeatures: _Output867;
};
type _Output863 = { encounter: _Output193; lemma: _Output864 };
type _Output870 = "Lemma";
type _Output871 = "de";
type _Output872 = Record<string, never>;
type _Output869 = {
	unitKind: _Output870;
	language: _Output871;
	family: _Output203;
	kind: _Output204;
	canonicalForm: _Output624;
	coreFeatures: _Output872;
};
type _Output868 = { encounter: _Output199; lemma: _Output869 };
type _Output875 = "Lemma";
type _Output876 = "de";
type _Output879 =
	| "Greeting"
	| "Farewell"
	| "Apology"
	| "Thanks"
	| "Acknowledgment"
	| "Refusal"
	| "Request"
	| "Reaction"
	| "Initiation"
	| "Transition";
type _Output878 = _Output879 | null;
type _Output877 = { discourseFormulaRole: _Output878 };
type _Output874 = {
	unitKind: _Output875;
	language: _Output876;
	family: _Output209;
	kind: _Output210;
	canonicalForm: _Output624;
	coreFeatures: _Output877;
};
type _Output873 = { encounter: _Output205; lemma: _Output874 };
type _Output882 = "Lemma";
type _Output883 = "de";
type _Output884 = Record<string, never>;
type _Output881 = {
	unitKind: _Output882;
	language: _Output883;
	family: _Output215;
	kind: _Output216;
	canonicalForm: _Output624;
	coreFeatures: _Output884;
};
type _Output880 = { encounter: _Output211; lemma: _Output881 };
type _Output887 = "Lemma";
type _Output888 = "de";
type _Output889 = Record<string, never>;
type _Output886 = {
	unitKind: _Output887;
	language: _Output888;
	family: _Output221;
	kind: _Output222;
	canonicalForm: _Output624;
	coreFeatures: _Output889;
};
type _Output885 = { encounter: _Output217; lemma: _Output886 };
type _Output892 = "Lemma";
type _Output893 = "en";
type _Output894 = Record<string, never>;
type _Output891 = {
	unitKind: _Output892;
	language: _Output893;
	family: _Output227;
	kind: _Output228;
	canonicalForm: _Output624;
	coreFeatures: _Output894;
};
type _Output890 = { encounter: _Output223; lemma: _Output891 };
type _Output897 = "Lemma";
type _Output898 = "en";
type _Output900 = _Output632 | null;
type _Output902 = "ADP" | "ADV" | "SCONJ";
type _Output901 = _Output902 | null;
type _Output904 = "Combi" | "Word";
type _Output903 = _Output904 | null;
type _Output906 = "Frac" | "Ord";
type _Output905 = _Output906 | null;
type _Output908 = "Expr";
type _Output907 = _Output908 | null;
type _Output899 = {
	abbr: _Output900;
	extPos: _Output901;
	numForm: _Output903;
	numType: _Output905;
	style: _Output907;
};
type _Output896 = {
	unitKind: _Output897;
	language: _Output898;
	family: _Output233;
	kind: _Output234;
	canonicalForm: _Output624;
	coreFeatures: _Output899;
};
type _Output895 = { encounter: _Output229; lemma: _Output896 };
type _Output911 = "Lemma";
type _Output912 = "en";
type _Output914 = _Output632 | null;
type _Output916 = "ADP" | "ADV" | "SCONJ";
type _Output915 = _Output916 | null;
type _Output913 = { abbr: _Output914; extPos: _Output915 };
type _Output910 = {
	unitKind: _Output911;
	language: _Output912;
	family: _Output239;
	kind: _Output240;
	canonicalForm: _Output624;
	coreFeatures: _Output913;
};
type _Output909 = { encounter: _Output235; lemma: _Output910 };
type _Output919 = "Lemma";
type _Output920 = "en";
type _Output922 = _Output632 | null;
type _Output924 = "ADP" | "ADV" | "CCONJ" | "SCONJ";
type _Output923 = _Output924 | null;
type _Output926 = "Word";
type _Output925 = _Output926 | null;
type _Output928 = "Frac" | "Mult" | "Ord";
type _Output927 = _Output928 | null;
type _Output931 = "Dem" | "Ind" | "Int" | "Neg" | "Rel" | "Tot";
type _Output932 = [_Output931, ...Array<_Output931>];
type _Output930 = _Output931 | _Output932;
type _Output929 = _Output930 | null;
type _Output934 = "Expr" | "Slng";
type _Output933 = _Output934 | null;
type _Output921 = {
	abbr: _Output922;
	extPos: _Output923;
	numForm: _Output925;
	numType: _Output927;
	pronType: _Output929;
	style: _Output933;
};
type _Output918 = {
	unitKind: _Output919;
	language: _Output920;
	family: _Output245;
	kind: _Output246;
	canonicalForm: _Output624;
	coreFeatures: _Output921;
};
type _Output917 = { encounter: _Output241; lemma: _Output918 };
type _Output937 = "Lemma";
type _Output938 = "en";
type _Output940 = _Output632 | null;
type _Output942 = "Arch" | "Vrnc";
type _Output941 = _Output942 | null;
type _Output939 = { abbr: _Output940; style: _Output941 };
type _Output936 = {
	unitKind: _Output937;
	language: _Output938;
	family: _Output251;
	kind: _Output252;
	canonicalForm: _Output624;
	coreFeatures: _Output939;
};
type _Output935 = { encounter: _Output247; lemma: _Output936 };
type _Output945 = "Lemma";
type _Output946 = "en";
type _Output948 = _Output632 | null;
type _Output950 = "Neg";
type _Output949 = _Output950 | null;
type _Output947 = { abbr: _Output948; polarity: _Output949 };
type _Output944 = {
	unitKind: _Output945;
	language: _Output946;
	family: _Output257;
	kind: _Output258;
	canonicalForm: _Output624;
	coreFeatures: _Output947;
};
type _Output943 = { encounter: _Output253; lemma: _Output944 };
type _Output953 = "Lemma";
type _Output954 = "en";
type _Output956 = _Output632 | null;
type _Output958 = "Def" | "Ind";
type _Output957 = _Output958 | null;
type _Output960 = "ADV" | "PRON";
type _Output959 = _Output960 | null;
type _Output962 = "Word";
type _Output961 = _Output962 | null;
type _Output964 = "Frac";
type _Output963 = _Output964 | null;
type _Output967 = "Art" | "Dem" | "Ind" | "Int" | "Neg" | "Rcp" | "Rel" | "Tot";
type _Output968 = [_Output967, ...Array<_Output967>];
type _Output966 = _Output967 | _Output968;
type _Output965 = _Output966 | null;
type _Output970 = "Vrnc";
type _Output969 = _Output970 | null;
type _Output955 = {
	abbr: _Output956;
	definite: _Output957;
	extPos: _Output959;
	numForm: _Output961;
	numType: _Output963;
	pronType: _Output965;
	style: _Output969;
};
type _Output952 = {
	unitKind: _Output953;
	language: _Output954;
	family: _Output263;
	kind: _Output264;
	canonicalForm: _Output624;
	coreFeatures: _Output955;
};
type _Output951 = { encounter: _Output259; lemma: _Output952 };
type _Output973 = "Lemma";
type _Output974 = "en";
type _Output976 = _Output632 | null;
type _Output977 = _Output634 | null;
type _Output979 = "Neg" | "Pos";
type _Output978 = _Output979 | null;
type _Output981 = "Expr";
type _Output980 = _Output981 | null;
type _Output975 = {
	abbr: _Output976;
	foreign: _Output977;
	polarity: _Output978;
	style: _Output980;
};
type _Output972 = {
	unitKind: _Output973;
	language: _Output974;
	family: _Output269;
	kind: _Output270;
	canonicalForm: _Output624;
	coreFeatures: _Output975;
};
type _Output971 = { encounter: _Output265; lemma: _Output972 };
type _Output984 = "Lemma";
type _Output985 = "en";
type _Output987 = _Output632 | null;
type _Output989 = "ADV" | "PROPN";
type _Output988 = _Output989 | null;
type _Output990 = _Output634 | null;
type _Output992 = "Combi" | "Digit" | "Word";
type _Output991 = _Output992 | null;
type _Output994 = "Card" | "Frac" | "Ord";
type _Output993 = _Output994 | null;
type _Output996 = "Expr" | "Vrnc";
type _Output995 = _Output996 | null;
type _Output986 = {
	abbr: _Output987;
	extPos: _Output988;
	foreign: _Output990;
	numForm: _Output991;
	numType: _Output993;
	style: _Output995;
};
type _Output983 = {
	unitKind: _Output984;
	language: _Output985;
	family: _Output275;
	kind: _Output276;
	canonicalForm: _Output624;
	coreFeatures: _Output986;
};
type _Output982 = { encounter: _Output271; lemma: _Output983 };
type _Output999 = "Lemma";
type _Output1000 = "en";
type _Output1002 = _Output632 | null;
type _Output1004 = "PROPN";
type _Output1003 = _Output1004 | null;
type _Output1006 = "Digit" | "Roman" | "Word";
type _Output1005 = _Output1006 | null;
type _Output1008 = "Card" | "Frac";
type _Output1007 = _Output1008 | null;
type _Output1001 = {
	abbr: _Output1002;
	extPos: _Output1003;
	numForm: _Output1005;
	numType: _Output1007;
};
type _Output998 = {
	unitKind: _Output999;
	language: _Output1000;
	family: _Output281;
	kind: _Output282;
	canonicalForm: _Output624;
	coreFeatures: _Output1001;
};
type _Output997 = { encounter: _Output277; lemma: _Output998 };
type _Output1011 = "Lemma";
type _Output1012 = "en";
type _Output1015 = "PROPN";
type _Output1014 = _Output1015 | null;
type _Output1016 = _Output634 | null;
type _Output1013 = { extPos: _Output1014; foreign: _Output1016 };
type _Output1010 = {
	unitKind: _Output1011;
	language: _Output1012;
	family: _Output287;
	kind: _Output288;
	canonicalForm: _Output624;
	coreFeatures: _Output1013;
};
type _Output1009 = { encounter: _Output283; lemma: _Output1010 };
type _Output1019 = "Lemma";
type _Output1020 = "en";
type _Output1022 = _Output632 | null;
type _Output1024 = "CCONJ";
type _Output1023 = _Output1024 | null;
type _Output1026 = "Neg";
type _Output1025 = _Output1026 | null;
type _Output1021 = {
	abbr: _Output1022;
	extPos: _Output1023;
	polarity: _Output1025;
};
type _Output1018 = {
	unitKind: _Output1019;
	language: _Output1020;
	family: _Output293;
	kind: _Output294;
	canonicalForm: _Output624;
	coreFeatures: _Output1021;
};
type _Output1017 = { encounter: _Output289; lemma: _Output1018 };
type _Output1029 = "Lemma";
type _Output1030 = "en";
type _Output1032 = _Output632 | null;
type _Output1034 = "ADV" | "PRON";
type _Output1033 = _Output1034 | null;
type _Output1036 = "1" | "2" | "3";
type _Output1035 = _Output1036 | null;
type _Output1037 = _Output695 | null;
type _Output1040 =
	| "Dem"
	| "Emp"
	| "Ind"
	| "Int"
	| "Neg"
	| "Prs"
	| "Rcp"
	| "Rel"
	| "Tot";
type _Output1041 = [_Output1040, ...Array<_Output1040>];
type _Output1039 = _Output1040 | _Output1041;
type _Output1038 = _Output1039 | null;
type _Output1043 = "Arch" | "Coll" | "Expr" | "Slng" | "Vrnc";
type _Output1042 = _Output1043 | null;
type _Output1031 = {
	abbr: _Output1032;
	extPos: _Output1033;
	person: _Output1035;
	poss: _Output1037;
	pronType: _Output1038;
	style: _Output1042;
};
type _Output1028 = {
	unitKind: _Output1029;
	language: _Output1030;
	family: _Output299;
	kind: _Output300;
	canonicalForm: _Output624;
	coreFeatures: _Output1031;
};
type _Output1027 = { encounter: _Output295; lemma: _Output1028 };
type _Output1046 = "Lemma";
type _Output1047 = "en";
type _Output1049 = _Output632 | null;
type _Output1051 = "PROPN";
type _Output1050 = _Output1051 | null;
type _Output1053 = "Expr";
type _Output1052 = _Output1053 | null;
type _Output1048 = {
	abbr: _Output1049;
	extPos: _Output1050;
	style: _Output1052;
};
type _Output1045 = {
	unitKind: _Output1046;
	language: _Output1047;
	family: _Output305;
	kind: _Output306;
	canonicalForm: _Output624;
	coreFeatures: _Output1048;
};
type _Output1044 = { encounter: _Output301; lemma: _Output1045 };
type _Output1056 = "Lemma";
type _Output1057 = "en";
type _Output1058 = Record<string, never>;
type _Output1055 = {
	unitKind: _Output1056;
	language: _Output1057;
	family: _Output311;
	kind: _Output312;
	canonicalForm: _Output624;
	coreFeatures: _Output1058;
};
type _Output1054 = { encounter: _Output307; lemma: _Output1055 };
type _Output1061 = "Lemma";
type _Output1062 = "en";
type _Output1064 = _Output632 | null;
type _Output1066 = "ADP" | "SCONJ";
type _Output1065 = _Output1066 | null;
type _Output1068 = "Vrnc";
type _Output1067 = _Output1068 | null;
type _Output1063 = {
	abbr: _Output1064;
	extPos: _Output1065;
	style: _Output1067;
};
type _Output1060 = {
	unitKind: _Output1061;
	language: _Output1062;
	family: _Output317;
	kind: _Output318;
	canonicalForm: _Output624;
	coreFeatures: _Output1063;
};
type _Output1059 = { encounter: _Output313; lemma: _Output1060 };
type _Output1071 = "Lemma";
type _Output1072 = "en";
type _Output1074 = _Output632 | null;
type _Output1076 = "ADP" | "PROPN";
type _Output1075 = _Output1076 | null;
type _Output1073 = { abbr: _Output1074; extPos: _Output1075 };
type _Output1070 = {
	unitKind: _Output1071;
	language: _Output1072;
	family: _Output323;
	kind: _Output324;
	canonicalForm: _Output624;
	coreFeatures: _Output1073;
};
type _Output1069 = { encounter: _Output319; lemma: _Output1070 };
type _Output1079 = "Lemma";
type _Output1080 = "en";
type _Output1082 = _Output632 | null;
type _Output1084 = "ADP" | "CCONJ" | "PROPN";
type _Output1083 = _Output1084 | null;
type _Output1085 = _Output806 | null;
type _Output1087 = "Yes";
type _Output1086 = _Output1087 | null;
type _Output1089 = "Expr" | "Vrnc";
type _Output1088 = _Output1089 | null;
type _Output1081 = {
	abbr: _Output1082;
	extPos: _Output1083;
	hasGovPrep: _Output1085;
	phrasal: _Output1086;
	style: _Output1088;
};
type _Output1078 = {
	unitKind: _Output1079;
	language: _Output1080;
	family: _Output329;
	kind: _Output330;
	canonicalForm: _Output624;
	coreFeatures: _Output1081;
};
type _Output1077 = { encounter: _Output325; lemma: _Output1078 };
type _Output1092 = "Lemma";
type _Output1093 = "en";
type _Output1094 = Record<string, never>;
type _Output1091 = {
	unitKind: _Output1092;
	language: _Output1093;
	family: _Output335;
	kind: _Output336;
	canonicalForm: _Output624;
	coreFeatures: _Output1094;
};
type _Output1090 = { encounter: _Output331; lemma: _Output1091 };
type _Output1097 = "Lemma";
type _Output1098 = "en";
type _Output1099 = Record<string, never>;
type _Output1096 = {
	unitKind: _Output1097;
	language: _Output1098;
	family: _Output341;
	kind: _Output342;
	canonicalForm: _Output624;
	coreFeatures: _Output1099;
};
type _Output1095 = { encounter: _Output337; lemma: _Output1096 };
type _Output1102 = "Lemma";
type _Output1103 = "en";
type _Output1104 = Record<string, never>;
type _Output1101 = {
	unitKind: _Output1102;
	language: _Output1103;
	family: _Output347;
	kind: _Output348;
	canonicalForm: _Output624;
	coreFeatures: _Output1104;
};
type _Output1100 = { encounter: _Output343; lemma: _Output1101 };
type _Output1107 = "Lemma";
type _Output1108 = "en";
type _Output1109 = Record<string, never>;
type _Output1106 = {
	unitKind: _Output1107;
	language: _Output1108;
	family: _Output353;
	kind: _Output354;
	canonicalForm: _Output624;
	coreFeatures: _Output1109;
};
type _Output1105 = { encounter: _Output349; lemma: _Output1106 };
type _Output1112 = "Lemma";
type _Output1113 = "en";
type _Output1114 = Record<string, never>;
type _Output1111 = {
	unitKind: _Output1112;
	language: _Output1113;
	family: _Output359;
	kind: _Output360;
	canonicalForm: _Output624;
	coreFeatures: _Output1114;
};
type _Output1110 = { encounter: _Output355; lemma: _Output1111 };
type _Output1117 = "Lemma";
type _Output1118 = "en";
type _Output1119 = Record<string, never>;
type _Output1116 = {
	unitKind: _Output1117;
	language: _Output1118;
	family: _Output365;
	kind: _Output366;
	canonicalForm: _Output624;
	coreFeatures: _Output1119;
};
type _Output1115 = { encounter: _Output361; lemma: _Output1116 };
type _Output1122 = "Lemma";
type _Output1123 = "en";
type _Output1124 = Record<string, never>;
type _Output1121 = {
	unitKind: _Output1122;
	language: _Output1123;
	family: _Output371;
	kind: _Output372;
	canonicalForm: _Output624;
	coreFeatures: _Output1124;
};
type _Output1120 = { encounter: _Output367; lemma: _Output1121 };
type _Output1127 = "Lemma";
type _Output1128 = "en";
type _Output1129 = Record<string, never>;
type _Output1126 = {
	unitKind: _Output1127;
	language: _Output1128;
	family: _Output377;
	kind: _Output378;
	canonicalForm: _Output624;
	coreFeatures: _Output1129;
};
type _Output1125 = { encounter: _Output373; lemma: _Output1126 };
type _Output1132 = "Lemma";
type _Output1133 = "en";
type _Output1134 = Record<string, never>;
type _Output1131 = {
	unitKind: _Output1132;
	language: _Output1133;
	family: _Output383;
	kind: _Output384;
	canonicalForm: _Output624;
	coreFeatures: _Output1134;
};
type _Output1130 = { encounter: _Output379; lemma: _Output1131 };
type _Output1137 = "Lemma";
type _Output1138 = "en";
type _Output1139 = Record<string, never>;
type _Output1136 = {
	unitKind: _Output1137;
	language: _Output1138;
	family: _Output389;
	kind: _Output390;
	canonicalForm: _Output624;
	coreFeatures: _Output1139;
};
type _Output1135 = { encounter: _Output385; lemma: _Output1136 };
type _Output1142 = "Lemma";
type _Output1143 = "en";
type _Output1144 = Record<string, never>;
type _Output1141 = {
	unitKind: _Output1142;
	language: _Output1143;
	family: _Output395;
	kind: _Output396;
	canonicalForm: _Output624;
	coreFeatures: _Output1144;
};
type _Output1140 = { encounter: _Output391; lemma: _Output1141 };
type _Output1147 = "Lemma";
type _Output1148 = "en";
type _Output1149 = Record<string, never>;
type _Output1146 = {
	unitKind: _Output1147;
	language: _Output1148;
	family: _Output401;
	kind: _Output402;
	canonicalForm: _Output624;
	coreFeatures: _Output1149;
};
type _Output1145 = { encounter: _Output397; lemma: _Output1146 };
type _Output1152 = "Lemma";
type _Output1153 = "en";
type _Output1155 = _Output879 | null;
type _Output1154 = { discourseFormulaRole: _Output1155 };
type _Output1151 = {
	unitKind: _Output1152;
	language: _Output1153;
	family: _Output407;
	kind: _Output408;
	canonicalForm: _Output624;
	coreFeatures: _Output1154;
};
type _Output1150 = { encounter: _Output403; lemma: _Output1151 };
type _Output1158 = "Lemma";
type _Output1159 = "en";
type _Output1160 = Record<string, never>;
type _Output1157 = {
	unitKind: _Output1158;
	language: _Output1159;
	family: _Output413;
	kind: _Output414;
	canonicalForm: _Output624;
	coreFeatures: _Output1160;
};
type _Output1156 = { encounter: _Output409; lemma: _Output1157 };
type _Output1163 = "Lemma";
type _Output1164 = "en";
type _Output1165 = Record<string, never>;
type _Output1162 = {
	unitKind: _Output1163;
	language: _Output1164;
	family: _Output419;
	kind: _Output420;
	canonicalForm: _Output624;
	coreFeatures: _Output1165;
};
type _Output1161 = { encounter: _Output415; lemma: _Output1162 };
type _Output1168 = "Lemma";
type _Output1169 = "he";
type _Output1170 = Record<string, never>;
type _Output1167 = {
	unitKind: _Output1168;
	language: _Output1169;
	family: _Output425;
	kind: _Output426;
	canonicalForm: _Output624;
	coreFeatures: _Output1170;
};
type _Output1166 = { encounter: _Output421; lemma: _Output1167 };
type _Output1173 = "Lemma";
type _Output1174 = "he";
type _Output1176 = _Output632 | null;
type _Output1175 = { abbr: _Output1176 };
type _Output1172 = {
	unitKind: _Output1173;
	language: _Output1174;
	family: _Output431;
	kind: _Output432;
	canonicalForm: _Output624;
	coreFeatures: _Output1175;
};
type _Output1171 = { encounter: _Output427; lemma: _Output1172 };
type _Output1179 = "Lemma";
type _Output1180 = "he";
type _Output1182 = _Output632 | null;
type _Output1184 = "Acc" | "Gen";
type _Output1183 = _Output1184 | null;
type _Output1181 = { abbr: _Output1182; case: _Output1183 };
type _Output1178 = {
	unitKind: _Output1179;
	language: _Output1180;
	family: _Output437;
	kind: _Output438;
	canonicalForm: _Output624;
	coreFeatures: _Output1181;
};
type _Output1177 = { encounter: _Output433; lemma: _Output1178 };
type _Output1187 = "Lemma";
type _Output1188 = "he";
type _Output1191 = "Yes";
type _Output1190 = _Output1191 | null;
type _Output1189 = { prefix: _Output1190 };
type _Output1186 = {
	unitKind: _Output1187;
	language: _Output1188;
	family: _Output443;
	kind: _Output444;
	canonicalForm: _Output624;
	coreFeatures: _Output1189;
};
type _Output1185 = { encounter: _Output439; lemma: _Output1186 };
type _Output1194 = "Lemma";
type _Output1195 = "he";
type _Output1198 = "Cop" | "Mod";
type _Output1197 = _Output1198 | null;
type _Output1196 = { verbType: _Output1197 };
type _Output1193 = {
	unitKind: _Output1194;
	language: _Output1195;
	family: _Output449;
	kind: _Output450;
	canonicalForm: _Output624;
	coreFeatures: _Output1196;
};
type _Output1192 = { encounter: _Output445; lemma: _Output1193 };
type _Output1201 = "Lemma";
type _Output1202 = "he";
type _Output1203 = Record<string, never>;
type _Output1200 = {
	unitKind: _Output1201;
	language: _Output1202;
	family: _Output455;
	kind: _Output456;
	canonicalForm: _Output624;
	coreFeatures: _Output1203;
};
type _Output1199 = { encounter: _Output451; lemma: _Output1200 };
type _Output1206 = "Lemma";
type _Output1207 = "he";
type _Output1210 = "Art" | "Int";
type _Output1209 = _Output1210 | null;
type _Output1208 = { pronType: _Output1209 };
type _Output1205 = {
	unitKind: _Output1206;
	language: _Output1207;
	family: _Output461;
	kind: _Output462;
	canonicalForm: _Output624;
	coreFeatures: _Output1208;
};
type _Output1204 = { encounter: _Output457; lemma: _Output1205 };
type _Output1213 = "Lemma";
type _Output1214 = "he";
type _Output1215 = Record<string, never>;
type _Output1212 = {
	unitKind: _Output1213;
	language: _Output1214;
	family: _Output467;
	kind: _Output468;
	canonicalForm: _Output624;
	coreFeatures: _Output1215;
};
type _Output1211 = { encounter: _Output463; lemma: _Output1212 };
type _Output1218 = "Lemma";
type _Output1219 = "he";
type _Output1221 = _Output632 | null;
type _Output1224 = "Fem" | "Masc";
type _Output1225 = [_Output1224, ...Array<_Output1224>];
type _Output1223 = _Output1224 | _Output1225;
type _Output1222 = _Output1223 | null;
type _Output1220 = { abbr: _Output1221; gender: _Output1222 };
type _Output1217 = {
	unitKind: _Output1218;
	language: _Output1219;
	family: _Output473;
	kind: _Output474;
	canonicalForm: _Output624;
	coreFeatures: _Output1220;
};
type _Output1216 = { encounter: _Output469; lemma: _Output1217 };
type _Output1228 = "Lemma";
type _Output1229 = "he";
type _Output1230 = Record<string, never>;
type _Output1227 = {
	unitKind: _Output1228;
	language: _Output1229;
	family: _Output479;
	kind: _Output480;
	canonicalForm: _Output624;
	coreFeatures: _Output1230;
};
type _Output1226 = { encounter: _Output475; lemma: _Output1227 };
type _Output1233 = "Lemma";
type _Output1234 = "he";
type _Output1235 = Record<string, never>;
type _Output1232 = {
	unitKind: _Output1233;
	language: _Output1234;
	family: _Output485;
	kind: _Output486;
	canonicalForm: _Output624;
	coreFeatures: _Output1235;
};
type _Output1231 = { encounter: _Output481; lemma: _Output1232 };
type _Output1238 = "Lemma";
type _Output1239 = "he";
type _Output1240 = Record<string, never>;
type _Output1237 = {
	unitKind: _Output1238;
	language: _Output1239;
	family: _Output491;
	kind: _Output492;
	canonicalForm: _Output624;
	coreFeatures: _Output1240;
};
type _Output1236 = { encounter: _Output487; lemma: _Output1237 };
type _Output1243 = "Lemma";
type _Output1244 = "he";
type _Output1247 = "Def";
type _Output1246 = _Output1247 | null;
type _Output1249 = "Dem" | "Ind" | "Int" | "Prs";
type _Output1248 = _Output1249 | null;
type _Output1251 = "Yes";
type _Output1250 = _Output1251 | null;
type _Output1245 = {
	definite: _Output1246;
	pronType: _Output1248;
	reflex: _Output1250;
};
type _Output1242 = {
	unitKind: _Output1243;
	language: _Output1244;
	family: _Output497;
	kind: _Output498;
	canonicalForm: _Output624;
	coreFeatures: _Output1245;
};
type _Output1241 = { encounter: _Output493; lemma: _Output1242 };
type _Output1254 = "Lemma";
type _Output1255 = "he";
type _Output1257 = _Output632 | null;
type _Output1260 = "Fem" | "Masc";
type _Output1261 = [_Output1260, ...Array<_Output1260>];
type _Output1259 = _Output1260 | _Output1261;
type _Output1258 = _Output1259 | null;
type _Output1256 = { abbr: _Output1257; gender: _Output1258 };
type _Output1253 = {
	unitKind: _Output1254;
	language: _Output1255;
	family: _Output503;
	kind: _Output504;
	canonicalForm: _Output624;
	coreFeatures: _Output1256;
};
type _Output1252 = { encounter: _Output499; lemma: _Output1253 };
type _Output1264 = "Lemma";
type _Output1265 = "he";
type _Output1266 = Record<string, never>;
type _Output1263 = {
	unitKind: _Output1264;
	language: _Output1265;
	family: _Output509;
	kind: _Output510;
	canonicalForm: _Output624;
	coreFeatures: _Output1266;
};
type _Output1262 = { encounter: _Output505; lemma: _Output1263 };
type _Output1269 = "Lemma";
type _Output1270 = "he";
type _Output1273 = "Tem";
type _Output1272 = _Output1273 | null;
type _Output1271 = { case: _Output1272 };
type _Output1268 = {
	unitKind: _Output1269;
	language: _Output1270;
	family: _Output515;
	kind: _Output516;
	canonicalForm: _Output624;
	coreFeatures: _Output1271;
};
type _Output1267 = { encounter: _Output511; lemma: _Output1268 };
type _Output1276 = "Lemma";
type _Output1277 = "he";
type _Output1278 = Record<string, never>;
type _Output1275 = {
	unitKind: _Output1276;
	language: _Output1277;
	family: _Output521;
	kind: _Output522;
	canonicalForm: _Output624;
	coreFeatures: _Output1278;
};
type _Output1274 = { encounter: _Output517; lemma: _Output1275 };
type _Output1281 = "Lemma";
type _Output1282 = "he";
type _Output1285 =
	| "HIFIL"
	| "HITPAEL"
	| "HUFAL"
	| "NIFAL"
	| "PAAL"
	| "PIEL"
	| "PUAL";
type _Output1284 = _Output1285 | null;
type _Output1287 = "Yes";
type _Output1286 = _Output1287 | null;
type _Output1283 = { hebBinyan: _Output1284; hebExistential: _Output1286 };
type _Output1280 = {
	unitKind: _Output1281;
	language: _Output1282;
	family: _Output527;
	kind: _Output528;
	canonicalForm: _Output624;
	coreFeatures: _Output1283;
};
type _Output1279 = { encounter: _Output523; lemma: _Output1280 };
type _Output1290 = "Lemma";
type _Output1291 = "he";
type _Output1292 = Record<string, never>;
type _Output1289 = {
	unitKind: _Output1290;
	language: _Output1291;
	family: _Output533;
	kind: _Output534;
	canonicalForm: _Output624;
	coreFeatures: _Output1292;
};
type _Output1288 = { encounter: _Output529; lemma: _Output1289 };
type _Output1295 = "Lemma";
type _Output1296 = "he";
type _Output1297 = Record<string, never>;
type _Output1294 = {
	unitKind: _Output1295;
	language: _Output1296;
	family: _Output539;
	kind: _Output540;
	canonicalForm: _Output624;
	coreFeatures: _Output1297;
};
type _Output1293 = { encounter: _Output535; lemma: _Output1294 };
type _Output1300 = "Lemma";
type _Output1301 = "he";
type _Output1302 = Record<string, never>;
type _Output1299 = {
	unitKind: _Output1300;
	language: _Output1301;
	family: _Output545;
	kind: _Output546;
	canonicalForm: _Output624;
	coreFeatures: _Output1302;
};
type _Output1298 = { encounter: _Output541; lemma: _Output1299 };
type _Output1305 = "Lemma";
type _Output1306 = "he";
type _Output1307 = Record<string, never>;
type _Output1304 = {
	unitKind: _Output1305;
	language: _Output1306;
	family: _Output551;
	kind: _Output552;
	canonicalForm: _Output624;
	coreFeatures: _Output1307;
};
type _Output1303 = { encounter: _Output547; lemma: _Output1304 };
type _Output1310 = "Lemma";
type _Output1311 = "he";
type _Output1312 = Record<string, never>;
type _Output1309 = {
	unitKind: _Output1310;
	language: _Output1311;
	family: _Output557;
	kind: _Output558;
	canonicalForm: _Output624;
	coreFeatures: _Output1312;
};
type _Output1308 = { encounter: _Output553; lemma: _Output1309 };
type _Output1315 = "Lemma";
type _Output1316 = "he";
type _Output1317 = Record<string, never>;
type _Output1314 = {
	unitKind: _Output1315;
	language: _Output1316;
	family: _Output563;
	kind: _Output564;
	canonicalForm: _Output624;
	coreFeatures: _Output1317;
};
type _Output1313 = { encounter: _Output559; lemma: _Output1314 };
type _Output1320 = "Lemma";
type _Output1321 = "he";
type _Output1322 = Record<string, never>;
type _Output1319 = {
	unitKind: _Output1320;
	language: _Output1321;
	family: _Output569;
	kind: _Output570;
	canonicalForm: _Output624;
	coreFeatures: _Output1322;
};
type _Output1318 = { encounter: _Output565; lemma: _Output1319 };
type _Output1325 = "Lemma";
type _Output1326 = "he";
type _Output1327 = Record<string, never>;
type _Output1324 = {
	unitKind: _Output1325;
	language: _Output1326;
	family: _Output575;
	kind: _Output576;
	canonicalForm: _Output624;
	coreFeatures: _Output1327;
};
type _Output1323 = { encounter: _Output571; lemma: _Output1324 };
type _Output1330 = "Lemma";
type _Output1331 = "he";
type _Output1332 = Record<string, never>;
type _Output1329 = {
	unitKind: _Output1330;
	language: _Output1331;
	family: _Output581;
	kind: _Output582;
	canonicalForm: _Output624;
	coreFeatures: _Output1332;
};
type _Output1328 = { encounter: _Output577; lemma: _Output1329 };
type _Output1335 = "Lemma";
type _Output1336 = "he";
type _Output1337 = Record<string, never>;
type _Output1334 = {
	unitKind: _Output1335;
	language: _Output1336;
	family: _Output587;
	kind: _Output588;
	canonicalForm: _Output624;
	coreFeatures: _Output1337;
};
type _Output1333 = { encounter: _Output583; lemma: _Output1334 };
type _Output1340 = "Lemma";
type _Output1341 = "he";
type _Output1342 = Record<string, never>;
type _Output1339 = {
	unitKind: _Output1340;
	language: _Output1341;
	family: _Output593;
	kind: _Output594;
	canonicalForm: _Output624;
	coreFeatures: _Output1342;
};
type _Output1338 = { encounter: _Output589; lemma: _Output1339 };
type _Output1345 = "Lemma";
type _Output1346 = "he";
type _Output1347 = Record<string, never>;
type _Output1344 = {
	unitKind: _Output1345;
	language: _Output1346;
	family: _Output599;
	kind: _Output600;
	canonicalForm: _Output624;
	coreFeatures: _Output1347;
};
type _Output1343 = { encounter: _Output595; lemma: _Output1344 };
type _Output1350 = "Lemma";
type _Output1351 = "he";
type _Output1352 = Record<string, never>;
type _Output1349 = {
	unitKind: _Output1350;
	language: _Output1351;
	family: _Output605;
	kind: _Output606;
	canonicalForm: _Output624;
	coreFeatures: _Output1352;
};
type _Output1348 = { encounter: _Output601; lemma: _Output1349 };
type _Output1355 = "Lemma";
type _Output1356 = "he";
type _Output1357 = Record<string, never>;
type _Output1354 = {
	unitKind: _Output1355;
	language: _Output1356;
	family: _Output611;
	kind: _Output612;
	canonicalForm: _Output624;
	coreFeatures: _Output1357;
};
type _Output1353 = { encounter: _Output607; lemma: _Output1354 };
type _Output1360 = "Lemma";
type _Output1361 = "he";
type _Output1362 = Record<string, never>;
type _Output1359 = {
	unitKind: _Output1360;
	language: _Output1361;
	family: _Output617;
	kind: _Output618;
	canonicalForm: _Output624;
	coreFeatures: _Output1362;
};
type _Output1358 = { encounter: _Output613; lemma: _Output1359 };
type _Output619 =
	| _Output620
	| _Output626
	| _Output639
	| _Output654
	| _Output664
	| _Output671
	| _Output678
	| _Output698
	| _Output705
	| _Output714
	| _Output723
	| _Output733
	| _Output744
	| _Output769
	| _Output778
	| _Output785
	| _Output792
	| _Output800
	| _Output812
	| _Output817
	| _Output822
	| _Output827
	| _Output832
	| _Output837
	| _Output843
	| _Output848
	| _Output853
	| _Output858
	| _Output863
	| _Output868
	| _Output873
	| _Output880
	| _Output885
	| _Output890
	| _Output895
	| _Output909
	| _Output917
	| _Output935
	| _Output943
	| _Output951
	| _Output971
	| _Output982
	| _Output997
	| _Output1009
	| _Output1017
	| _Output1027
	| _Output1044
	| _Output1054
	| _Output1059
	| _Output1069
	| _Output1077
	| _Output1090
	| _Output1095
	| _Output1100
	| _Output1105
	| _Output1110
	| _Output1115
	| _Output1120
	| _Output1125
	| _Output1130
	| _Output1135
	| _Output1140
	| _Output1145
	| _Output1150
	| _Output1156
	| _Output1161
	| _Output1166
	| _Output1171
	| _Output1177
	| _Output1185
	| _Output1192
	| _Output1199
	| _Output1204
	| _Output1211
	| _Output1216
	| _Output1226
	| _Output1231
	| _Output1236
	| _Output1241
	| _Output1252
	| _Output1262
	| _Output1267
	| _Output1274
	| _Output1279
	| _Output1288
	| _Output1293
	| _Output1298
	| _Output1303
	| _Output1308
	| _Output1313
	| _Output1318
	| _Output1323
	| _Output1328
	| _Output1333
	| _Output1338
	| _Output1343
	| _Output1348
	| _Output1353
	| _Output1358;
type _Output1366 = string;
type _Output1365 = [_Output1366, ...Array<_Output1366>];
type _Output1364 = {
	encounter: _Output23;
	lemma: _Output621;
	candidates: _Output1365;
};
type _Output1368 = [_Output1366, ...Array<_Output1366>];
type _Output1367 = {
	encounter: _Output31;
	lemma: _Output627;
	candidates: _Output1368;
};
type _Output1370 = [_Output1366, ...Array<_Output1366>];
type _Output1369 = {
	encounter: _Output37;
	lemma: _Output640;
	candidates: _Output1370;
};
type _Output1372 = [_Output1366, ...Array<_Output1366>];
type _Output1371 = {
	encounter: _Output43;
	lemma: _Output655;
	candidates: _Output1372;
};
type _Output1374 = [_Output1366, ...Array<_Output1366>];
type _Output1373 = {
	encounter: _Output49;
	lemma: _Output665;
	candidates: _Output1374;
};
type _Output1376 = [_Output1366, ...Array<_Output1366>];
type _Output1375 = {
	encounter: _Output55;
	lemma: _Output672;
	candidates: _Output1376;
};
type _Output1378 = [_Output1366, ...Array<_Output1366>];
type _Output1377 = {
	encounter: _Output61;
	lemma: _Output679;
	candidates: _Output1378;
};
type _Output1380 = [_Output1366, ...Array<_Output1366>];
type _Output1379 = {
	encounter: _Output67;
	lemma: _Output699;
	candidates: _Output1380;
};
type _Output1382 = [_Output1366, ...Array<_Output1366>];
type _Output1381 = {
	encounter: _Output73;
	lemma: _Output706;
	candidates: _Output1382;
};
type _Output1384 = [_Output1366, ...Array<_Output1366>];
type _Output1383 = {
	encounter: _Output79;
	lemma: _Output715;
	candidates: _Output1384;
};
type _Output1386 = [_Output1366, ...Array<_Output1366>];
type _Output1385 = {
	encounter: _Output85;
	lemma: _Output724;
	candidates: _Output1386;
};
type _Output1388 = [_Output1366, ...Array<_Output1366>];
type _Output1387 = {
	encounter: _Output91;
	lemma: _Output734;
	candidates: _Output1388;
};
type _Output1390 = [_Output1366, ...Array<_Output1366>];
type _Output1389 = {
	encounter: _Output97;
	lemma: _Output745;
	candidates: _Output1390;
};
type _Output1392 = [_Output1366, ...Array<_Output1366>];
type _Output1391 = {
	encounter: _Output103;
	lemma: _Output770;
	candidates: _Output1392;
};
type _Output1394 = [_Output1366, ...Array<_Output1366>];
type _Output1393 = {
	encounter: _Output109;
	lemma: _Output779;
	candidates: _Output1394;
};
type _Output1396 = [_Output1366, ...Array<_Output1366>];
type _Output1395 = {
	encounter: _Output115;
	lemma: _Output786;
	candidates: _Output1396;
};
type _Output1398 = [_Output1366, ...Array<_Output1366>];
type _Output1397 = {
	encounter: _Output121;
	lemma: _Output793;
	candidates: _Output1398;
};
type _Output1400 = [_Output1366, ...Array<_Output1366>];
type _Output1399 = {
	encounter: _Output127;
	lemma: _Output801;
	candidates: _Output1400;
};
type _Output1402 = [_Output1366, ...Array<_Output1366>];
type _Output1401 = {
	encounter: _Output133;
	lemma: _Output813;
	candidates: _Output1402;
};
type _Output1404 = [_Output1366, ...Array<_Output1366>];
type _Output1403 = {
	encounter: _Output139;
	lemma: _Output818;
	candidates: _Output1404;
};
type _Output1406 = [_Output1366, ...Array<_Output1366>];
type _Output1405 = {
	encounter: _Output145;
	lemma: _Output823;
	candidates: _Output1406;
};
type _Output1408 = [_Output1366, ...Array<_Output1366>];
type _Output1407 = {
	encounter: _Output151;
	lemma: _Output828;
	candidates: _Output1408;
};
type _Output1410 = [_Output1366, ...Array<_Output1366>];
type _Output1409 = {
	encounter: _Output157;
	lemma: _Output833;
	candidates: _Output1410;
};
type _Output1412 = [_Output1366, ...Array<_Output1366>];
type _Output1411 = {
	encounter: _Output163;
	lemma: _Output838;
	candidates: _Output1412;
};
type _Output1414 = [_Output1366, ...Array<_Output1366>];
type _Output1413 = {
	encounter: _Output169;
	lemma: _Output844;
	candidates: _Output1414;
};
type _Output1416 = [_Output1366, ...Array<_Output1366>];
type _Output1415 = {
	encounter: _Output175;
	lemma: _Output849;
	candidates: _Output1416;
};
type _Output1418 = [_Output1366, ...Array<_Output1366>];
type _Output1417 = {
	encounter: _Output181;
	lemma: _Output854;
	candidates: _Output1418;
};
type _Output1420 = [_Output1366, ...Array<_Output1366>];
type _Output1419 = {
	encounter: _Output187;
	lemma: _Output859;
	candidates: _Output1420;
};
type _Output1422 = [_Output1366, ...Array<_Output1366>];
type _Output1421 = {
	encounter: _Output193;
	lemma: _Output864;
	candidates: _Output1422;
};
type _Output1424 = [_Output1366, ...Array<_Output1366>];
type _Output1423 = {
	encounter: _Output199;
	lemma: _Output869;
	candidates: _Output1424;
};
type _Output1426 = [_Output1366, ...Array<_Output1366>];
type _Output1425 = {
	encounter: _Output205;
	lemma: _Output874;
	candidates: _Output1426;
};
type _Output1428 = [_Output1366, ...Array<_Output1366>];
type _Output1427 = {
	encounter: _Output211;
	lemma: _Output881;
	candidates: _Output1428;
};
type _Output1430 = [_Output1366, ...Array<_Output1366>];
type _Output1429 = {
	encounter: _Output217;
	lemma: _Output886;
	candidates: _Output1430;
};
type _Output1432 = [_Output1366, ...Array<_Output1366>];
type _Output1431 = {
	encounter: _Output223;
	lemma: _Output891;
	candidates: _Output1432;
};
type _Output1434 = [_Output1366, ...Array<_Output1366>];
type _Output1433 = {
	encounter: _Output229;
	lemma: _Output896;
	candidates: _Output1434;
};
type _Output1436 = [_Output1366, ...Array<_Output1366>];
type _Output1435 = {
	encounter: _Output235;
	lemma: _Output910;
	candidates: _Output1436;
};
type _Output1438 = [_Output1366, ...Array<_Output1366>];
type _Output1437 = {
	encounter: _Output241;
	lemma: _Output918;
	candidates: _Output1438;
};
type _Output1440 = [_Output1366, ...Array<_Output1366>];
type _Output1439 = {
	encounter: _Output247;
	lemma: _Output936;
	candidates: _Output1440;
};
type _Output1442 = [_Output1366, ...Array<_Output1366>];
type _Output1441 = {
	encounter: _Output253;
	lemma: _Output944;
	candidates: _Output1442;
};
type _Output1444 = [_Output1366, ...Array<_Output1366>];
type _Output1443 = {
	encounter: _Output259;
	lemma: _Output952;
	candidates: _Output1444;
};
type _Output1446 = [_Output1366, ...Array<_Output1366>];
type _Output1445 = {
	encounter: _Output265;
	lemma: _Output972;
	candidates: _Output1446;
};
type _Output1448 = [_Output1366, ...Array<_Output1366>];
type _Output1447 = {
	encounter: _Output271;
	lemma: _Output983;
	candidates: _Output1448;
};
type _Output1450 = [_Output1366, ...Array<_Output1366>];
type _Output1449 = {
	encounter: _Output277;
	lemma: _Output998;
	candidates: _Output1450;
};
type _Output1452 = [_Output1366, ...Array<_Output1366>];
type _Output1451 = {
	encounter: _Output283;
	lemma: _Output1010;
	candidates: _Output1452;
};
type _Output1454 = [_Output1366, ...Array<_Output1366>];
type _Output1453 = {
	encounter: _Output289;
	lemma: _Output1018;
	candidates: _Output1454;
};
type _Output1456 = [_Output1366, ...Array<_Output1366>];
type _Output1455 = {
	encounter: _Output295;
	lemma: _Output1028;
	candidates: _Output1456;
};
type _Output1458 = [_Output1366, ...Array<_Output1366>];
type _Output1457 = {
	encounter: _Output301;
	lemma: _Output1045;
	candidates: _Output1458;
};
type _Output1460 = [_Output1366, ...Array<_Output1366>];
type _Output1459 = {
	encounter: _Output307;
	lemma: _Output1055;
	candidates: _Output1460;
};
type _Output1462 = [_Output1366, ...Array<_Output1366>];
type _Output1461 = {
	encounter: _Output313;
	lemma: _Output1060;
	candidates: _Output1462;
};
type _Output1464 = [_Output1366, ...Array<_Output1366>];
type _Output1463 = {
	encounter: _Output319;
	lemma: _Output1070;
	candidates: _Output1464;
};
type _Output1466 = [_Output1366, ...Array<_Output1366>];
type _Output1465 = {
	encounter: _Output325;
	lemma: _Output1078;
	candidates: _Output1466;
};
type _Output1468 = [_Output1366, ...Array<_Output1366>];
type _Output1467 = {
	encounter: _Output331;
	lemma: _Output1091;
	candidates: _Output1468;
};
type _Output1470 = [_Output1366, ...Array<_Output1366>];
type _Output1469 = {
	encounter: _Output337;
	lemma: _Output1096;
	candidates: _Output1470;
};
type _Output1472 = [_Output1366, ...Array<_Output1366>];
type _Output1471 = {
	encounter: _Output343;
	lemma: _Output1101;
	candidates: _Output1472;
};
type _Output1474 = [_Output1366, ...Array<_Output1366>];
type _Output1473 = {
	encounter: _Output349;
	lemma: _Output1106;
	candidates: _Output1474;
};
type _Output1476 = [_Output1366, ...Array<_Output1366>];
type _Output1475 = {
	encounter: _Output355;
	lemma: _Output1111;
	candidates: _Output1476;
};
type _Output1478 = [_Output1366, ...Array<_Output1366>];
type _Output1477 = {
	encounter: _Output361;
	lemma: _Output1116;
	candidates: _Output1478;
};
type _Output1480 = [_Output1366, ...Array<_Output1366>];
type _Output1479 = {
	encounter: _Output367;
	lemma: _Output1121;
	candidates: _Output1480;
};
type _Output1482 = [_Output1366, ...Array<_Output1366>];
type _Output1481 = {
	encounter: _Output373;
	lemma: _Output1126;
	candidates: _Output1482;
};
type _Output1484 = [_Output1366, ...Array<_Output1366>];
type _Output1483 = {
	encounter: _Output379;
	lemma: _Output1131;
	candidates: _Output1484;
};
type _Output1486 = [_Output1366, ...Array<_Output1366>];
type _Output1485 = {
	encounter: _Output385;
	lemma: _Output1136;
	candidates: _Output1486;
};
type _Output1488 = [_Output1366, ...Array<_Output1366>];
type _Output1487 = {
	encounter: _Output391;
	lemma: _Output1141;
	candidates: _Output1488;
};
type _Output1490 = [_Output1366, ...Array<_Output1366>];
type _Output1489 = {
	encounter: _Output397;
	lemma: _Output1146;
	candidates: _Output1490;
};
type _Output1492 = [_Output1366, ...Array<_Output1366>];
type _Output1491 = {
	encounter: _Output403;
	lemma: _Output1151;
	candidates: _Output1492;
};
type _Output1494 = [_Output1366, ...Array<_Output1366>];
type _Output1493 = {
	encounter: _Output409;
	lemma: _Output1157;
	candidates: _Output1494;
};
type _Output1496 = [_Output1366, ...Array<_Output1366>];
type _Output1495 = {
	encounter: _Output415;
	lemma: _Output1162;
	candidates: _Output1496;
};
type _Output1498 = [_Output1366, ...Array<_Output1366>];
type _Output1497 = {
	encounter: _Output421;
	lemma: _Output1167;
	candidates: _Output1498;
};
type _Output1500 = [_Output1366, ...Array<_Output1366>];
type _Output1499 = {
	encounter: _Output427;
	lemma: _Output1172;
	candidates: _Output1500;
};
type _Output1502 = [_Output1366, ...Array<_Output1366>];
type _Output1501 = {
	encounter: _Output433;
	lemma: _Output1178;
	candidates: _Output1502;
};
type _Output1504 = [_Output1366, ...Array<_Output1366>];
type _Output1503 = {
	encounter: _Output439;
	lemma: _Output1186;
	candidates: _Output1504;
};
type _Output1506 = [_Output1366, ...Array<_Output1366>];
type _Output1505 = {
	encounter: _Output445;
	lemma: _Output1193;
	candidates: _Output1506;
};
type _Output1508 = [_Output1366, ...Array<_Output1366>];
type _Output1507 = {
	encounter: _Output451;
	lemma: _Output1200;
	candidates: _Output1508;
};
type _Output1510 = [_Output1366, ...Array<_Output1366>];
type _Output1509 = {
	encounter: _Output457;
	lemma: _Output1205;
	candidates: _Output1510;
};
type _Output1512 = [_Output1366, ...Array<_Output1366>];
type _Output1511 = {
	encounter: _Output463;
	lemma: _Output1212;
	candidates: _Output1512;
};
type _Output1514 = [_Output1366, ...Array<_Output1366>];
type _Output1513 = {
	encounter: _Output469;
	lemma: _Output1217;
	candidates: _Output1514;
};
type _Output1516 = [_Output1366, ...Array<_Output1366>];
type _Output1515 = {
	encounter: _Output475;
	lemma: _Output1227;
	candidates: _Output1516;
};
type _Output1518 = [_Output1366, ...Array<_Output1366>];
type _Output1517 = {
	encounter: _Output481;
	lemma: _Output1232;
	candidates: _Output1518;
};
type _Output1520 = [_Output1366, ...Array<_Output1366>];
type _Output1519 = {
	encounter: _Output487;
	lemma: _Output1237;
	candidates: _Output1520;
};
type _Output1522 = [_Output1366, ...Array<_Output1366>];
type _Output1521 = {
	encounter: _Output493;
	lemma: _Output1242;
	candidates: _Output1522;
};
type _Output1524 = [_Output1366, ...Array<_Output1366>];
type _Output1523 = {
	encounter: _Output499;
	lemma: _Output1253;
	candidates: _Output1524;
};
type _Output1526 = [_Output1366, ...Array<_Output1366>];
type _Output1525 = {
	encounter: _Output505;
	lemma: _Output1263;
	candidates: _Output1526;
};
type _Output1528 = [_Output1366, ...Array<_Output1366>];
type _Output1527 = {
	encounter: _Output511;
	lemma: _Output1268;
	candidates: _Output1528;
};
type _Output1530 = [_Output1366, ...Array<_Output1366>];
type _Output1529 = {
	encounter: _Output517;
	lemma: _Output1275;
	candidates: _Output1530;
};
type _Output1532 = [_Output1366, ...Array<_Output1366>];
type _Output1531 = {
	encounter: _Output523;
	lemma: _Output1280;
	candidates: _Output1532;
};
type _Output1534 = [_Output1366, ...Array<_Output1366>];
type _Output1533 = {
	encounter: _Output529;
	lemma: _Output1289;
	candidates: _Output1534;
};
type _Output1536 = [_Output1366, ...Array<_Output1366>];
type _Output1535 = {
	encounter: _Output535;
	lemma: _Output1294;
	candidates: _Output1536;
};
type _Output1538 = [_Output1366, ...Array<_Output1366>];
type _Output1537 = {
	encounter: _Output541;
	lemma: _Output1299;
	candidates: _Output1538;
};
type _Output1540 = [_Output1366, ...Array<_Output1366>];
type _Output1539 = {
	encounter: _Output547;
	lemma: _Output1304;
	candidates: _Output1540;
};
type _Output1542 = [_Output1366, ...Array<_Output1366>];
type _Output1541 = {
	encounter: _Output553;
	lemma: _Output1309;
	candidates: _Output1542;
};
type _Output1544 = [_Output1366, ...Array<_Output1366>];
type _Output1543 = {
	encounter: _Output559;
	lemma: _Output1314;
	candidates: _Output1544;
};
type _Output1546 = [_Output1366, ...Array<_Output1366>];
type _Output1545 = {
	encounter: _Output565;
	lemma: _Output1319;
	candidates: _Output1546;
};
type _Output1548 = [_Output1366, ...Array<_Output1366>];
type _Output1547 = {
	encounter: _Output571;
	lemma: _Output1324;
	candidates: _Output1548;
};
type _Output1550 = [_Output1366, ...Array<_Output1366>];
type _Output1549 = {
	encounter: _Output577;
	lemma: _Output1329;
	candidates: _Output1550;
};
type _Output1552 = [_Output1366, ...Array<_Output1366>];
type _Output1551 = {
	encounter: _Output583;
	lemma: _Output1334;
	candidates: _Output1552;
};
type _Output1554 = [_Output1366, ...Array<_Output1366>];
type _Output1553 = {
	encounter: _Output589;
	lemma: _Output1339;
	candidates: _Output1554;
};
type _Output1556 = [_Output1366, ...Array<_Output1366>];
type _Output1555 = {
	encounter: _Output595;
	lemma: _Output1344;
	candidates: _Output1556;
};
type _Output1558 = [_Output1366, ...Array<_Output1366>];
type _Output1557 = {
	encounter: _Output601;
	lemma: _Output1349;
	candidates: _Output1558;
};
type _Output1560 = [_Output1366, ...Array<_Output1366>];
type _Output1559 = {
	encounter: _Output607;
	lemma: _Output1354;
	candidates: _Output1560;
};
type _Output1562 = [_Output1366, ...Array<_Output1366>];
type _Output1561 = {
	encounter: _Output613;
	lemma: _Output1359;
	candidates: _Output1562;
};
type _Output1363 =
	| _Output1364
	| _Output1367
	| _Output1369
	| _Output1371
	| _Output1373
	| _Output1375
	| _Output1377
	| _Output1379
	| _Output1381
	| _Output1383
	| _Output1385
	| _Output1387
	| _Output1389
	| _Output1391
	| _Output1393
	| _Output1395
	| _Output1397
	| _Output1399
	| _Output1401
	| _Output1403
	| _Output1405
	| _Output1407
	| _Output1409
	| _Output1411
	| _Output1413
	| _Output1415
	| _Output1417
	| _Output1419
	| _Output1421
	| _Output1423
	| _Output1425
	| _Output1427
	| _Output1429
	| _Output1431
	| _Output1433
	| _Output1435
	| _Output1437
	| _Output1439
	| _Output1441
	| _Output1443
	| _Output1445
	| _Output1447
	| _Output1449
	| _Output1451
	| _Output1453
	| _Output1455
	| _Output1457
	| _Output1459
	| _Output1461
	| _Output1463
	| _Output1465
	| _Output1467
	| _Output1469
	| _Output1471
	| _Output1473
	| _Output1475
	| _Output1477
	| _Output1479
	| _Output1481
	| _Output1483
	| _Output1485
	| _Output1487
	| _Output1489
	| _Output1491
	| _Output1493
	| _Output1495
	| _Output1497
	| _Output1499
	| _Output1501
	| _Output1503
	| _Output1505
	| _Output1507
	| _Output1509
	| _Output1511
	| _Output1513
	| _Output1515
	| _Output1517
	| _Output1519
	| _Output1521
	| _Output1523
	| _Output1525
	| _Output1527
	| _Output1529
	| _Output1531
	| _Output1533
	| _Output1535
	| _Output1537
	| _Output1539
	| _Output1541
	| _Output1543
	| _Output1545
	| _Output1547
	| _Output1549
	| _Output1551
	| _Output1553
	| _Output1555
	| _Output1557
	| _Output1559
	| _Output1561;
type _Output1566 = "Reading";
type _Output1565 = {
	unitKind: _Output1566;
	lemma: _Output621;
	emojiDescription: _Output1366;
};
type _Output1569 = null;
type _Output1568 = _Output1569 | undefined;
type _Output1571 = { en?: _Output1568; ru?: _Output1568 };
type _Output1570 = _Output1571 | undefined;
type _Output1573 = {
	synonym?: _Output1568;
	nearSynonym?: _Output1568;
	antonym?: _Output1568;
	nearAntonym?: _Output1568;
	hypernym?: _Output1568;
	hyponym?: _Output1568;
	meronym?: _Output1568;
	holonym?: _Output1568;
};
type _Output1572 = _Output1573 | undefined;
type _Output1567 = {
	transcription?: _Output1568;
	definition?: _Output1568;
	morphologicalTree?: _Output1568;
	lexicalBreakdown?: _Output1568;
	translations?: _Output1570;
	semanticRelations?: _Output1572;
};
type _Output1564 = {
	encounter: _Output23;
	reading: _Output1565;
	request: _Output1567;
};
type _Output1576 = "Reading";
type _Output1575 = {
	unitKind: _Output1576;
	lemma: _Output627;
	emojiDescription: _Output1366;
};
type _Output1574 = {
	encounter: _Output31;
	reading: _Output1575;
	request: _Output1567;
};
type _Output1579 = "Reading";
type _Output1578 = {
	unitKind: _Output1579;
	lemma: _Output640;
	emojiDescription: _Output1366;
};
type _Output1577 = {
	encounter: _Output37;
	reading: _Output1578;
	request: _Output1567;
};
type _Output1582 = "Reading";
type _Output1581 = {
	unitKind: _Output1582;
	lemma: _Output655;
	emojiDescription: _Output1366;
};
type _Output1580 = {
	encounter: _Output43;
	reading: _Output1581;
	request: _Output1567;
};
type _Output1585 = "Reading";
type _Output1584 = {
	unitKind: _Output1585;
	lemma: _Output665;
	emojiDescription: _Output1366;
};
type _Output1583 = {
	encounter: _Output49;
	reading: _Output1584;
	request: _Output1567;
};
type _Output1588 = "Reading";
type _Output1587 = {
	unitKind: _Output1588;
	lemma: _Output672;
	emojiDescription: _Output1366;
};
type _Output1586 = {
	encounter: _Output55;
	reading: _Output1587;
	request: _Output1567;
};
type _Output1591 = "Reading";
type _Output1590 = {
	unitKind: _Output1591;
	lemma: _Output679;
	emojiDescription: _Output1366;
};
type _Output1589 = {
	encounter: _Output61;
	reading: _Output1590;
	request: _Output1567;
};
type _Output1594 = "Reading";
type _Output1593 = {
	unitKind: _Output1594;
	lemma: _Output699;
	emojiDescription: _Output1366;
};
type _Output1592 = {
	encounter: _Output67;
	reading: _Output1593;
	request: _Output1567;
};
type _Output1597 = "Reading";
type _Output1596 = {
	unitKind: _Output1597;
	lemma: _Output706;
	emojiDescription: _Output1366;
};
type _Output1595 = {
	encounter: _Output73;
	reading: _Output1596;
	request: _Output1567;
};
type _Output1600 = "Reading";
type _Output1599 = {
	unitKind: _Output1600;
	lemma: _Output715;
	emojiDescription: _Output1366;
};
type _Output1598 = {
	encounter: _Output79;
	reading: _Output1599;
	request: _Output1567;
};
type _Output1603 = "Reading";
type _Output1602 = {
	unitKind: _Output1603;
	lemma: _Output724;
	emojiDescription: _Output1366;
};
type _Output1601 = {
	encounter: _Output85;
	reading: _Output1602;
	request: _Output1567;
};
type _Output1606 = "Reading";
type _Output1605 = {
	unitKind: _Output1606;
	lemma: _Output734;
	emojiDescription: _Output1366;
};
type _Output1604 = {
	encounter: _Output91;
	reading: _Output1605;
	request: _Output1567;
};
type _Output1609 = "Reading";
type _Output1608 = {
	unitKind: _Output1609;
	lemma: _Output745;
	emojiDescription: _Output1366;
};
type _Output1607 = {
	encounter: _Output97;
	reading: _Output1608;
	request: _Output1567;
};
type _Output1612 = "Reading";
type _Output1611 = {
	unitKind: _Output1612;
	lemma: _Output770;
	emojiDescription: _Output1366;
};
type _Output1610 = {
	encounter: _Output103;
	reading: _Output1611;
	request: _Output1567;
};
type _Output1615 = "Reading";
type _Output1614 = {
	unitKind: _Output1615;
	lemma: _Output779;
	emojiDescription: _Output1366;
};
type _Output1613 = {
	encounter: _Output109;
	reading: _Output1614;
	request: _Output1567;
};
type _Output1618 = "Reading";
type _Output1617 = {
	unitKind: _Output1618;
	lemma: _Output786;
	emojiDescription: _Output1366;
};
type _Output1616 = {
	encounter: _Output115;
	reading: _Output1617;
	request: _Output1567;
};
type _Output1621 = "Reading";
type _Output1620 = {
	unitKind: _Output1621;
	lemma: _Output793;
	emojiDescription: _Output1366;
};
type _Output1619 = {
	encounter: _Output121;
	reading: _Output1620;
	request: _Output1567;
};
type _Output1624 = "Reading";
type _Output1623 = {
	unitKind: _Output1624;
	lemma: _Output801;
	emojiDescription: _Output1366;
};
type _Output1622 = {
	encounter: _Output127;
	reading: _Output1623;
	request: _Output1567;
};
type _Output1627 = "Reading";
type _Output1626 = {
	unitKind: _Output1627;
	lemma: _Output813;
	emojiDescription: _Output1366;
};
type _Output1625 = {
	encounter: _Output133;
	reading: _Output1626;
	request: _Output1567;
};
type _Output1630 = "Reading";
type _Output1629 = {
	unitKind: _Output1630;
	lemma: _Output818;
	emojiDescription: _Output1366;
};
type _Output1628 = {
	encounter: _Output139;
	reading: _Output1629;
	request: _Output1567;
};
type _Output1633 = "Reading";
type _Output1632 = {
	unitKind: _Output1633;
	lemma: _Output823;
	emojiDescription: _Output1366;
};
type _Output1631 = {
	encounter: _Output145;
	reading: _Output1632;
	request: _Output1567;
};
type _Output1636 = "Reading";
type _Output1635 = {
	unitKind: _Output1636;
	lemma: _Output828;
	emojiDescription: _Output1366;
};
type _Output1634 = {
	encounter: _Output151;
	reading: _Output1635;
	request: _Output1567;
};
type _Output1639 = "Reading";
type _Output1638 = {
	unitKind: _Output1639;
	lemma: _Output833;
	emojiDescription: _Output1366;
};
type _Output1637 = {
	encounter: _Output157;
	reading: _Output1638;
	request: _Output1567;
};
type _Output1642 = "Reading";
type _Output1641 = {
	unitKind: _Output1642;
	lemma: _Output838;
	emojiDescription: _Output1366;
};
type _Output1640 = {
	encounter: _Output163;
	reading: _Output1641;
	request: _Output1567;
};
type _Output1645 = "Reading";
type _Output1644 = {
	unitKind: _Output1645;
	lemma: _Output844;
	emojiDescription: _Output1366;
};
type _Output1643 = {
	encounter: _Output169;
	reading: _Output1644;
	request: _Output1567;
};
type _Output1648 = "Reading";
type _Output1647 = {
	unitKind: _Output1648;
	lemma: _Output849;
	emojiDescription: _Output1366;
};
type _Output1646 = {
	encounter: _Output175;
	reading: _Output1647;
	request: _Output1567;
};
type _Output1651 = "Reading";
type _Output1650 = {
	unitKind: _Output1651;
	lemma: _Output854;
	emojiDescription: _Output1366;
};
type _Output1649 = {
	encounter: _Output181;
	reading: _Output1650;
	request: _Output1567;
};
type _Output1654 = "Reading";
type _Output1653 = {
	unitKind: _Output1654;
	lemma: _Output859;
	emojiDescription: _Output1366;
};
type _Output1652 = {
	encounter: _Output187;
	reading: _Output1653;
	request: _Output1567;
};
type _Output1657 = "Reading";
type _Output1656 = {
	unitKind: _Output1657;
	lemma: _Output864;
	emojiDescription: _Output1366;
};
type _Output1655 = {
	encounter: _Output193;
	reading: _Output1656;
	request: _Output1567;
};
type _Output1660 = "Reading";
type _Output1659 = {
	unitKind: _Output1660;
	lemma: _Output869;
	emojiDescription: _Output1366;
};
type _Output1658 = {
	encounter: _Output199;
	reading: _Output1659;
	request: _Output1567;
};
type _Output1663 = "Reading";
type _Output1662 = {
	unitKind: _Output1663;
	lemma: _Output874;
	emojiDescription: _Output1366;
};
type _Output1661 = {
	encounter: _Output205;
	reading: _Output1662;
	request: _Output1567;
};
type _Output1666 = "Reading";
type _Output1665 = {
	unitKind: _Output1666;
	lemma: _Output881;
	emojiDescription: _Output1366;
};
type _Output1664 = {
	encounter: _Output211;
	reading: _Output1665;
	request: _Output1567;
};
type _Output1669 = "Reading";
type _Output1668 = {
	unitKind: _Output1669;
	lemma: _Output886;
	emojiDescription: _Output1366;
};
type _Output1667 = {
	encounter: _Output217;
	reading: _Output1668;
	request: _Output1567;
};
type _Output1672 = "Reading";
type _Output1671 = {
	unitKind: _Output1672;
	lemma: _Output891;
	emojiDescription: _Output1366;
};
type _Output1670 = {
	encounter: _Output223;
	reading: _Output1671;
	request: _Output1567;
};
type _Output1675 = "Reading";
type _Output1674 = {
	unitKind: _Output1675;
	lemma: _Output896;
	emojiDescription: _Output1366;
};
type _Output1673 = {
	encounter: _Output229;
	reading: _Output1674;
	request: _Output1567;
};
type _Output1678 = "Reading";
type _Output1677 = {
	unitKind: _Output1678;
	lemma: _Output910;
	emojiDescription: _Output1366;
};
type _Output1676 = {
	encounter: _Output235;
	reading: _Output1677;
	request: _Output1567;
};
type _Output1681 = "Reading";
type _Output1680 = {
	unitKind: _Output1681;
	lemma: _Output918;
	emojiDescription: _Output1366;
};
type _Output1679 = {
	encounter: _Output241;
	reading: _Output1680;
	request: _Output1567;
};
type _Output1684 = "Reading";
type _Output1683 = {
	unitKind: _Output1684;
	lemma: _Output936;
	emojiDescription: _Output1366;
};
type _Output1682 = {
	encounter: _Output247;
	reading: _Output1683;
	request: _Output1567;
};
type _Output1687 = "Reading";
type _Output1686 = {
	unitKind: _Output1687;
	lemma: _Output944;
	emojiDescription: _Output1366;
};
type _Output1685 = {
	encounter: _Output253;
	reading: _Output1686;
	request: _Output1567;
};
type _Output1690 = "Reading";
type _Output1689 = {
	unitKind: _Output1690;
	lemma: _Output952;
	emojiDescription: _Output1366;
};
type _Output1688 = {
	encounter: _Output259;
	reading: _Output1689;
	request: _Output1567;
};
type _Output1693 = "Reading";
type _Output1692 = {
	unitKind: _Output1693;
	lemma: _Output972;
	emojiDescription: _Output1366;
};
type _Output1691 = {
	encounter: _Output265;
	reading: _Output1692;
	request: _Output1567;
};
type _Output1696 = "Reading";
type _Output1695 = {
	unitKind: _Output1696;
	lemma: _Output983;
	emojiDescription: _Output1366;
};
type _Output1694 = {
	encounter: _Output271;
	reading: _Output1695;
	request: _Output1567;
};
type _Output1699 = "Reading";
type _Output1698 = {
	unitKind: _Output1699;
	lemma: _Output998;
	emojiDescription: _Output1366;
};
type _Output1697 = {
	encounter: _Output277;
	reading: _Output1698;
	request: _Output1567;
};
type _Output1702 = "Reading";
type _Output1701 = {
	unitKind: _Output1702;
	lemma: _Output1010;
	emojiDescription: _Output1366;
};
type _Output1700 = {
	encounter: _Output283;
	reading: _Output1701;
	request: _Output1567;
};
type _Output1705 = "Reading";
type _Output1704 = {
	unitKind: _Output1705;
	lemma: _Output1018;
	emojiDescription: _Output1366;
};
type _Output1703 = {
	encounter: _Output289;
	reading: _Output1704;
	request: _Output1567;
};
type _Output1708 = "Reading";
type _Output1707 = {
	unitKind: _Output1708;
	lemma: _Output1028;
	emojiDescription: _Output1366;
};
type _Output1706 = {
	encounter: _Output295;
	reading: _Output1707;
	request: _Output1567;
};
type _Output1711 = "Reading";
type _Output1710 = {
	unitKind: _Output1711;
	lemma: _Output1045;
	emojiDescription: _Output1366;
};
type _Output1709 = {
	encounter: _Output301;
	reading: _Output1710;
	request: _Output1567;
};
type _Output1714 = "Reading";
type _Output1713 = {
	unitKind: _Output1714;
	lemma: _Output1055;
	emojiDescription: _Output1366;
};
type _Output1712 = {
	encounter: _Output307;
	reading: _Output1713;
	request: _Output1567;
};
type _Output1717 = "Reading";
type _Output1716 = {
	unitKind: _Output1717;
	lemma: _Output1060;
	emojiDescription: _Output1366;
};
type _Output1715 = {
	encounter: _Output313;
	reading: _Output1716;
	request: _Output1567;
};
type _Output1720 = "Reading";
type _Output1719 = {
	unitKind: _Output1720;
	lemma: _Output1070;
	emojiDescription: _Output1366;
};
type _Output1718 = {
	encounter: _Output319;
	reading: _Output1719;
	request: _Output1567;
};
type _Output1723 = "Reading";
type _Output1722 = {
	unitKind: _Output1723;
	lemma: _Output1078;
	emojiDescription: _Output1366;
};
type _Output1721 = {
	encounter: _Output325;
	reading: _Output1722;
	request: _Output1567;
};
type _Output1726 = "Reading";
type _Output1725 = {
	unitKind: _Output1726;
	lemma: _Output1091;
	emojiDescription: _Output1366;
};
type _Output1724 = {
	encounter: _Output331;
	reading: _Output1725;
	request: _Output1567;
};
type _Output1729 = "Reading";
type _Output1728 = {
	unitKind: _Output1729;
	lemma: _Output1096;
	emojiDescription: _Output1366;
};
type _Output1727 = {
	encounter: _Output337;
	reading: _Output1728;
	request: _Output1567;
};
type _Output1732 = "Reading";
type _Output1731 = {
	unitKind: _Output1732;
	lemma: _Output1101;
	emojiDescription: _Output1366;
};
type _Output1730 = {
	encounter: _Output343;
	reading: _Output1731;
	request: _Output1567;
};
type _Output1735 = "Reading";
type _Output1734 = {
	unitKind: _Output1735;
	lemma: _Output1106;
	emojiDescription: _Output1366;
};
type _Output1733 = {
	encounter: _Output349;
	reading: _Output1734;
	request: _Output1567;
};
type _Output1738 = "Reading";
type _Output1737 = {
	unitKind: _Output1738;
	lemma: _Output1111;
	emojiDescription: _Output1366;
};
type _Output1736 = {
	encounter: _Output355;
	reading: _Output1737;
	request: _Output1567;
};
type _Output1741 = "Reading";
type _Output1740 = {
	unitKind: _Output1741;
	lemma: _Output1116;
	emojiDescription: _Output1366;
};
type _Output1739 = {
	encounter: _Output361;
	reading: _Output1740;
	request: _Output1567;
};
type _Output1744 = "Reading";
type _Output1743 = {
	unitKind: _Output1744;
	lemma: _Output1121;
	emojiDescription: _Output1366;
};
type _Output1742 = {
	encounter: _Output367;
	reading: _Output1743;
	request: _Output1567;
};
type _Output1747 = "Reading";
type _Output1746 = {
	unitKind: _Output1747;
	lemma: _Output1126;
	emojiDescription: _Output1366;
};
type _Output1745 = {
	encounter: _Output373;
	reading: _Output1746;
	request: _Output1567;
};
type _Output1750 = "Reading";
type _Output1749 = {
	unitKind: _Output1750;
	lemma: _Output1131;
	emojiDescription: _Output1366;
};
type _Output1748 = {
	encounter: _Output379;
	reading: _Output1749;
	request: _Output1567;
};
type _Output1753 = "Reading";
type _Output1752 = {
	unitKind: _Output1753;
	lemma: _Output1136;
	emojiDescription: _Output1366;
};
type _Output1751 = {
	encounter: _Output385;
	reading: _Output1752;
	request: _Output1567;
};
type _Output1756 = "Reading";
type _Output1755 = {
	unitKind: _Output1756;
	lemma: _Output1141;
	emojiDescription: _Output1366;
};
type _Output1754 = {
	encounter: _Output391;
	reading: _Output1755;
	request: _Output1567;
};
type _Output1759 = "Reading";
type _Output1758 = {
	unitKind: _Output1759;
	lemma: _Output1146;
	emojiDescription: _Output1366;
};
type _Output1757 = {
	encounter: _Output397;
	reading: _Output1758;
	request: _Output1567;
};
type _Output1762 = "Reading";
type _Output1761 = {
	unitKind: _Output1762;
	lemma: _Output1151;
	emojiDescription: _Output1366;
};
type _Output1760 = {
	encounter: _Output403;
	reading: _Output1761;
	request: _Output1567;
};
type _Output1765 = "Reading";
type _Output1764 = {
	unitKind: _Output1765;
	lemma: _Output1157;
	emojiDescription: _Output1366;
};
type _Output1763 = {
	encounter: _Output409;
	reading: _Output1764;
	request: _Output1567;
};
type _Output1768 = "Reading";
type _Output1767 = {
	unitKind: _Output1768;
	lemma: _Output1162;
	emojiDescription: _Output1366;
};
type _Output1766 = {
	encounter: _Output415;
	reading: _Output1767;
	request: _Output1567;
};
type _Output1771 = "Reading";
type _Output1770 = {
	unitKind: _Output1771;
	lemma: _Output1167;
	emojiDescription: _Output1366;
};
type _Output1769 = {
	encounter: _Output421;
	reading: _Output1770;
	request: _Output1567;
};
type _Output1774 = "Reading";
type _Output1773 = {
	unitKind: _Output1774;
	lemma: _Output1172;
	emojiDescription: _Output1366;
};
type _Output1772 = {
	encounter: _Output427;
	reading: _Output1773;
	request: _Output1567;
};
type _Output1777 = "Reading";
type _Output1776 = {
	unitKind: _Output1777;
	lemma: _Output1178;
	emojiDescription: _Output1366;
};
type _Output1775 = {
	encounter: _Output433;
	reading: _Output1776;
	request: _Output1567;
};
type _Output1780 = "Reading";
type _Output1779 = {
	unitKind: _Output1780;
	lemma: _Output1186;
	emojiDescription: _Output1366;
};
type _Output1778 = {
	encounter: _Output439;
	reading: _Output1779;
	request: _Output1567;
};
type _Output1783 = "Reading";
type _Output1782 = {
	unitKind: _Output1783;
	lemma: _Output1193;
	emojiDescription: _Output1366;
};
type _Output1781 = {
	encounter: _Output445;
	reading: _Output1782;
	request: _Output1567;
};
type _Output1786 = "Reading";
type _Output1785 = {
	unitKind: _Output1786;
	lemma: _Output1200;
	emojiDescription: _Output1366;
};
type _Output1784 = {
	encounter: _Output451;
	reading: _Output1785;
	request: _Output1567;
};
type _Output1789 = "Reading";
type _Output1788 = {
	unitKind: _Output1789;
	lemma: _Output1205;
	emojiDescription: _Output1366;
};
type _Output1787 = {
	encounter: _Output457;
	reading: _Output1788;
	request: _Output1567;
};
type _Output1792 = "Reading";
type _Output1791 = {
	unitKind: _Output1792;
	lemma: _Output1212;
	emojiDescription: _Output1366;
};
type _Output1790 = {
	encounter: _Output463;
	reading: _Output1791;
	request: _Output1567;
};
type _Output1795 = "Reading";
type _Output1794 = {
	unitKind: _Output1795;
	lemma: _Output1217;
	emojiDescription: _Output1366;
};
type _Output1793 = {
	encounter: _Output469;
	reading: _Output1794;
	request: _Output1567;
};
type _Output1798 = "Reading";
type _Output1797 = {
	unitKind: _Output1798;
	lemma: _Output1227;
	emojiDescription: _Output1366;
};
type _Output1796 = {
	encounter: _Output475;
	reading: _Output1797;
	request: _Output1567;
};
type _Output1801 = "Reading";
type _Output1800 = {
	unitKind: _Output1801;
	lemma: _Output1232;
	emojiDescription: _Output1366;
};
type _Output1799 = {
	encounter: _Output481;
	reading: _Output1800;
	request: _Output1567;
};
type _Output1804 = "Reading";
type _Output1803 = {
	unitKind: _Output1804;
	lemma: _Output1237;
	emojiDescription: _Output1366;
};
type _Output1802 = {
	encounter: _Output487;
	reading: _Output1803;
	request: _Output1567;
};
type _Output1807 = "Reading";
type _Output1806 = {
	unitKind: _Output1807;
	lemma: _Output1242;
	emojiDescription: _Output1366;
};
type _Output1805 = {
	encounter: _Output493;
	reading: _Output1806;
	request: _Output1567;
};
type _Output1810 = "Reading";
type _Output1809 = {
	unitKind: _Output1810;
	lemma: _Output1253;
	emojiDescription: _Output1366;
};
type _Output1808 = {
	encounter: _Output499;
	reading: _Output1809;
	request: _Output1567;
};
type _Output1813 = "Reading";
type _Output1812 = {
	unitKind: _Output1813;
	lemma: _Output1263;
	emojiDescription: _Output1366;
};
type _Output1811 = {
	encounter: _Output505;
	reading: _Output1812;
	request: _Output1567;
};
type _Output1816 = "Reading";
type _Output1815 = {
	unitKind: _Output1816;
	lemma: _Output1268;
	emojiDescription: _Output1366;
};
type _Output1814 = {
	encounter: _Output511;
	reading: _Output1815;
	request: _Output1567;
};
type _Output1819 = "Reading";
type _Output1818 = {
	unitKind: _Output1819;
	lemma: _Output1275;
	emojiDescription: _Output1366;
};
type _Output1817 = {
	encounter: _Output517;
	reading: _Output1818;
	request: _Output1567;
};
type _Output1822 = "Reading";
type _Output1821 = {
	unitKind: _Output1822;
	lemma: _Output1280;
	emojiDescription: _Output1366;
};
type _Output1820 = {
	encounter: _Output523;
	reading: _Output1821;
	request: _Output1567;
};
type _Output1825 = "Reading";
type _Output1824 = {
	unitKind: _Output1825;
	lemma: _Output1289;
	emojiDescription: _Output1366;
};
type _Output1823 = {
	encounter: _Output529;
	reading: _Output1824;
	request: _Output1567;
};
type _Output1828 = "Reading";
type _Output1827 = {
	unitKind: _Output1828;
	lemma: _Output1294;
	emojiDescription: _Output1366;
};
type _Output1826 = {
	encounter: _Output535;
	reading: _Output1827;
	request: _Output1567;
};
type _Output1831 = "Reading";
type _Output1830 = {
	unitKind: _Output1831;
	lemma: _Output1299;
	emojiDescription: _Output1366;
};
type _Output1829 = {
	encounter: _Output541;
	reading: _Output1830;
	request: _Output1567;
};
type _Output1834 = "Reading";
type _Output1833 = {
	unitKind: _Output1834;
	lemma: _Output1304;
	emojiDescription: _Output1366;
};
type _Output1832 = {
	encounter: _Output547;
	reading: _Output1833;
	request: _Output1567;
};
type _Output1837 = "Reading";
type _Output1836 = {
	unitKind: _Output1837;
	lemma: _Output1309;
	emojiDescription: _Output1366;
};
type _Output1835 = {
	encounter: _Output553;
	reading: _Output1836;
	request: _Output1567;
};
type _Output1840 = "Reading";
type _Output1839 = {
	unitKind: _Output1840;
	lemma: _Output1314;
	emojiDescription: _Output1366;
};
type _Output1838 = {
	encounter: _Output559;
	reading: _Output1839;
	request: _Output1567;
};
type _Output1843 = "Reading";
type _Output1842 = {
	unitKind: _Output1843;
	lemma: _Output1319;
	emojiDescription: _Output1366;
};
type _Output1841 = {
	encounter: _Output565;
	reading: _Output1842;
	request: _Output1567;
};
type _Output1846 = "Reading";
type _Output1845 = {
	unitKind: _Output1846;
	lemma: _Output1324;
	emojiDescription: _Output1366;
};
type _Output1844 = {
	encounter: _Output571;
	reading: _Output1845;
	request: _Output1567;
};
type _Output1849 = "Reading";
type _Output1848 = {
	unitKind: _Output1849;
	lemma: _Output1329;
	emojiDescription: _Output1366;
};
type _Output1847 = {
	encounter: _Output577;
	reading: _Output1848;
	request: _Output1567;
};
type _Output1852 = "Reading";
type _Output1851 = {
	unitKind: _Output1852;
	lemma: _Output1334;
	emojiDescription: _Output1366;
};
type _Output1850 = {
	encounter: _Output583;
	reading: _Output1851;
	request: _Output1567;
};
type _Output1855 = "Reading";
type _Output1854 = {
	unitKind: _Output1855;
	lemma: _Output1339;
	emojiDescription: _Output1366;
};
type _Output1853 = {
	encounter: _Output589;
	reading: _Output1854;
	request: _Output1567;
};
type _Output1858 = "Reading";
type _Output1857 = {
	unitKind: _Output1858;
	lemma: _Output1344;
	emojiDescription: _Output1366;
};
type _Output1856 = {
	encounter: _Output595;
	reading: _Output1857;
	request: _Output1567;
};
type _Output1861 = "Reading";
type _Output1860 = {
	unitKind: _Output1861;
	lemma: _Output1349;
	emojiDescription: _Output1366;
};
type _Output1859 = {
	encounter: _Output601;
	reading: _Output1860;
	request: _Output1567;
};
type _Output1864 = "Reading";
type _Output1863 = {
	unitKind: _Output1864;
	lemma: _Output1354;
	emojiDescription: _Output1366;
};
type _Output1862 = {
	encounter: _Output607;
	reading: _Output1863;
	request: _Output1567;
};
type _Output1867 = "Reading";
type _Output1866 = {
	unitKind: _Output1867;
	lemma: _Output1359;
	emojiDescription: _Output1366;
};
type _Output1865 = {
	encounter: _Output613;
	reading: _Output1866;
	request: _Output1567;
};
type _Output1563 =
	| _Output1564
	| _Output1574
	| _Output1577
	| _Output1580
	| _Output1583
	| _Output1586
	| _Output1589
	| _Output1592
	| _Output1595
	| _Output1598
	| _Output1601
	| _Output1604
	| _Output1607
	| _Output1610
	| _Output1613
	| _Output1616
	| _Output1619
	| _Output1622
	| _Output1625
	| _Output1628
	| _Output1631
	| _Output1634
	| _Output1637
	| _Output1640
	| _Output1643
	| _Output1646
	| _Output1649
	| _Output1652
	| _Output1655
	| _Output1658
	| _Output1661
	| _Output1664
	| _Output1667
	| _Output1670
	| _Output1673
	| _Output1676
	| _Output1679
	| _Output1682
	| _Output1685
	| _Output1688
	| _Output1691
	| _Output1694
	| _Output1697
	| _Output1700
	| _Output1703
	| _Output1706
	| _Output1709
	| _Output1712
	| _Output1715
	| _Output1718
	| _Output1721
	| _Output1724
	| _Output1727
	| _Output1730
	| _Output1733
	| _Output1736
	| _Output1739
	| _Output1742
	| _Output1745
	| _Output1748
	| _Output1751
	| _Output1754
	| _Output1757
	| _Output1760
	| _Output1763
	| _Output1766
	| _Output1769
	| _Output1772
	| _Output1775
	| _Output1778
	| _Output1781
	| _Output1784
	| _Output1787
	| _Output1790
	| _Output1793
	| _Output1796
	| _Output1799
	| _Output1802
	| _Output1805
	| _Output1808
	| _Output1811
	| _Output1814
	| _Output1817
	| _Output1820
	| _Output1823
	| _Output1826
	| _Output1829
	| _Output1832
	| _Output1835
	| _Output1838
	| _Output1841
	| _Output1844
	| _Output1847
	| _Output1850
	| _Output1853
	| _Output1856
	| _Output1859
	| _Output1862
	| _Output1865;
type _Output1870 = string;
type _Output1869 = [_Output1870, ...Array<_Output1870>];
type _Output1868 = { sourceSentences: _Output1869 };
type _Output1875 = "Contribute" | "Correct";
type _Output1876 = "transcription" | "definition";
type _Output1877 = string;
type _Output1874 = {
	kind: _Output1875;
	aspect: _Output1876;
	value: _Output1877;
};
type _Output1879 = "Retract";
type _Output1878 = { kind: _Output1879; aspect: _Output1876 };
type _Output1881 = "translations";
type _Output1882 = "en" | "ru";
type _Output1883 = Array<_Output1877>;
type _Output1880 = {
	kind: _Output1875;
	aspect: _Output1881;
	language: _Output1882;
	value: _Output1883;
};
type _Output1885 = "Retract";
type _Output1886 = "translations";
type _Output1884 = {
	kind: _Output1885;
	aspect: _Output1886;
	language: _Output1882;
};
type _Output1888 = "semanticRelations";
type _Output1889 = "synonym";
type _Output1890 = "reading";
type _Output1892 =
	| _Output1565
	| _Output1575
	| _Output1578
	| _Output1581
	| _Output1584
	| _Output1587
	| _Output1590
	| _Output1593
	| _Output1596
	| _Output1599
	| _Output1602
	| _Output1605
	| _Output1608
	| _Output1611
	| _Output1614
	| _Output1617
	| _Output1620
	| _Output1623
	| _Output1626
	| _Output1629
	| _Output1632
	| _Output1635
	| _Output1638
	| _Output1641
	| _Output1644
	| _Output1647
	| _Output1650
	| _Output1653
	| _Output1656
	| _Output1659
	| _Output1662
	| _Output1665
	| _Output1668
	| _Output1671
	| _Output1674
	| _Output1677
	| _Output1680
	| _Output1683
	| _Output1686
	| _Output1689
	| _Output1692
	| _Output1695
	| _Output1698
	| _Output1701
	| _Output1704
	| _Output1707
	| _Output1710
	| _Output1713
	| _Output1716
	| _Output1719
	| _Output1722
	| _Output1725
	| _Output1728
	| _Output1731
	| _Output1734
	| _Output1737
	| _Output1740
	| _Output1743
	| _Output1746
	| _Output1749
	| _Output1752
	| _Output1755
	| _Output1758
	| _Output1761
	| _Output1764
	| _Output1767
	| _Output1770
	| _Output1773
	| _Output1776
	| _Output1779
	| _Output1782
	| _Output1785
	| _Output1788
	| _Output1791
	| _Output1794
	| _Output1797
	| _Output1800
	| _Output1803
	| _Output1806
	| _Output1809
	| _Output1812
	| _Output1815
	| _Output1818
	| _Output1821
	| _Output1824
	| _Output1827
	| _Output1830
	| _Output1833
	| _Output1836
	| _Output1839
	| _Output1842
	| _Output1845
	| _Output1848
	| _Output1851
	| _Output1854
	| _Output1857
	| _Output1860
	| _Output1863
	| _Output1866;
type _Output1891 = Array<_Output1892>;
type _Output1887 = {
	kind: _Output1875;
	aspect: _Output1888;
	relation: _Output1889;
	targetKind: _Output1890;
	value: _Output1891;
};
type _Output1894 = "semanticRelations";
type _Output1895 =
	| "synonym"
	| "nearSynonym"
	| "antonym"
	| "nearAntonym"
	| "hypernym"
	| "holonym";
type _Output1897 = "lemma";
type _Output1896 = _Output1897 | undefined;
type _Output1899 =
	| _Output621
	| _Output627
	| _Output640
	| _Output655
	| _Output665
	| _Output672
	| _Output679
	| _Output699
	| _Output706
	| _Output715
	| _Output724
	| _Output734
	| _Output745
	| _Output770
	| _Output779
	| _Output786
	| _Output793
	| _Output801
	| _Output813
	| _Output818
	| _Output823
	| _Output828
	| _Output833
	| _Output838
	| _Output844
	| _Output849
	| _Output854
	| _Output859
	| _Output864
	| _Output869
	| _Output874
	| _Output881
	| _Output886
	| _Output891
	| _Output896
	| _Output910
	| _Output918
	| _Output936
	| _Output944
	| _Output952
	| _Output972
	| _Output983
	| _Output998
	| _Output1010
	| _Output1018
	| _Output1028
	| _Output1045
	| _Output1055
	| _Output1060
	| _Output1070
	| _Output1078
	| _Output1091
	| _Output1096
	| _Output1101
	| _Output1106
	| _Output1111
	| _Output1116
	| _Output1121
	| _Output1126
	| _Output1131
	| _Output1136
	| _Output1141
	| _Output1146
	| _Output1151
	| _Output1157
	| _Output1162
	| _Output1167
	| _Output1172
	| _Output1178
	| _Output1186
	| _Output1193
	| _Output1200
	| _Output1205
	| _Output1212
	| _Output1217
	| _Output1227
	| _Output1232
	| _Output1237
	| _Output1242
	| _Output1253
	| _Output1263
	| _Output1268
	| _Output1275
	| _Output1280
	| _Output1289
	| _Output1294
	| _Output1299
	| _Output1304
	| _Output1309
	| _Output1314
	| _Output1319
	| _Output1324
	| _Output1329
	| _Output1334
	| _Output1339
	| _Output1344
	| _Output1349
	| _Output1354
	| _Output1359;
type _Output1898 = Array<_Output1899>;
type _Output1893 = {
	kind: _Output1875;
	aspect: _Output1894;
	relation: _Output1895;
	targetKind?: _Output1896;
	value: _Output1898;
};
type _Output1901 = "Retract";
type _Output1902 = "semanticRelations";
type _Output1903 = "synonym";
type _Output1904 = "reading";
type _Output1900 = {
	kind: _Output1901;
	aspect: _Output1902;
	relation: _Output1903;
	targetKind: _Output1904;
};
type _Output1906 = "Retract";
type _Output1907 = "semanticRelations";
type _Output1909 = "lemma";
type _Output1908 = _Output1909 | undefined;
type _Output1905 = {
	kind: _Output1906;
	aspect: _Output1907;
	relation: _Output1895;
	targetKind?: _Output1908;
};
type _Output1911 = "morphologicalTree";
type _Output1914 = "structure";
type _Output1919 = "morphemeReading";
type _Output1920 =
	| _Output1626
	| _Output1629
	| _Output1632
	| _Output1635
	| _Output1638
	| _Output1641
	| _Output1644
	| _Output1647
	| _Output1650
	| _Output1653
	| _Output1725
	| _Output1728
	| _Output1731
	| _Output1734
	| _Output1737
	| _Output1740
	| _Output1743
	| _Output1746
	| _Output1749
	| _Output1752
	| _Output1755
	| _Output1824
	| _Output1827
	| _Output1830
	| _Output1833
	| _Output1836
	| _Output1839
	| _Output1842
	| _Output1845
	| _Output1848
	| _Output1851
	| _Output1854;
type _Output1918 = { nodeKind: _Output1919; reading: _Output1920 };
type _Output1922 = "unitShadow";
type _Output1925 = string;
type _Output1924 = {
	language: _Output629;
	canonicalForm: _Output1925;
	family: _Output35;
	kind: _Output36;
};
type _Output1926 = {
	language: _Output642;
	canonicalForm: _Output1925;
	family: _Output41;
	kind: _Output42;
};
type _Output1927 = {
	language: _Output657;
	canonicalForm: _Output1925;
	family: _Output47;
	kind: _Output48;
};
type _Output1928 = {
	language: _Output667;
	canonicalForm: _Output1925;
	family: _Output53;
	kind: _Output54;
};
type _Output1929 = {
	language: _Output674;
	canonicalForm: _Output1925;
	family: _Output59;
	kind: _Output60;
};
type _Output1930 = {
	language: _Output681;
	canonicalForm: _Output1925;
	family: _Output65;
	kind: _Output66;
};
type _Output1931 = {
	language: _Output701;
	canonicalForm: _Output1925;
	family: _Output71;
	kind: _Output72;
};
type _Output1932 = {
	language: _Output708;
	canonicalForm: _Output1925;
	family: _Output77;
	kind: _Output78;
};
type _Output1933 = {
	language: _Output717;
	canonicalForm: _Output1925;
	family: _Output83;
	kind: _Output84;
};
type _Output1934 = {
	language: _Output726;
	canonicalForm: _Output1925;
	family: _Output89;
	kind: _Output90;
};
type _Output1935 = {
	language: _Output736;
	canonicalForm: _Output1925;
	family: _Output95;
	kind: _Output96;
};
type _Output1936 = {
	language: _Output747;
	canonicalForm: _Output1925;
	family: _Output101;
	kind: _Output102;
};
type _Output1937 = {
	language: _Output772;
	canonicalForm: _Output1925;
	family: _Output107;
	kind: _Output108;
};
type _Output1938 = {
	language: _Output781;
	canonicalForm: _Output1925;
	family: _Output113;
	kind: _Output114;
};
type _Output1939 = {
	language: _Output788;
	canonicalForm: _Output1925;
	family: _Output119;
	kind: _Output120;
};
type _Output1940 = {
	language: _Output795;
	canonicalForm: _Output1925;
	family: _Output125;
	kind: _Output126;
};
type _Output1941 = {
	language: _Output803;
	canonicalForm: _Output1925;
	family: _Output131;
	kind: _Output132;
};
type _Output1942 = {
	language: _Output866;
	canonicalForm: _Output1925;
	family: _Output197;
	kind: _Output198;
};
type _Output1943 = {
	language: _Output871;
	canonicalForm: _Output1925;
	family: _Output203;
	kind: _Output204;
};
type _Output1944 = {
	language: _Output876;
	canonicalForm: _Output1925;
	family: _Output209;
	kind: _Output210;
};
type _Output1945 = {
	language: _Output883;
	canonicalForm: _Output1925;
	family: _Output215;
	kind: _Output216;
};
type _Output1946 = {
	language: _Output888;
	canonicalForm: _Output1925;
	family: _Output221;
	kind: _Output222;
};
type _Output1947 = {
	language: _Output898;
	canonicalForm: _Output1925;
	family: _Output233;
	kind: _Output234;
};
type _Output1948 = {
	language: _Output912;
	canonicalForm: _Output1925;
	family: _Output239;
	kind: _Output240;
};
type _Output1949 = {
	language: _Output920;
	canonicalForm: _Output1925;
	family: _Output245;
	kind: _Output246;
};
type _Output1950 = {
	language: _Output938;
	canonicalForm: _Output1925;
	family: _Output251;
	kind: _Output252;
};
type _Output1951 = {
	language: _Output946;
	canonicalForm: _Output1925;
	family: _Output257;
	kind: _Output258;
};
type _Output1952 = {
	language: _Output954;
	canonicalForm: _Output1925;
	family: _Output263;
	kind: _Output264;
};
type _Output1953 = {
	language: _Output974;
	canonicalForm: _Output1925;
	family: _Output269;
	kind: _Output270;
};
type _Output1954 = {
	language: _Output985;
	canonicalForm: _Output1925;
	family: _Output275;
	kind: _Output276;
};
type _Output1955 = {
	language: _Output1000;
	canonicalForm: _Output1925;
	family: _Output281;
	kind: _Output282;
};
type _Output1956 = {
	language: _Output1012;
	canonicalForm: _Output1925;
	family: _Output287;
	kind: _Output288;
};
type _Output1957 = {
	language: _Output1020;
	canonicalForm: _Output1925;
	family: _Output293;
	kind: _Output294;
};
type _Output1958 = {
	language: _Output1030;
	canonicalForm: _Output1925;
	family: _Output299;
	kind: _Output300;
};
type _Output1959 = {
	language: _Output1047;
	canonicalForm: _Output1925;
	family: _Output305;
	kind: _Output306;
};
type _Output1960 = {
	language: _Output1057;
	canonicalForm: _Output1925;
	family: _Output311;
	kind: _Output312;
};
type _Output1961 = {
	language: _Output1062;
	canonicalForm: _Output1925;
	family: _Output317;
	kind: _Output318;
};
type _Output1962 = {
	language: _Output1072;
	canonicalForm: _Output1925;
	family: _Output323;
	kind: _Output324;
};
type _Output1963 = {
	language: _Output1080;
	canonicalForm: _Output1925;
	family: _Output329;
	kind: _Output330;
};
type _Output1964 = {
	language: _Output1148;
	canonicalForm: _Output1925;
	family: _Output401;
	kind: _Output402;
};
type _Output1965 = {
	language: _Output1153;
	canonicalForm: _Output1925;
	family: _Output407;
	kind: _Output408;
};
type _Output1966 = {
	language: _Output1159;
	canonicalForm: _Output1925;
	family: _Output413;
	kind: _Output414;
};
type _Output1967 = {
	language: _Output1164;
	canonicalForm: _Output1925;
	family: _Output419;
	kind: _Output420;
};
type _Output1968 = {
	language: _Output1174;
	canonicalForm: _Output1925;
	family: _Output431;
	kind: _Output432;
};
type _Output1969 = {
	language: _Output1180;
	canonicalForm: _Output1925;
	family: _Output437;
	kind: _Output438;
};
type _Output1970 = {
	language: _Output1188;
	canonicalForm: _Output1925;
	family: _Output443;
	kind: _Output444;
};
type _Output1971 = {
	language: _Output1195;
	canonicalForm: _Output1925;
	family: _Output449;
	kind: _Output450;
};
type _Output1972 = {
	language: _Output1202;
	canonicalForm: _Output1925;
	family: _Output455;
	kind: _Output456;
};
type _Output1973 = {
	language: _Output1207;
	canonicalForm: _Output1925;
	family: _Output461;
	kind: _Output462;
};
type _Output1974 = {
	language: _Output1214;
	canonicalForm: _Output1925;
	family: _Output467;
	kind: _Output468;
};
type _Output1975 = {
	language: _Output1219;
	canonicalForm: _Output1925;
	family: _Output473;
	kind: _Output474;
};
type _Output1976 = {
	language: _Output1229;
	canonicalForm: _Output1925;
	family: _Output479;
	kind: _Output480;
};
type _Output1977 = {
	language: _Output1234;
	canonicalForm: _Output1925;
	family: _Output485;
	kind: _Output486;
};
type _Output1978 = {
	language: _Output1239;
	canonicalForm: _Output1925;
	family: _Output491;
	kind: _Output492;
};
type _Output1979 = {
	language: _Output1244;
	canonicalForm: _Output1925;
	family: _Output497;
	kind: _Output498;
};
type _Output1980 = {
	language: _Output1255;
	canonicalForm: _Output1925;
	family: _Output503;
	kind: _Output504;
};
type _Output1981 = {
	language: _Output1265;
	canonicalForm: _Output1925;
	family: _Output509;
	kind: _Output510;
};
type _Output1982 = {
	language: _Output1270;
	canonicalForm: _Output1925;
	family: _Output515;
	kind: _Output516;
};
type _Output1983 = {
	language: _Output1277;
	canonicalForm: _Output1925;
	family: _Output521;
	kind: _Output522;
};
type _Output1984 = {
	language: _Output1282;
	canonicalForm: _Output1925;
	family: _Output527;
	kind: _Output528;
};
type _Output1985 = {
	language: _Output1346;
	canonicalForm: _Output1925;
	family: _Output599;
	kind: _Output600;
};
type _Output1986 = {
	language: _Output1351;
	canonicalForm: _Output1925;
	family: _Output605;
	kind: _Output606;
};
type _Output1987 = {
	language: _Output1356;
	canonicalForm: _Output1925;
	family: _Output611;
	kind: _Output612;
};
type _Output1988 = {
	language: _Output1361;
	canonicalForm: _Output1925;
	family: _Output617;
	kind: _Output618;
};
type _Output1923 =
	| _Output1924
	| _Output1926
	| _Output1927
	| _Output1928
	| _Output1929
	| _Output1930
	| _Output1931
	| _Output1932
	| _Output1933
	| _Output1934
	| _Output1935
	| _Output1936
	| _Output1937
	| _Output1938
	| _Output1939
	| _Output1940
	| _Output1941
	| _Output1942
	| _Output1943
	| _Output1944
	| _Output1945
	| _Output1946
	| _Output1947
	| _Output1948
	| _Output1949
	| _Output1950
	| _Output1951
	| _Output1952
	| _Output1953
	| _Output1954
	| _Output1955
	| _Output1956
	| _Output1957
	| _Output1958
	| _Output1959
	| _Output1960
	| _Output1961
	| _Output1962
	| _Output1963
	| _Output1964
	| _Output1965
	| _Output1966
	| _Output1967
	| _Output1968
	| _Output1969
	| _Output1970
	| _Output1971
	| _Output1972
	| _Output1973
	| _Output1974
	| _Output1975
	| _Output1976
	| _Output1977
	| _Output1978
	| _Output1979
	| _Output1980
	| _Output1981
	| _Output1982
	| _Output1983
	| _Output1984
	| _Output1985
	| _Output1986
	| _Output1987
	| _Output1988;
type _Output1921 = { nodeKind: _Output1922; unitShadow: _Output1923 };
type _Output1990 = "structure";
type _Output1991 = Array<_Output1916>;
type _Output1989 = { nodeKind: _Output1990; children: _Output1991 };
type _Output1917 = _Output1918 | _Output1921 | _Output1989;
type _Output1916 = _Output1917;
type _Output1915 = Array<_Output1916>;
type _Output1913 = { nodeKind: _Output1914; children: _Output1915 };
type _Output1912 = { root: _Output1913 };
type _Output1910 = {
	kind: _Output1875;
	aspect: _Output1911;
	value: _Output1912;
};
type _Output1993 = "lexicalBreakdown";
type _Output1996 = {
	language: _Output629;
	canonicalForm: _Output1925;
	family: _Output35;
	kind: _Output36;
};
type _Output1997 = {
	language: _Output642;
	canonicalForm: _Output1925;
	family: _Output41;
	kind: _Output42;
};
type _Output1998 = {
	language: _Output657;
	canonicalForm: _Output1925;
	family: _Output47;
	kind: _Output48;
};
type _Output1999 = {
	language: _Output667;
	canonicalForm: _Output1925;
	family: _Output53;
	kind: _Output54;
};
type _Output2000 = {
	language: _Output674;
	canonicalForm: _Output1925;
	family: _Output59;
	kind: _Output60;
};
type _Output2001 = {
	language: _Output681;
	canonicalForm: _Output1925;
	family: _Output65;
	kind: _Output66;
};
type _Output2002 = {
	language: _Output701;
	canonicalForm: _Output1925;
	family: _Output71;
	kind: _Output72;
};
type _Output2003 = {
	language: _Output708;
	canonicalForm: _Output1925;
	family: _Output77;
	kind: _Output78;
};
type _Output2004 = {
	language: _Output717;
	canonicalForm: _Output1925;
	family: _Output83;
	kind: _Output84;
};
type _Output2005 = {
	language: _Output726;
	canonicalForm: _Output1925;
	family: _Output89;
	kind: _Output90;
};
type _Output2006 = {
	language: _Output736;
	canonicalForm: _Output1925;
	family: _Output95;
	kind: _Output96;
};
type _Output2007 = {
	language: _Output747;
	canonicalForm: _Output1925;
	family: _Output101;
	kind: _Output102;
};
type _Output2008 = {
	language: _Output772;
	canonicalForm: _Output1925;
	family: _Output107;
	kind: _Output108;
};
type _Output2009 = {
	language: _Output781;
	canonicalForm: _Output1925;
	family: _Output113;
	kind: _Output114;
};
type _Output2010 = {
	language: _Output788;
	canonicalForm: _Output1925;
	family: _Output119;
	kind: _Output120;
};
type _Output2011 = {
	language: _Output795;
	canonicalForm: _Output1925;
	family: _Output125;
	kind: _Output126;
};
type _Output2012 = {
	language: _Output803;
	canonicalForm: _Output1925;
	family: _Output131;
	kind: _Output132;
};
type _Output2013 = {
	language: _Output898;
	canonicalForm: _Output1925;
	family: _Output233;
	kind: _Output234;
};
type _Output2014 = {
	language: _Output912;
	canonicalForm: _Output1925;
	family: _Output239;
	kind: _Output240;
};
type _Output2015 = {
	language: _Output920;
	canonicalForm: _Output1925;
	family: _Output245;
	kind: _Output246;
};
type _Output2016 = {
	language: _Output938;
	canonicalForm: _Output1925;
	family: _Output251;
	kind: _Output252;
};
type _Output2017 = {
	language: _Output946;
	canonicalForm: _Output1925;
	family: _Output257;
	kind: _Output258;
};
type _Output2018 = {
	language: _Output954;
	canonicalForm: _Output1925;
	family: _Output263;
	kind: _Output264;
};
type _Output2019 = {
	language: _Output974;
	canonicalForm: _Output1925;
	family: _Output269;
	kind: _Output270;
};
type _Output2020 = {
	language: _Output985;
	canonicalForm: _Output1925;
	family: _Output275;
	kind: _Output276;
};
type _Output2021 = {
	language: _Output1000;
	canonicalForm: _Output1925;
	family: _Output281;
	kind: _Output282;
};
type _Output2022 = {
	language: _Output1012;
	canonicalForm: _Output1925;
	family: _Output287;
	kind: _Output288;
};
type _Output2023 = {
	language: _Output1020;
	canonicalForm: _Output1925;
	family: _Output293;
	kind: _Output294;
};
type _Output2024 = {
	language: _Output1030;
	canonicalForm: _Output1925;
	family: _Output299;
	kind: _Output300;
};
type _Output2025 = {
	language: _Output1047;
	canonicalForm: _Output1925;
	family: _Output305;
	kind: _Output306;
};
type _Output2026 = {
	language: _Output1057;
	canonicalForm: _Output1925;
	family: _Output311;
	kind: _Output312;
};
type _Output2027 = {
	language: _Output1062;
	canonicalForm: _Output1925;
	family: _Output317;
	kind: _Output318;
};
type _Output2028 = {
	language: _Output1072;
	canonicalForm: _Output1925;
	family: _Output323;
	kind: _Output324;
};
type _Output2029 = {
	language: _Output1080;
	canonicalForm: _Output1925;
	family: _Output329;
	kind: _Output330;
};
type _Output2030 = {
	language: _Output1174;
	canonicalForm: _Output1925;
	family: _Output431;
	kind: _Output432;
};
type _Output2031 = {
	language: _Output1180;
	canonicalForm: _Output1925;
	family: _Output437;
	kind: _Output438;
};
type _Output2032 = {
	language: _Output1188;
	canonicalForm: _Output1925;
	family: _Output443;
	kind: _Output444;
};
type _Output2033 = {
	language: _Output1195;
	canonicalForm: _Output1925;
	family: _Output449;
	kind: _Output450;
};
type _Output2034 = {
	language: _Output1202;
	canonicalForm: _Output1925;
	family: _Output455;
	kind: _Output456;
};
type _Output2035 = {
	language: _Output1207;
	canonicalForm: _Output1925;
	family: _Output461;
	kind: _Output462;
};
type _Output2036 = {
	language: _Output1214;
	canonicalForm: _Output1925;
	family: _Output467;
	kind: _Output468;
};
type _Output2037 = {
	language: _Output1219;
	canonicalForm: _Output1925;
	family: _Output473;
	kind: _Output474;
};
type _Output2038 = {
	language: _Output1229;
	canonicalForm: _Output1925;
	family: _Output479;
	kind: _Output480;
};
type _Output2039 = {
	language: _Output1234;
	canonicalForm: _Output1925;
	family: _Output485;
	kind: _Output486;
};
type _Output2040 = {
	language: _Output1239;
	canonicalForm: _Output1925;
	family: _Output491;
	kind: _Output492;
};
type _Output2041 = {
	language: _Output1244;
	canonicalForm: _Output1925;
	family: _Output497;
	kind: _Output498;
};
type _Output2042 = {
	language: _Output1255;
	canonicalForm: _Output1925;
	family: _Output503;
	kind: _Output504;
};
type _Output2043 = {
	language: _Output1265;
	canonicalForm: _Output1925;
	family: _Output509;
	kind: _Output510;
};
type _Output2044 = {
	language: _Output1270;
	canonicalForm: _Output1925;
	family: _Output515;
	kind: _Output516;
};
type _Output2045 = {
	language: _Output1277;
	canonicalForm: _Output1925;
	family: _Output521;
	kind: _Output522;
};
type _Output2046 = {
	language: _Output1282;
	canonicalForm: _Output1925;
	family: _Output527;
	kind: _Output528;
};
type _Output1995 =
	| _Output1996
	| _Output1997
	| _Output1998
	| _Output1999
	| _Output2000
	| _Output2001
	| _Output2002
	| _Output2003
	| _Output2004
	| _Output2005
	| _Output2006
	| _Output2007
	| _Output2008
	| _Output2009
	| _Output2010
	| _Output2011
	| _Output2012
	| _Output2013
	| _Output2014
	| _Output2015
	| _Output2016
	| _Output2017
	| _Output2018
	| _Output2019
	| _Output2020
	| _Output2021
	| _Output2022
	| _Output2023
	| _Output2024
	| _Output2025
	| _Output2026
	| _Output2027
	| _Output2028
	| _Output2029
	| _Output2030
	| _Output2031
	| _Output2032
	| _Output2033
	| _Output2034
	| _Output2035
	| _Output2036
	| _Output2037
	| _Output2038
	| _Output2039
	| _Output2040
	| _Output2041
	| _Output2042
	| _Output2043
	| _Output2044
	| _Output2045
	| _Output2046;
type _Output1994 = [_Output1995, _Output1995, ...Array<_Output1995>];
type _Output1992 = {
	kind: _Output1875;
	aspect: _Output1993;
	value: _Output1994;
};
type _Output2048 = "Retract";
type _Output2049 = "morphologicalTree" | "lexicalBreakdown";
type _Output2047 = { kind: _Output2048; aspect: _Output2049 };
type _Output1873 =
	| _Output1874
	| _Output1878
	| _Output1880
	| _Output1884
	| _Output1887
	| _Output1893
	| _Output1900
	| _Output1905
	| _Output1910
	| _Output1992
	| _Output2047;
type _Output1872 = Array<_Output1873>;
type _Output2053 = {
	language: _Output623;
	canonicalForm: _Output1925;
	family: _Output27;
	kind: _Output28;
};
type _Output2054 = {
	language: _Output629;
	canonicalForm: _Output1925;
	family: _Output35;
	kind: _Output36;
};
type _Output2055 = {
	language: _Output642;
	canonicalForm: _Output1925;
	family: _Output41;
	kind: _Output42;
};
type _Output2056 = {
	language: _Output657;
	canonicalForm: _Output1925;
	family: _Output47;
	kind: _Output48;
};
type _Output2057 = {
	language: _Output667;
	canonicalForm: _Output1925;
	family: _Output53;
	kind: _Output54;
};
type _Output2058 = {
	language: _Output674;
	canonicalForm: _Output1925;
	family: _Output59;
	kind: _Output60;
};
type _Output2059 = {
	language: _Output681;
	canonicalForm: _Output1925;
	family: _Output65;
	kind: _Output66;
};
type _Output2060 = {
	language: _Output701;
	canonicalForm: _Output1925;
	family: _Output71;
	kind: _Output72;
};
type _Output2061 = {
	language: _Output708;
	canonicalForm: _Output1925;
	family: _Output77;
	kind: _Output78;
};
type _Output2062 = {
	language: _Output717;
	canonicalForm: _Output1925;
	family: _Output83;
	kind: _Output84;
};
type _Output2063 = {
	language: _Output726;
	canonicalForm: _Output1925;
	family: _Output89;
	kind: _Output90;
};
type _Output2064 = {
	language: _Output736;
	canonicalForm: _Output1925;
	family: _Output95;
	kind: _Output96;
};
type _Output2065 = {
	language: _Output747;
	canonicalForm: _Output1925;
	family: _Output101;
	kind: _Output102;
};
type _Output2066 = {
	language: _Output772;
	canonicalForm: _Output1925;
	family: _Output107;
	kind: _Output108;
};
type _Output2067 = {
	language: _Output781;
	canonicalForm: _Output1925;
	family: _Output113;
	kind: _Output114;
};
type _Output2068 = {
	language: _Output788;
	canonicalForm: _Output1925;
	family: _Output119;
	kind: _Output120;
};
type _Output2069 = {
	language: _Output795;
	canonicalForm: _Output1925;
	family: _Output125;
	kind: _Output126;
};
type _Output2070 = {
	language: _Output803;
	canonicalForm: _Output1925;
	family: _Output131;
	kind: _Output132;
};
type _Output2071 = {
	language: _Output815;
	canonicalForm: _Output1925;
	family: _Output137;
	kind: _Output138;
};
type _Output2072 = {
	language: _Output820;
	canonicalForm: _Output1925;
	family: _Output143;
	kind: _Output144;
};
type _Output2073 = {
	language: _Output825;
	canonicalForm: _Output1925;
	family: _Output149;
	kind: _Output150;
};
type _Output2074 = {
	language: _Output830;
	canonicalForm: _Output1925;
	family: _Output155;
	kind: _Output156;
};
type _Output2075 = {
	language: _Output835;
	canonicalForm: _Output1925;
	family: _Output161;
	kind: _Output162;
};
type _Output2076 = {
	language: _Output840;
	canonicalForm: _Output1925;
	family: _Output167;
	kind: _Output168;
};
type _Output2077 = {
	language: _Output846;
	canonicalForm: _Output1925;
	family: _Output173;
	kind: _Output174;
};
type _Output2078 = {
	language: _Output851;
	canonicalForm: _Output1925;
	family: _Output179;
	kind: _Output180;
};
type _Output2079 = {
	language: _Output856;
	canonicalForm: _Output1925;
	family: _Output185;
	kind: _Output186;
};
type _Output2080 = {
	language: _Output861;
	canonicalForm: _Output1925;
	family: _Output191;
	kind: _Output192;
};
type _Output2081 = {
	language: _Output866;
	canonicalForm: _Output1925;
	family: _Output197;
	kind: _Output198;
};
type _Output2082 = {
	language: _Output871;
	canonicalForm: _Output1925;
	family: _Output203;
	kind: _Output204;
};
type _Output2083 = {
	language: _Output876;
	canonicalForm: _Output1925;
	family: _Output209;
	kind: _Output210;
};
type _Output2084 = {
	language: _Output883;
	canonicalForm: _Output1925;
	family: _Output215;
	kind: _Output216;
};
type _Output2085 = {
	language: _Output888;
	canonicalForm: _Output1925;
	family: _Output221;
	kind: _Output222;
};
type _Output2086 = {
	language: _Output893;
	canonicalForm: _Output1925;
	family: _Output227;
	kind: _Output228;
};
type _Output2087 = {
	language: _Output898;
	canonicalForm: _Output1925;
	family: _Output233;
	kind: _Output234;
};
type _Output2088 = {
	language: _Output912;
	canonicalForm: _Output1925;
	family: _Output239;
	kind: _Output240;
};
type _Output2089 = {
	language: _Output920;
	canonicalForm: _Output1925;
	family: _Output245;
	kind: _Output246;
};
type _Output2090 = {
	language: _Output938;
	canonicalForm: _Output1925;
	family: _Output251;
	kind: _Output252;
};
type _Output2091 = {
	language: _Output946;
	canonicalForm: _Output1925;
	family: _Output257;
	kind: _Output258;
};
type _Output2092 = {
	language: _Output954;
	canonicalForm: _Output1925;
	family: _Output263;
	kind: _Output264;
};
type _Output2093 = {
	language: _Output974;
	canonicalForm: _Output1925;
	family: _Output269;
	kind: _Output270;
};
type _Output2094 = {
	language: _Output985;
	canonicalForm: _Output1925;
	family: _Output275;
	kind: _Output276;
};
type _Output2095 = {
	language: _Output1000;
	canonicalForm: _Output1925;
	family: _Output281;
	kind: _Output282;
};
type _Output2096 = {
	language: _Output1012;
	canonicalForm: _Output1925;
	family: _Output287;
	kind: _Output288;
};
type _Output2097 = {
	language: _Output1020;
	canonicalForm: _Output1925;
	family: _Output293;
	kind: _Output294;
};
type _Output2098 = {
	language: _Output1030;
	canonicalForm: _Output1925;
	family: _Output299;
	kind: _Output300;
};
type _Output2099 = {
	language: _Output1047;
	canonicalForm: _Output1925;
	family: _Output305;
	kind: _Output306;
};
type _Output2100 = {
	language: _Output1057;
	canonicalForm: _Output1925;
	family: _Output311;
	kind: _Output312;
};
type _Output2101 = {
	language: _Output1062;
	canonicalForm: _Output1925;
	family: _Output317;
	kind: _Output318;
};
type _Output2102 = {
	language: _Output1072;
	canonicalForm: _Output1925;
	family: _Output323;
	kind: _Output324;
};
type _Output2103 = {
	language: _Output1080;
	canonicalForm: _Output1925;
	family: _Output329;
	kind: _Output330;
};
type _Output2104 = {
	language: _Output1093;
	canonicalForm: _Output1925;
	family: _Output335;
	kind: _Output336;
};
type _Output2105 = {
	language: _Output1098;
	canonicalForm: _Output1925;
	family: _Output341;
	kind: _Output342;
};
type _Output2106 = {
	language: _Output1103;
	canonicalForm: _Output1925;
	family: _Output347;
	kind: _Output348;
};
type _Output2107 = {
	language: _Output1108;
	canonicalForm: _Output1925;
	family: _Output353;
	kind: _Output354;
};
type _Output2108 = {
	language: _Output1113;
	canonicalForm: _Output1925;
	family: _Output359;
	kind: _Output360;
};
type _Output2109 = {
	language: _Output1118;
	canonicalForm: _Output1925;
	family: _Output365;
	kind: _Output366;
};
type _Output2110 = {
	language: _Output1123;
	canonicalForm: _Output1925;
	family: _Output371;
	kind: _Output372;
};
type _Output2111 = {
	language: _Output1128;
	canonicalForm: _Output1925;
	family: _Output377;
	kind: _Output378;
};
type _Output2112 = {
	language: _Output1133;
	canonicalForm: _Output1925;
	family: _Output383;
	kind: _Output384;
};
type _Output2113 = {
	language: _Output1138;
	canonicalForm: _Output1925;
	family: _Output389;
	kind: _Output390;
};
type _Output2114 = {
	language: _Output1143;
	canonicalForm: _Output1925;
	family: _Output395;
	kind: _Output396;
};
type _Output2115 = {
	language: _Output1148;
	canonicalForm: _Output1925;
	family: _Output401;
	kind: _Output402;
};
type _Output2116 = {
	language: _Output1153;
	canonicalForm: _Output1925;
	family: _Output407;
	kind: _Output408;
};
type _Output2117 = {
	language: _Output1159;
	canonicalForm: _Output1925;
	family: _Output413;
	kind: _Output414;
};
type _Output2118 = {
	language: _Output1164;
	canonicalForm: _Output1925;
	family: _Output419;
	kind: _Output420;
};
type _Output2119 = {
	language: _Output1169;
	canonicalForm: _Output1925;
	family: _Output425;
	kind: _Output426;
};
type _Output2120 = {
	language: _Output1174;
	canonicalForm: _Output1925;
	family: _Output431;
	kind: _Output432;
};
type _Output2121 = {
	language: _Output1180;
	canonicalForm: _Output1925;
	family: _Output437;
	kind: _Output438;
};
type _Output2122 = {
	language: _Output1188;
	canonicalForm: _Output1925;
	family: _Output443;
	kind: _Output444;
};
type _Output2123 = {
	language: _Output1195;
	canonicalForm: _Output1925;
	family: _Output449;
	kind: _Output450;
};
type _Output2124 = {
	language: _Output1202;
	canonicalForm: _Output1925;
	family: _Output455;
	kind: _Output456;
};
type _Output2125 = {
	language: _Output1207;
	canonicalForm: _Output1925;
	family: _Output461;
	kind: _Output462;
};
type _Output2126 = {
	language: _Output1214;
	canonicalForm: _Output1925;
	family: _Output467;
	kind: _Output468;
};
type _Output2127 = {
	language: _Output1219;
	canonicalForm: _Output1925;
	family: _Output473;
	kind: _Output474;
};
type _Output2128 = {
	language: _Output1229;
	canonicalForm: _Output1925;
	family: _Output479;
	kind: _Output480;
};
type _Output2129 = {
	language: _Output1234;
	canonicalForm: _Output1925;
	family: _Output485;
	kind: _Output486;
};
type _Output2130 = {
	language: _Output1239;
	canonicalForm: _Output1925;
	family: _Output491;
	kind: _Output492;
};
type _Output2131 = {
	language: _Output1244;
	canonicalForm: _Output1925;
	family: _Output497;
	kind: _Output498;
};
type _Output2132 = {
	language: _Output1255;
	canonicalForm: _Output1925;
	family: _Output503;
	kind: _Output504;
};
type _Output2133 = {
	language: _Output1265;
	canonicalForm: _Output1925;
	family: _Output509;
	kind: _Output510;
};
type _Output2134 = {
	language: _Output1270;
	canonicalForm: _Output1925;
	family: _Output515;
	kind: _Output516;
};
type _Output2135 = {
	language: _Output1277;
	canonicalForm: _Output1925;
	family: _Output521;
	kind: _Output522;
};
type _Output2136 = {
	language: _Output1282;
	canonicalForm: _Output1925;
	family: _Output527;
	kind: _Output528;
};
type _Output2137 = {
	language: _Output1291;
	canonicalForm: _Output1925;
	family: _Output533;
	kind: _Output534;
};
type _Output2138 = {
	language: _Output1296;
	canonicalForm: _Output1925;
	family: _Output539;
	kind: _Output540;
};
type _Output2139 = {
	language: _Output1301;
	canonicalForm: _Output1925;
	family: _Output545;
	kind: _Output546;
};
type _Output2140 = {
	language: _Output1306;
	canonicalForm: _Output1925;
	family: _Output551;
	kind: _Output552;
};
type _Output2141 = {
	language: _Output1311;
	canonicalForm: _Output1925;
	family: _Output557;
	kind: _Output558;
};
type _Output2142 = {
	language: _Output1316;
	canonicalForm: _Output1925;
	family: _Output563;
	kind: _Output564;
};
type _Output2143 = {
	language: _Output1321;
	canonicalForm: _Output1925;
	family: _Output569;
	kind: _Output570;
};
type _Output2144 = {
	language: _Output1326;
	canonicalForm: _Output1925;
	family: _Output575;
	kind: _Output576;
};
type _Output2145 = {
	language: _Output1331;
	canonicalForm: _Output1925;
	family: _Output581;
	kind: _Output582;
};
type _Output2146 = {
	language: _Output1336;
	canonicalForm: _Output1925;
	family: _Output587;
	kind: _Output588;
};
type _Output2147 = {
	language: _Output1341;
	canonicalForm: _Output1925;
	family: _Output593;
	kind: _Output594;
};
type _Output2148 = {
	language: _Output1346;
	canonicalForm: _Output1925;
	family: _Output599;
	kind: _Output600;
};
type _Output2149 = {
	language: _Output1351;
	canonicalForm: _Output1925;
	family: _Output605;
	kind: _Output606;
};
type _Output2150 = {
	language: _Output1356;
	canonicalForm: _Output1925;
	family: _Output611;
	kind: _Output612;
};
type _Output2151 = {
	language: _Output1361;
	canonicalForm: _Output1925;
	family: _Output617;
	kind: _Output618;
};
type _Output2052 =
	| _Output2053
	| _Output2054
	| _Output2055
	| _Output2056
	| _Output2057
	| _Output2058
	| _Output2059
	| _Output2060
	| _Output2061
	| _Output2062
	| _Output2063
	| _Output2064
	| _Output2065
	| _Output2066
	| _Output2067
	| _Output2068
	| _Output2069
	| _Output2070
	| _Output2071
	| _Output2072
	| _Output2073
	| _Output2074
	| _Output2075
	| _Output2076
	| _Output2077
	| _Output2078
	| _Output2079
	| _Output2080
	| _Output2081
	| _Output2082
	| _Output2083
	| _Output2084
	| _Output2085
	| _Output2086
	| _Output2087
	| _Output2088
	| _Output2089
	| _Output2090
	| _Output2091
	| _Output2092
	| _Output2093
	| _Output2094
	| _Output2095
	| _Output2096
	| _Output2097
	| _Output2098
	| _Output2099
	| _Output2100
	| _Output2101
	| _Output2102
	| _Output2103
	| _Output2104
	| _Output2105
	| _Output2106
	| _Output2107
	| _Output2108
	| _Output2109
	| _Output2110
	| _Output2111
	| _Output2112
	| _Output2113
	| _Output2114
	| _Output2115
	| _Output2116
	| _Output2117
	| _Output2118
	| _Output2119
	| _Output2120
	| _Output2121
	| _Output2122
	| _Output2123
	| _Output2124
	| _Output2125
	| _Output2126
	| _Output2127
	| _Output2128
	| _Output2129
	| _Output2130
	| _Output2131
	| _Output2132
	| _Output2133
	| _Output2134
	| _Output2135
	| _Output2136
	| _Output2137
	| _Output2138
	| _Output2139
	| _Output2140
	| _Output2141
	| _Output2142
	| _Output2143
	| _Output2144
	| _Output2145
	| _Output2146
	| _Output2147
	| _Output2148
	| _Output2149
	| _Output2150
	| _Output2151;
type _Output2051 = { relation: _Output1895; target: _Output2052 };
type _Output2050 = Array<_Output2051>;
type _Output1871 = { changes: _Output1872; pendingRelations: _Output2050 };
export type Segment = _Output0;
export type SegmentedSentence = _Output3;
export type SegmentationDecision = _Output7;
export type Encounter = _Output22;
export type GenerationInput = _Output619;
export type ComparisonInput = _Output1363;
export type KnowledgeInput = _Output1563;
export type SegmentInput = _Output1868;
export type KnowledgeProduction = _Output1871;
