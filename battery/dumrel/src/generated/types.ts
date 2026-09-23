// Generated from canonical Dumrel Zod schemas. Run bun run generate.
type _Output2 = boolean;
type _Output1 = _Output2 | undefined;
type _Output4 = { en?: _Output1; ru?: _Output1 };
type _Output3 = _Output4 | undefined;
type _Output6 = {
	synonym?: _Output1;
	nearSynonym?: _Output1;
	antonym?: _Output1;
	nearAntonym?: _Output1;
	hypernym?: _Output1;
	hyponym?: _Output1;
	meronym?: _Output1;
	holonym?: _Output1;
};
type _Output5 = _Output6 | undefined;
type _Output0 = {
	transcription?: _Output1;
	definition?: _Output1;
	morphologicalTree?: _Output1;
	lexicalBreakdown?: _Output1;
	governedPrepositions?: _Output1;
	translations?: _Output3;
	semanticRelations?: _Output5;
};
type _Output9 = null;
type _Output8 = _Output9 | undefined;
type _Output11 = { en?: _Output8; ru?: _Output8 };
type _Output10 = _Output11 | undefined;
type _Output13 = {
	synonym?: _Output8;
	nearSynonym?: _Output8;
	antonym?: _Output8;
	nearAntonym?: _Output8;
	hypernym?: _Output8;
	hyponym?: _Output8;
	meronym?: _Output8;
	holonym?: _Output8;
};
type _Output12 = _Output13 | undefined;
type _Output7 = {
	transcription?: _Output8;
	definition?: _Output8;
	morphologicalTree?: _Output8;
	lexicalBreakdown?: _Output8;
	governedPrepositions?: _Output8;
	translations?: _Output10;
	semanticRelations?: _Output12;
};
type _Output17 = "de";
type _Output18 = "Lexeme";
type _Output19 = "ADJ";
type _Output16 = { language: _Output17; family: _Output18; kind: _Output19 };
type _Output21 = "de";
type _Output22 = "Lexeme";
type _Output23 = "ADP";
type _Output20 = { language: _Output21; family: _Output22; kind: _Output23 };
type _Output25 = "de";
type _Output26 = "Lexeme";
type _Output27 = "ADV";
type _Output24 = { language: _Output25; family: _Output26; kind: _Output27 };
type _Output29 = "de";
type _Output30 = "Lexeme";
type _Output31 = "AUX";
type _Output28 = { language: _Output29; family: _Output30; kind: _Output31 };
type _Output33 = "de";
type _Output34 = "Lexeme";
type _Output35 = "CCONJ";
type _Output32 = { language: _Output33; family: _Output34; kind: _Output35 };
type _Output37 = "de";
type _Output38 = "Lexeme";
type _Output39 = "DET";
type _Output36 = { language: _Output37; family: _Output38; kind: _Output39 };
type _Output41 = "de";
type _Output42 = "Lexeme";
type _Output43 = "INTJ";
type _Output40 = { language: _Output41; family: _Output42; kind: _Output43 };
type _Output45 = "de";
type _Output46 = "Lexeme";
type _Output47 = "NOUN";
type _Output44 = { language: _Output45; family: _Output46; kind: _Output47 };
type _Output49 = "de";
type _Output50 = "Lexeme";
type _Output51 = "NUM";
type _Output48 = { language: _Output49; family: _Output50; kind: _Output51 };
type _Output53 = "de";
type _Output54 = "Lexeme";
type _Output55 = "X";
type _Output52 = { language: _Output53; family: _Output54; kind: _Output55 };
type _Output57 = "de";
type _Output58 = "Lexeme";
type _Output59 = "PART";
type _Output56 = { language: _Output57; family: _Output58; kind: _Output59 };
type _Output61 = "de";
type _Output62 = "Lexeme";
type _Output63 = "PRON";
type _Output60 = { language: _Output61; family: _Output62; kind: _Output63 };
type _Output65 = "de";
type _Output66 = "Lexeme";
type _Output67 = "PROPN";
type _Output64 = { language: _Output65; family: _Output66; kind: _Output67 };
type _Output69 = "de";
type _Output70 = "Lexeme";
type _Output71 = "PUNCT";
type _Output68 = { language: _Output69; family: _Output70; kind: _Output71 };
type _Output73 = "de";
type _Output74 = "Lexeme";
type _Output75 = "SCONJ";
type _Output72 = { language: _Output73; family: _Output74; kind: _Output75 };
type _Output77 = "de";
type _Output78 = "Lexeme";
type _Output79 = "SYM";
type _Output76 = { language: _Output77; family: _Output78; kind: _Output79 };
type _Output81 = "de";
type _Output82 = "Lexeme";
type _Output83 = "VERB";
type _Output80 = { language: _Output81; family: _Output82; kind: _Output83 };
type _Output85 = "de";
type _Output86 = "Morpheme";
type _Output87 = "Circumfix";
type _Output84 = { language: _Output85; family: _Output86; kind: _Output87 };
type _Output89 = "de";
type _Output90 = "Morpheme";
type _Output91 = "Clitic";
type _Output88 = { language: _Output89; family: _Output90; kind: _Output91 };
type _Output93 = "de";
type _Output94 = "Morpheme";
type _Output95 = "Duplifix";
type _Output92 = { language: _Output93; family: _Output94; kind: _Output95 };
type _Output97 = "de";
type _Output98 = "Morpheme";
type _Output99 = "Infix";
type _Output96 = { language: _Output97; family: _Output98; kind: _Output99 };
type _Output101 = "de";
type _Output102 = "Morpheme";
type _Output103 = "Interfix";
type _Output100 = {
	language: _Output101;
	family: _Output102;
	kind: _Output103;
};
type _Output105 = "de";
type _Output106 = "Morpheme";
type _Output107 = "Prefix";
type _Output104 = {
	language: _Output105;
	family: _Output106;
	kind: _Output107;
};
type _Output109 = "de";
type _Output110 = "Morpheme";
type _Output111 = "Root";
type _Output108 = {
	language: _Output109;
	family: _Output110;
	kind: _Output111;
};
type _Output113 = "de";
type _Output114 = "Morpheme";
type _Output115 = "Suffix";
type _Output112 = {
	language: _Output113;
	family: _Output114;
	kind: _Output115;
};
type _Output117 = "de";
type _Output118 = "Morpheme";
type _Output119 = "Suffixoid";
type _Output116 = {
	language: _Output117;
	family: _Output118;
	kind: _Output119;
};
type _Output121 = "de";
type _Output122 = "Morpheme";
type _Output123 = "Transfix";
type _Output120 = {
	language: _Output121;
	family: _Output122;
	kind: _Output123;
};
type _Output125 = "de";
type _Output126 = "Phraseme";
type _Output127 = "Aphorism";
type _Output124 = {
	language: _Output125;
	family: _Output126;
	kind: _Output127;
};
type _Output129 = "de";
type _Output130 = "Phraseme";
type _Output131 = "Collocation";
type _Output128 = {
	language: _Output129;
	family: _Output130;
	kind: _Output131;
};
type _Output133 = "de";
type _Output134 = "Phraseme";
type _Output135 = "DiscourseFormula";
type _Output132 = {
	language: _Output133;
	family: _Output134;
	kind: _Output135;
};
type _Output137 = "de";
type _Output138 = "Phraseme";
type _Output139 = "Idiom";
type _Output136 = {
	language: _Output137;
	family: _Output138;
	kind: _Output139;
};
type _Output141 = "de";
type _Output142 = "Phraseme";
type _Output143 = "Proverb";
type _Output140 = {
	language: _Output141;
	family: _Output142;
	kind: _Output143;
};
type _Output145 = "en";
type _Output146 = "Lexeme";
type _Output147 = "ADJ";
type _Output144 = {
	language: _Output145;
	family: _Output146;
	kind: _Output147;
};
type _Output149 = "en";
type _Output150 = "Lexeme";
type _Output151 = "ADP";
type _Output148 = {
	language: _Output149;
	family: _Output150;
	kind: _Output151;
};
type _Output153 = "en";
type _Output154 = "Lexeme";
type _Output155 = "ADV";
type _Output152 = {
	language: _Output153;
	family: _Output154;
	kind: _Output155;
};
type _Output157 = "en";
type _Output158 = "Lexeme";
type _Output159 = "AUX";
type _Output156 = {
	language: _Output157;
	family: _Output158;
	kind: _Output159;
};
type _Output161 = "en";
type _Output162 = "Lexeme";
type _Output163 = "CCONJ";
type _Output160 = {
	language: _Output161;
	family: _Output162;
	kind: _Output163;
};
type _Output165 = "en";
type _Output166 = "Lexeme";
type _Output167 = "DET";
type _Output164 = {
	language: _Output165;
	family: _Output166;
	kind: _Output167;
};
type _Output169 = "en";
type _Output170 = "Lexeme";
type _Output171 = "INTJ";
type _Output168 = {
	language: _Output169;
	family: _Output170;
	kind: _Output171;
};
type _Output173 = "en";
type _Output174 = "Lexeme";
type _Output175 = "NOUN";
type _Output172 = {
	language: _Output173;
	family: _Output174;
	kind: _Output175;
};
type _Output177 = "en";
type _Output178 = "Lexeme";
type _Output179 = "NUM";
type _Output176 = {
	language: _Output177;
	family: _Output178;
	kind: _Output179;
};
type _Output181 = "en";
type _Output182 = "Lexeme";
type _Output183 = "X";
type _Output180 = {
	language: _Output181;
	family: _Output182;
	kind: _Output183;
};
type _Output185 = "en";
type _Output186 = "Lexeme";
type _Output187 = "PART";
type _Output184 = {
	language: _Output185;
	family: _Output186;
	kind: _Output187;
};
type _Output189 = "en";
type _Output190 = "Lexeme";
type _Output191 = "PRON";
type _Output188 = {
	language: _Output189;
	family: _Output190;
	kind: _Output191;
};
type _Output193 = "en";
type _Output194 = "Lexeme";
type _Output195 = "PROPN";
type _Output192 = {
	language: _Output193;
	family: _Output194;
	kind: _Output195;
};
type _Output197 = "en";
type _Output198 = "Lexeme";
type _Output199 = "PUNCT";
type _Output196 = {
	language: _Output197;
	family: _Output198;
	kind: _Output199;
};
type _Output201 = "en";
type _Output202 = "Lexeme";
type _Output203 = "SCONJ";
type _Output200 = {
	language: _Output201;
	family: _Output202;
	kind: _Output203;
};
type _Output205 = "en";
type _Output206 = "Lexeme";
type _Output207 = "SYM";
type _Output204 = {
	language: _Output205;
	family: _Output206;
	kind: _Output207;
};
type _Output209 = "en";
type _Output210 = "Lexeme";
type _Output211 = "VERB";
type _Output208 = {
	language: _Output209;
	family: _Output210;
	kind: _Output211;
};
type _Output213 = "en";
type _Output214 = "Morpheme";
type _Output215 = "Circumfix";
type _Output212 = {
	language: _Output213;
	family: _Output214;
	kind: _Output215;
};
type _Output217 = "en";
type _Output218 = "Morpheme";
type _Output219 = "Clitic";
type _Output216 = {
	language: _Output217;
	family: _Output218;
	kind: _Output219;
};
type _Output221 = "en";
type _Output222 = "Morpheme";
type _Output223 = "Duplifix";
type _Output220 = {
	language: _Output221;
	family: _Output222;
	kind: _Output223;
};
type _Output225 = "en";
type _Output226 = "Morpheme";
type _Output227 = "Infix";
type _Output224 = {
	language: _Output225;
	family: _Output226;
	kind: _Output227;
};
type _Output229 = "en";
type _Output230 = "Morpheme";
type _Output231 = "Interfix";
type _Output228 = {
	language: _Output229;
	family: _Output230;
	kind: _Output231;
};
type _Output233 = "en";
type _Output234 = "Morpheme";
type _Output235 = "Prefix";
type _Output232 = {
	language: _Output233;
	family: _Output234;
	kind: _Output235;
};
type _Output237 = "en";
type _Output238 = "Morpheme";
type _Output239 = "Root";
type _Output236 = {
	language: _Output237;
	family: _Output238;
	kind: _Output239;
};
type _Output241 = "en";
type _Output242 = "Morpheme";
type _Output243 = "Suffix";
type _Output240 = {
	language: _Output241;
	family: _Output242;
	kind: _Output243;
};
type _Output245 = "en";
type _Output246 = "Morpheme";
type _Output247 = "Suffixoid";
type _Output244 = {
	language: _Output245;
	family: _Output246;
	kind: _Output247;
};
type _Output249 = "en";
type _Output250 = "Morpheme";
type _Output251 = "ToneMarking";
type _Output248 = {
	language: _Output249;
	family: _Output250;
	kind: _Output251;
};
type _Output253 = "en";
type _Output254 = "Morpheme";
type _Output255 = "Transfix";
type _Output252 = {
	language: _Output253;
	family: _Output254;
	kind: _Output255;
};
type _Output257 = "en";
type _Output258 = "Phraseme";
type _Output259 = "Aphorism";
type _Output256 = {
	language: _Output257;
	family: _Output258;
	kind: _Output259;
};
type _Output261 = "en";
type _Output262 = "Phraseme";
type _Output263 = "DiscourseFormula";
type _Output260 = {
	language: _Output261;
	family: _Output262;
	kind: _Output263;
};
type _Output265 = "en";
type _Output266 = "Phraseme";
type _Output267 = "Idiom";
type _Output264 = {
	language: _Output265;
	family: _Output266;
	kind: _Output267;
};
type _Output269 = "en";
type _Output270 = "Phraseme";
type _Output271 = "Proverb";
type _Output268 = {
	language: _Output269;
	family: _Output270;
	kind: _Output271;
};
type _Output273 = "he";
type _Output274 = "Lexeme";
type _Output275 = "ADJ";
type _Output272 = {
	language: _Output273;
	family: _Output274;
	kind: _Output275;
};
type _Output277 = "he";
type _Output278 = "Lexeme";
type _Output279 = "ADP";
type _Output276 = {
	language: _Output277;
	family: _Output278;
	kind: _Output279;
};
type _Output281 = "he";
type _Output282 = "Lexeme";
type _Output283 = "ADV";
type _Output280 = {
	language: _Output281;
	family: _Output282;
	kind: _Output283;
};
type _Output285 = "he";
type _Output286 = "Lexeme";
type _Output287 = "AUX";
type _Output284 = {
	language: _Output285;
	family: _Output286;
	kind: _Output287;
};
type _Output289 = "he";
type _Output290 = "Lexeme";
type _Output291 = "CCONJ";
type _Output288 = {
	language: _Output289;
	family: _Output290;
	kind: _Output291;
};
type _Output293 = "he";
type _Output294 = "Lexeme";
type _Output295 = "DET";
type _Output292 = {
	language: _Output293;
	family: _Output294;
	kind: _Output295;
};
type _Output297 = "he";
type _Output298 = "Lexeme";
type _Output299 = "INTJ";
type _Output296 = {
	language: _Output297;
	family: _Output298;
	kind: _Output299;
};
type _Output301 = "he";
type _Output302 = "Lexeme";
type _Output303 = "NOUN";
type _Output300 = {
	language: _Output301;
	family: _Output302;
	kind: _Output303;
};
type _Output305 = "he";
type _Output306 = "Lexeme";
type _Output307 = "NUM";
type _Output304 = {
	language: _Output305;
	family: _Output306;
	kind: _Output307;
};
type _Output309 = "he";
type _Output310 = "Lexeme";
type _Output311 = "X";
type _Output308 = {
	language: _Output309;
	family: _Output310;
	kind: _Output311;
};
type _Output313 = "he";
type _Output314 = "Lexeme";
type _Output315 = "PART";
type _Output312 = {
	language: _Output313;
	family: _Output314;
	kind: _Output315;
};
type _Output317 = "he";
type _Output318 = "Lexeme";
type _Output319 = "PRON";
type _Output316 = {
	language: _Output317;
	family: _Output318;
	kind: _Output319;
};
type _Output321 = "he";
type _Output322 = "Lexeme";
type _Output323 = "PROPN";
type _Output320 = {
	language: _Output321;
	family: _Output322;
	kind: _Output323;
};
type _Output325 = "he";
type _Output326 = "Lexeme";
type _Output327 = "PUNCT";
type _Output324 = {
	language: _Output325;
	family: _Output326;
	kind: _Output327;
};
type _Output329 = "he";
type _Output330 = "Lexeme";
type _Output331 = "SCONJ";
type _Output328 = {
	language: _Output329;
	family: _Output330;
	kind: _Output331;
};
type _Output333 = "he";
type _Output334 = "Lexeme";
type _Output335 = "SYM";
type _Output332 = {
	language: _Output333;
	family: _Output334;
	kind: _Output335;
};
type _Output337 = "he";
type _Output338 = "Lexeme";
type _Output339 = "VERB";
type _Output336 = {
	language: _Output337;
	family: _Output338;
	kind: _Output339;
};
type _Output341 = "he";
type _Output342 = "Morpheme";
type _Output343 = "Circumfix";
type _Output340 = {
	language: _Output341;
	family: _Output342;
	kind: _Output343;
};
type _Output345 = "he";
type _Output346 = "Morpheme";
type _Output347 = "Clitic";
type _Output344 = {
	language: _Output345;
	family: _Output346;
	kind: _Output347;
};
type _Output349 = "he";
type _Output350 = "Morpheme";
type _Output351 = "Duplifix";
type _Output348 = {
	language: _Output349;
	family: _Output350;
	kind: _Output351;
};
type _Output353 = "he";
type _Output354 = "Morpheme";
type _Output355 = "Infix";
type _Output352 = {
	language: _Output353;
	family: _Output354;
	kind: _Output355;
};
type _Output357 = "he";
type _Output358 = "Morpheme";
type _Output359 = "Interfix";
type _Output356 = {
	language: _Output357;
	family: _Output358;
	kind: _Output359;
};
type _Output361 = "he";
type _Output362 = "Morpheme";
type _Output363 = "Prefix";
type _Output360 = {
	language: _Output361;
	family: _Output362;
	kind: _Output363;
};
type _Output365 = "he";
type _Output366 = "Morpheme";
type _Output367 = "Root";
type _Output364 = {
	language: _Output365;
	family: _Output366;
	kind: _Output367;
};
type _Output369 = "he";
type _Output370 = "Morpheme";
type _Output371 = "Suffix";
type _Output368 = {
	language: _Output369;
	family: _Output370;
	kind: _Output371;
};
type _Output373 = "he";
type _Output374 = "Morpheme";
type _Output375 = "Suffixoid";
type _Output372 = {
	language: _Output373;
	family: _Output374;
	kind: _Output375;
};
type _Output377 = "he";
type _Output378 = "Morpheme";
type _Output379 = "ToneMarking";
type _Output376 = {
	language: _Output377;
	family: _Output378;
	kind: _Output379;
};
type _Output381 = "he";
type _Output382 = "Morpheme";
type _Output383 = "Transfix";
type _Output380 = {
	language: _Output381;
	family: _Output382;
	kind: _Output383;
};
type _Output385 = "he";
type _Output386 = "Phraseme";
type _Output387 = "Aphorism";
type _Output384 = {
	language: _Output385;
	family: _Output386;
	kind: _Output387;
};
type _Output389 = "he";
type _Output390 = "Phraseme";
type _Output391 = "DiscourseFormula";
type _Output388 = {
	language: _Output389;
	family: _Output390;
	kind: _Output391;
};
type _Output393 = "he";
type _Output394 = "Phraseme";
type _Output395 = "Idiom";
type _Output392 = {
	language: _Output393;
	family: _Output394;
	kind: _Output395;
};
type _Output397 = "he";
type _Output398 = "Phraseme";
type _Output399 = "Proverb";
type _Output396 = {
	language: _Output397;
	family: _Output398;
	kind: _Output399;
};
type _Output15 =
	| _Output16
	| _Output20
	| _Output24
	| _Output28
	| _Output32
	| _Output36
	| _Output40
	| _Output44
	| _Output48
	| _Output52
	| _Output56
	| _Output60
	| _Output64
	| _Output68
	| _Output72
	| _Output76
	| _Output80
	| _Output84
	| _Output88
	| _Output92
	| _Output96
	| _Output100
	| _Output104
	| _Output108
	| _Output112
	| _Output116
	| _Output120
	| _Output124
	| _Output128
	| _Output132
	| _Output136
	| _Output140
	| _Output144
	| _Output148
	| _Output152
	| _Output156
	| _Output160
	| _Output164
	| _Output168
	| _Output172
	| _Output176
	| _Output180
	| _Output184
	| _Output188
	| _Output192
	| _Output196
	| _Output200
	| _Output204
	| _Output208
	| _Output212
	| _Output216
	| _Output220
	| _Output224
	| _Output228
	| _Output232
	| _Output236
	| _Output240
	| _Output244
	| _Output248
	| _Output252
	| _Output256
	| _Output260
	| _Output264
	| _Output268
	| _Output272
	| _Output276
	| _Output280
	| _Output284
	| _Output288
	| _Output292
	| _Output296
	| _Output300
	| _Output304
	| _Output308
	| _Output312
	| _Output316
	| _Output320
	| _Output324
	| _Output328
	| _Output332
	| _Output336
	| _Output340
	| _Output344
	| _Output348
	| _Output352
	| _Output356
	| _Output360
	| _Output364
	| _Output368
	| _Output372
	| _Output376
	| _Output380
	| _Output384
	| _Output388
	| _Output392
	| _Output396;
type _Output400 = _Output0 | undefined;
type _Output14 = { route: _Output15; settings?: _Output400 };
type _Output401 =
	| "synonym"
	| "nearSynonym"
	| "antonym"
	| "nearAntonym"
	| "hypernym"
	| "holonym";
type _Output402 = "en" | "ru";
type _Output405 = string;
type _Output404 = {
	language: _Output17;
	canonicalForm: _Output405;
	family: _Output18;
	kind: _Output19;
};
type _Output406 = {
	language: _Output21;
	canonicalForm: _Output405;
	family: _Output22;
	kind: _Output23;
};
type _Output407 = {
	language: _Output25;
	canonicalForm: _Output405;
	family: _Output26;
	kind: _Output27;
};
type _Output408 = {
	language: _Output29;
	canonicalForm: _Output405;
	family: _Output30;
	kind: _Output31;
};
type _Output409 = {
	language: _Output33;
	canonicalForm: _Output405;
	family: _Output34;
	kind: _Output35;
};
type _Output410 = {
	language: _Output37;
	canonicalForm: _Output405;
	family: _Output38;
	kind: _Output39;
};
type _Output411 = {
	language: _Output41;
	canonicalForm: _Output405;
	family: _Output42;
	kind: _Output43;
};
type _Output412 = {
	language: _Output45;
	canonicalForm: _Output405;
	family: _Output46;
	kind: _Output47;
};
type _Output413 = {
	language: _Output49;
	canonicalForm: _Output405;
	family: _Output50;
	kind: _Output51;
};
type _Output414 = {
	language: _Output53;
	canonicalForm: _Output405;
	family: _Output54;
	kind: _Output55;
};
type _Output415 = {
	language: _Output57;
	canonicalForm: _Output405;
	family: _Output58;
	kind: _Output59;
};
type _Output416 = {
	language: _Output61;
	canonicalForm: _Output405;
	family: _Output62;
	kind: _Output63;
};
type _Output417 = {
	language: _Output65;
	canonicalForm: _Output405;
	family: _Output66;
	kind: _Output67;
};
type _Output418 = {
	language: _Output69;
	canonicalForm: _Output405;
	family: _Output70;
	kind: _Output71;
};
type _Output419 = {
	language: _Output73;
	canonicalForm: _Output405;
	family: _Output74;
	kind: _Output75;
};
type _Output420 = {
	language: _Output77;
	canonicalForm: _Output405;
	family: _Output78;
	kind: _Output79;
};
type _Output421 = {
	language: _Output81;
	canonicalForm: _Output405;
	family: _Output82;
	kind: _Output83;
};
type _Output422 = {
	language: _Output85;
	canonicalForm: _Output405;
	family: _Output86;
	kind: _Output87;
};
type _Output423 = {
	language: _Output89;
	canonicalForm: _Output405;
	family: _Output90;
	kind: _Output91;
};
type _Output424 = {
	language: _Output93;
	canonicalForm: _Output405;
	family: _Output94;
	kind: _Output95;
};
type _Output425 = {
	language: _Output97;
	canonicalForm: _Output405;
	family: _Output98;
	kind: _Output99;
};
type _Output426 = {
	language: _Output101;
	canonicalForm: _Output405;
	family: _Output102;
	kind: _Output103;
};
type _Output427 = {
	language: _Output105;
	canonicalForm: _Output405;
	family: _Output106;
	kind: _Output107;
};
type _Output428 = {
	language: _Output109;
	canonicalForm: _Output405;
	family: _Output110;
	kind: _Output111;
};
type _Output429 = {
	language: _Output113;
	canonicalForm: _Output405;
	family: _Output114;
	kind: _Output115;
};
type _Output430 = {
	language: _Output117;
	canonicalForm: _Output405;
	family: _Output118;
	kind: _Output119;
};
type _Output431 = {
	language: _Output121;
	canonicalForm: _Output405;
	family: _Output122;
	kind: _Output123;
};
type _Output432 = {
	language: _Output125;
	canonicalForm: _Output405;
	family: _Output126;
	kind: _Output127;
};
type _Output433 = {
	language: _Output129;
	canonicalForm: _Output405;
	family: _Output130;
	kind: _Output131;
};
type _Output434 = {
	language: _Output133;
	canonicalForm: _Output405;
	family: _Output134;
	kind: _Output135;
};
type _Output435 = {
	language: _Output137;
	canonicalForm: _Output405;
	family: _Output138;
	kind: _Output139;
};
type _Output436 = {
	language: _Output141;
	canonicalForm: _Output405;
	family: _Output142;
	kind: _Output143;
};
type _Output437 = {
	language: _Output145;
	canonicalForm: _Output405;
	family: _Output146;
	kind: _Output147;
};
type _Output438 = {
	language: _Output149;
	canonicalForm: _Output405;
	family: _Output150;
	kind: _Output151;
};
type _Output439 = {
	language: _Output153;
	canonicalForm: _Output405;
	family: _Output154;
	kind: _Output155;
};
type _Output440 = {
	language: _Output157;
	canonicalForm: _Output405;
	family: _Output158;
	kind: _Output159;
};
type _Output441 = {
	language: _Output161;
	canonicalForm: _Output405;
	family: _Output162;
	kind: _Output163;
};
type _Output442 = {
	language: _Output165;
	canonicalForm: _Output405;
	family: _Output166;
	kind: _Output167;
};
type _Output443 = {
	language: _Output169;
	canonicalForm: _Output405;
	family: _Output170;
	kind: _Output171;
};
type _Output444 = {
	language: _Output173;
	canonicalForm: _Output405;
	family: _Output174;
	kind: _Output175;
};
type _Output445 = {
	language: _Output177;
	canonicalForm: _Output405;
	family: _Output178;
	kind: _Output179;
};
type _Output446 = {
	language: _Output181;
	canonicalForm: _Output405;
	family: _Output182;
	kind: _Output183;
};
type _Output447 = {
	language: _Output185;
	canonicalForm: _Output405;
	family: _Output186;
	kind: _Output187;
};
type _Output448 = {
	language: _Output189;
	canonicalForm: _Output405;
	family: _Output190;
	kind: _Output191;
};
type _Output449 = {
	language: _Output193;
	canonicalForm: _Output405;
	family: _Output194;
	kind: _Output195;
};
type _Output450 = {
	language: _Output197;
	canonicalForm: _Output405;
	family: _Output198;
	kind: _Output199;
};
type _Output451 = {
	language: _Output201;
	canonicalForm: _Output405;
	family: _Output202;
	kind: _Output203;
};
type _Output452 = {
	language: _Output205;
	canonicalForm: _Output405;
	family: _Output206;
	kind: _Output207;
};
type _Output453 = {
	language: _Output209;
	canonicalForm: _Output405;
	family: _Output210;
	kind: _Output211;
};
type _Output454 = {
	language: _Output213;
	canonicalForm: _Output405;
	family: _Output214;
	kind: _Output215;
};
type _Output455 = {
	language: _Output217;
	canonicalForm: _Output405;
	family: _Output218;
	kind: _Output219;
};
type _Output456 = {
	language: _Output221;
	canonicalForm: _Output405;
	family: _Output222;
	kind: _Output223;
};
type _Output457 = {
	language: _Output225;
	canonicalForm: _Output405;
	family: _Output226;
	kind: _Output227;
};
type _Output458 = {
	language: _Output229;
	canonicalForm: _Output405;
	family: _Output230;
	kind: _Output231;
};
type _Output459 = {
	language: _Output233;
	canonicalForm: _Output405;
	family: _Output234;
	kind: _Output235;
};
type _Output460 = {
	language: _Output237;
	canonicalForm: _Output405;
	family: _Output238;
	kind: _Output239;
};
type _Output461 = {
	language: _Output241;
	canonicalForm: _Output405;
	family: _Output242;
	kind: _Output243;
};
type _Output462 = {
	language: _Output245;
	canonicalForm: _Output405;
	family: _Output246;
	kind: _Output247;
};
type _Output463 = {
	language: _Output249;
	canonicalForm: _Output405;
	family: _Output250;
	kind: _Output251;
};
type _Output464 = {
	language: _Output253;
	canonicalForm: _Output405;
	family: _Output254;
	kind: _Output255;
};
type _Output465 = {
	language: _Output257;
	canonicalForm: _Output405;
	family: _Output258;
	kind: _Output259;
};
type _Output466 = {
	language: _Output261;
	canonicalForm: _Output405;
	family: _Output262;
	kind: _Output263;
};
type _Output467 = {
	language: _Output265;
	canonicalForm: _Output405;
	family: _Output266;
	kind: _Output267;
};
type _Output468 = {
	language: _Output269;
	canonicalForm: _Output405;
	family: _Output270;
	kind: _Output271;
};
type _Output469 = {
	language: _Output273;
	canonicalForm: _Output405;
	family: _Output274;
	kind: _Output275;
};
type _Output470 = {
	language: _Output277;
	canonicalForm: _Output405;
	family: _Output278;
	kind: _Output279;
};
type _Output471 = {
	language: _Output281;
	canonicalForm: _Output405;
	family: _Output282;
	kind: _Output283;
};
type _Output472 = {
	language: _Output285;
	canonicalForm: _Output405;
	family: _Output286;
	kind: _Output287;
};
type _Output473 = {
	language: _Output289;
	canonicalForm: _Output405;
	family: _Output290;
	kind: _Output291;
};
type _Output474 = {
	language: _Output293;
	canonicalForm: _Output405;
	family: _Output294;
	kind: _Output295;
};
type _Output475 = {
	language: _Output297;
	canonicalForm: _Output405;
	family: _Output298;
	kind: _Output299;
};
type _Output476 = {
	language: _Output301;
	canonicalForm: _Output405;
	family: _Output302;
	kind: _Output303;
};
type _Output477 = {
	language: _Output305;
	canonicalForm: _Output405;
	family: _Output306;
	kind: _Output307;
};
type _Output478 = {
	language: _Output309;
	canonicalForm: _Output405;
	family: _Output310;
	kind: _Output311;
};
type _Output479 = {
	language: _Output313;
	canonicalForm: _Output405;
	family: _Output314;
	kind: _Output315;
};
type _Output480 = {
	language: _Output317;
	canonicalForm: _Output405;
	family: _Output318;
	kind: _Output319;
};
type _Output481 = {
	language: _Output321;
	canonicalForm: _Output405;
	family: _Output322;
	kind: _Output323;
};
type _Output482 = {
	language: _Output325;
	canonicalForm: _Output405;
	family: _Output326;
	kind: _Output327;
};
type _Output483 = {
	language: _Output329;
	canonicalForm: _Output405;
	family: _Output330;
	kind: _Output331;
};
type _Output484 = {
	language: _Output333;
	canonicalForm: _Output405;
	family: _Output334;
	kind: _Output335;
};
type _Output485 = {
	language: _Output337;
	canonicalForm: _Output405;
	family: _Output338;
	kind: _Output339;
};
type _Output486 = {
	language: _Output341;
	canonicalForm: _Output405;
	family: _Output342;
	kind: _Output343;
};
type _Output487 = {
	language: _Output345;
	canonicalForm: _Output405;
	family: _Output346;
	kind: _Output347;
};
type _Output488 = {
	language: _Output349;
	canonicalForm: _Output405;
	family: _Output350;
	kind: _Output351;
};
type _Output489 = {
	language: _Output353;
	canonicalForm: _Output405;
	family: _Output354;
	kind: _Output355;
};
type _Output490 = {
	language: _Output357;
	canonicalForm: _Output405;
	family: _Output358;
	kind: _Output359;
};
type _Output491 = {
	language: _Output361;
	canonicalForm: _Output405;
	family: _Output362;
	kind: _Output363;
};
type _Output492 = {
	language: _Output365;
	canonicalForm: _Output405;
	family: _Output366;
	kind: _Output367;
};
type _Output493 = {
	language: _Output369;
	canonicalForm: _Output405;
	family: _Output370;
	kind: _Output371;
};
type _Output494 = {
	language: _Output373;
	canonicalForm: _Output405;
	family: _Output374;
	kind: _Output375;
};
type _Output495 = {
	language: _Output377;
	canonicalForm: _Output405;
	family: _Output378;
	kind: _Output379;
};
type _Output496 = {
	language: _Output381;
	canonicalForm: _Output405;
	family: _Output382;
	kind: _Output383;
};
type _Output497 = {
	language: _Output385;
	canonicalForm: _Output405;
	family: _Output386;
	kind: _Output387;
};
type _Output498 = {
	language: _Output389;
	canonicalForm: _Output405;
	family: _Output390;
	kind: _Output391;
};
type _Output499 = {
	language: _Output393;
	canonicalForm: _Output405;
	family: _Output394;
	kind: _Output395;
};
type _Output500 = {
	language: _Output397;
	canonicalForm: _Output405;
	family: _Output398;
	kind: _Output399;
};
type _Output403 =
	| _Output404
	| _Output406
	| _Output407
	| _Output408
	| _Output409
	| _Output410
	| _Output411
	| _Output412
	| _Output413
	| _Output414
	| _Output415
	| _Output416
	| _Output417
	| _Output418
	| _Output419
	| _Output420
	| _Output421
	| _Output422
	| _Output423
	| _Output424
	| _Output425
	| _Output426
	| _Output427
	| _Output428
	| _Output429
	| _Output430
	| _Output431
	| _Output432
	| _Output433
	| _Output434
	| _Output435
	| _Output436
	| _Output437
	| _Output438
	| _Output439
	| _Output440
	| _Output441
	| _Output442
	| _Output443
	| _Output444
	| _Output445
	| _Output446
	| _Output447
	| _Output448
	| _Output449
	| _Output450
	| _Output451
	| _Output452
	| _Output453
	| _Output454
	| _Output455
	| _Output456
	| _Output457
	| _Output458
	| _Output459
	| _Output460
	| _Output461
	| _Output462
	| _Output463
	| _Output464
	| _Output465
	| _Output466
	| _Output467
	| _Output468
	| _Output469
	| _Output470
	| _Output471
	| _Output472
	| _Output473
	| _Output474
	| _Output475
	| _Output476
	| _Output477
	| _Output478
	| _Output479
	| _Output480
	| _Output481
	| _Output482
	| _Output483
	| _Output484
	| _Output485
	| _Output486
	| _Output487
	| _Output488
	| _Output489
	| _Output490
	| _Output491
	| _Output492
	| _Output493
	| _Output494
	| _Output495
	| _Output496
	| _Output497
	| _Output498
	| _Output499
	| _Output500;
type _Output503 = {
	language: _Output17;
	canonicalForm: _Output405;
	family: _Output18;
	kind: _Output19;
};
type _Output504 = {
	language: _Output21;
	canonicalForm: _Output405;
	family: _Output22;
	kind: _Output23;
};
type _Output505 = {
	language: _Output25;
	canonicalForm: _Output405;
	family: _Output26;
	kind: _Output27;
};
type _Output506 = {
	language: _Output29;
	canonicalForm: _Output405;
	family: _Output30;
	kind: _Output31;
};
type _Output507 = {
	language: _Output33;
	canonicalForm: _Output405;
	family: _Output34;
	kind: _Output35;
};
type _Output508 = {
	language: _Output37;
	canonicalForm: _Output405;
	family: _Output38;
	kind: _Output39;
};
type _Output509 = {
	language: _Output41;
	canonicalForm: _Output405;
	family: _Output42;
	kind: _Output43;
};
type _Output510 = {
	language: _Output45;
	canonicalForm: _Output405;
	family: _Output46;
	kind: _Output47;
};
type _Output511 = {
	language: _Output49;
	canonicalForm: _Output405;
	family: _Output50;
	kind: _Output51;
};
type _Output512 = {
	language: _Output53;
	canonicalForm: _Output405;
	family: _Output54;
	kind: _Output55;
};
type _Output513 = {
	language: _Output57;
	canonicalForm: _Output405;
	family: _Output58;
	kind: _Output59;
};
type _Output514 = {
	language: _Output61;
	canonicalForm: _Output405;
	family: _Output62;
	kind: _Output63;
};
type _Output515 = {
	language: _Output65;
	canonicalForm: _Output405;
	family: _Output66;
	kind: _Output67;
};
type _Output516 = {
	language: _Output69;
	canonicalForm: _Output405;
	family: _Output70;
	kind: _Output71;
};
type _Output517 = {
	language: _Output73;
	canonicalForm: _Output405;
	family: _Output74;
	kind: _Output75;
};
type _Output518 = {
	language: _Output77;
	canonicalForm: _Output405;
	family: _Output78;
	kind: _Output79;
};
type _Output519 = {
	language: _Output81;
	canonicalForm: _Output405;
	family: _Output82;
	kind: _Output83;
};
type _Output520 = {
	language: _Output145;
	canonicalForm: _Output405;
	family: _Output146;
	kind: _Output147;
};
type _Output521 = {
	language: _Output149;
	canonicalForm: _Output405;
	family: _Output150;
	kind: _Output151;
};
type _Output522 = {
	language: _Output153;
	canonicalForm: _Output405;
	family: _Output154;
	kind: _Output155;
};
type _Output523 = {
	language: _Output157;
	canonicalForm: _Output405;
	family: _Output158;
	kind: _Output159;
};
type _Output524 = {
	language: _Output161;
	canonicalForm: _Output405;
	family: _Output162;
	kind: _Output163;
};
type _Output525 = {
	language: _Output165;
	canonicalForm: _Output405;
	family: _Output166;
	kind: _Output167;
};
type _Output526 = {
	language: _Output169;
	canonicalForm: _Output405;
	family: _Output170;
	kind: _Output171;
};
type _Output527 = {
	language: _Output173;
	canonicalForm: _Output405;
	family: _Output174;
	kind: _Output175;
};
type _Output528 = {
	language: _Output177;
	canonicalForm: _Output405;
	family: _Output178;
	kind: _Output179;
};
type _Output529 = {
	language: _Output181;
	canonicalForm: _Output405;
	family: _Output182;
	kind: _Output183;
};
type _Output530 = {
	language: _Output185;
	canonicalForm: _Output405;
	family: _Output186;
	kind: _Output187;
};
type _Output531 = {
	language: _Output189;
	canonicalForm: _Output405;
	family: _Output190;
	kind: _Output191;
};
type _Output532 = {
	language: _Output193;
	canonicalForm: _Output405;
	family: _Output194;
	kind: _Output195;
};
type _Output533 = {
	language: _Output197;
	canonicalForm: _Output405;
	family: _Output198;
	kind: _Output199;
};
type _Output534 = {
	language: _Output201;
	canonicalForm: _Output405;
	family: _Output202;
	kind: _Output203;
};
type _Output535 = {
	language: _Output205;
	canonicalForm: _Output405;
	family: _Output206;
	kind: _Output207;
};
type _Output536 = {
	language: _Output209;
	canonicalForm: _Output405;
	family: _Output210;
	kind: _Output211;
};
type _Output537 = {
	language: _Output273;
	canonicalForm: _Output405;
	family: _Output274;
	kind: _Output275;
};
type _Output538 = {
	language: _Output277;
	canonicalForm: _Output405;
	family: _Output278;
	kind: _Output279;
};
type _Output539 = {
	language: _Output281;
	canonicalForm: _Output405;
	family: _Output282;
	kind: _Output283;
};
type _Output540 = {
	language: _Output285;
	canonicalForm: _Output405;
	family: _Output286;
	kind: _Output287;
};
type _Output541 = {
	language: _Output289;
	canonicalForm: _Output405;
	family: _Output290;
	kind: _Output291;
};
type _Output542 = {
	language: _Output293;
	canonicalForm: _Output405;
	family: _Output294;
	kind: _Output295;
};
type _Output543 = {
	language: _Output297;
	canonicalForm: _Output405;
	family: _Output298;
	kind: _Output299;
};
type _Output544 = {
	language: _Output301;
	canonicalForm: _Output405;
	family: _Output302;
	kind: _Output303;
};
type _Output545 = {
	language: _Output305;
	canonicalForm: _Output405;
	family: _Output306;
	kind: _Output307;
};
type _Output546 = {
	language: _Output309;
	canonicalForm: _Output405;
	family: _Output310;
	kind: _Output311;
};
type _Output547 = {
	language: _Output313;
	canonicalForm: _Output405;
	family: _Output314;
	kind: _Output315;
};
type _Output548 = {
	language: _Output317;
	canonicalForm: _Output405;
	family: _Output318;
	kind: _Output319;
};
type _Output549 = {
	language: _Output321;
	canonicalForm: _Output405;
	family: _Output322;
	kind: _Output323;
};
type _Output550 = {
	language: _Output325;
	canonicalForm: _Output405;
	family: _Output326;
	kind: _Output327;
};
type _Output551 = {
	language: _Output329;
	canonicalForm: _Output405;
	family: _Output330;
	kind: _Output331;
};
type _Output552 = {
	language: _Output333;
	canonicalForm: _Output405;
	family: _Output334;
	kind: _Output335;
};
type _Output553 = {
	language: _Output337;
	canonicalForm: _Output405;
	family: _Output338;
	kind: _Output339;
};
type _Output502 =
	| _Output503
	| _Output504
	| _Output505
	| _Output506
	| _Output507
	| _Output508
	| _Output509
	| _Output510
	| _Output511
	| _Output512
	| _Output513
	| _Output514
	| _Output515
	| _Output516
	| _Output517
	| _Output518
	| _Output519
	| _Output520
	| _Output521
	| _Output522
	| _Output523
	| _Output524
	| _Output525
	| _Output526
	| _Output527
	| _Output528
	| _Output529
	| _Output530
	| _Output531
	| _Output532
	| _Output533
	| _Output534
	| _Output535
	| _Output536
	| _Output537
	| _Output538
	| _Output539
	| _Output540
	| _Output541
	| _Output542
	| _Output543
	| _Output544
	| _Output545
	| _Output546
	| _Output547
	| _Output548
	| _Output549
	| _Output550
	| _Output551
	| _Output552
	| _Output553;
type _Output501 = [_Output502, _Output502, ...Array<_Output502>];
type _Output556 = "structure";
type _Output561 = "morphemeReading";
type _Output564 = "Reading";
type _Output566 = "Lemma";
type _Output567 = string;
type _Output568 = Record<string, never>;
type _Output565 = {
	unitKind: _Output566;
	language: _Output85;
	family: _Output86;
	kind: _Output87;
	canonicalForm: _Output567;
	coreFeatures: _Output568;
};
type _Output569 = string;
type _Output563 = {
	unitKind: _Output564;
	lemma: _Output565;
	emojiDescription: _Output569;
};
type _Output571 = "Reading";
type _Output573 = "Lemma";
type _Output574 = Record<string, never>;
type _Output572 = {
	unitKind: _Output573;
	language: _Output89;
	family: _Output90;
	kind: _Output91;
	canonicalForm: _Output567;
	coreFeatures: _Output574;
};
type _Output570 = {
	unitKind: _Output571;
	lemma: _Output572;
	emojiDescription: _Output569;
};
type _Output576 = "Reading";
type _Output578 = "Lemma";
type _Output579 = Record<string, never>;
type _Output577 = {
	unitKind: _Output578;
	language: _Output93;
	family: _Output94;
	kind: _Output95;
	canonicalForm: _Output567;
	coreFeatures: _Output579;
};
type _Output575 = {
	unitKind: _Output576;
	lemma: _Output577;
	emojiDescription: _Output569;
};
type _Output581 = "Reading";
type _Output583 = "Lemma";
type _Output584 = Record<string, never>;
type _Output582 = {
	unitKind: _Output583;
	language: _Output97;
	family: _Output98;
	kind: _Output99;
	canonicalForm: _Output567;
	coreFeatures: _Output584;
};
type _Output580 = {
	unitKind: _Output581;
	lemma: _Output582;
	emojiDescription: _Output569;
};
type _Output586 = "Reading";
type _Output588 = "Lemma";
type _Output589 = Record<string, never>;
type _Output587 = {
	unitKind: _Output588;
	language: _Output101;
	family: _Output102;
	kind: _Output103;
	canonicalForm: _Output567;
	coreFeatures: _Output589;
};
type _Output585 = {
	unitKind: _Output586;
	lemma: _Output587;
	emojiDescription: _Output569;
};
type _Output591 = "Reading";
type _Output593 = "Lemma";
type _Output596 = string;
type _Output595 = _Output596 | null;
type _Output594 = { hasSepPrefix: _Output595 };
type _Output592 = {
	unitKind: _Output593;
	language: _Output105;
	family: _Output106;
	kind: _Output107;
	canonicalForm: _Output567;
	coreFeatures: _Output594;
};
type _Output590 = {
	unitKind: _Output591;
	lemma: _Output592;
	emojiDescription: _Output569;
};
type _Output598 = "Reading";
type _Output600 = "Lemma";
type _Output601 = Record<string, never>;
type _Output599 = {
	unitKind: _Output600;
	language: _Output109;
	family: _Output110;
	kind: _Output111;
	canonicalForm: _Output567;
	coreFeatures: _Output601;
};
type _Output597 = {
	unitKind: _Output598;
	lemma: _Output599;
	emojiDescription: _Output569;
};
type _Output603 = "Reading";
type _Output605 = "Lemma";
type _Output606 = Record<string, never>;
type _Output604 = {
	unitKind: _Output605;
	language: _Output113;
	family: _Output114;
	kind: _Output115;
	canonicalForm: _Output567;
	coreFeatures: _Output606;
};
type _Output602 = {
	unitKind: _Output603;
	lemma: _Output604;
	emojiDescription: _Output569;
};
type _Output608 = "Reading";
type _Output610 = "Lemma";
type _Output611 = Record<string, never>;
type _Output609 = {
	unitKind: _Output610;
	language: _Output117;
	family: _Output118;
	kind: _Output119;
	canonicalForm: _Output567;
	coreFeatures: _Output611;
};
type _Output607 = {
	unitKind: _Output608;
	lemma: _Output609;
	emojiDescription: _Output569;
};
type _Output613 = "Reading";
type _Output615 = "Lemma";
type _Output616 = Record<string, never>;
type _Output614 = {
	unitKind: _Output615;
	language: _Output121;
	family: _Output122;
	kind: _Output123;
	canonicalForm: _Output567;
	coreFeatures: _Output616;
};
type _Output612 = {
	unitKind: _Output613;
	lemma: _Output614;
	emojiDescription: _Output569;
};
type _Output618 = "Reading";
type _Output620 = "Lemma";
type _Output621 = Record<string, never>;
type _Output619 = {
	unitKind: _Output620;
	language: _Output213;
	family: _Output214;
	kind: _Output215;
	canonicalForm: _Output567;
	coreFeatures: _Output621;
};
type _Output617 = {
	unitKind: _Output618;
	lemma: _Output619;
	emojiDescription: _Output569;
};
type _Output623 = "Reading";
type _Output625 = "Lemma";
type _Output626 = Record<string, never>;
type _Output624 = {
	unitKind: _Output625;
	language: _Output217;
	family: _Output218;
	kind: _Output219;
	canonicalForm: _Output567;
	coreFeatures: _Output626;
};
type _Output622 = {
	unitKind: _Output623;
	lemma: _Output624;
	emojiDescription: _Output569;
};
type _Output628 = "Reading";
type _Output630 = "Lemma";
type _Output631 = Record<string, never>;
type _Output629 = {
	unitKind: _Output630;
	language: _Output221;
	family: _Output222;
	kind: _Output223;
	canonicalForm: _Output567;
	coreFeatures: _Output631;
};
type _Output627 = {
	unitKind: _Output628;
	lemma: _Output629;
	emojiDescription: _Output569;
};
type _Output633 = "Reading";
type _Output635 = "Lemma";
type _Output636 = Record<string, never>;
type _Output634 = {
	unitKind: _Output635;
	language: _Output225;
	family: _Output226;
	kind: _Output227;
	canonicalForm: _Output567;
	coreFeatures: _Output636;
};
type _Output632 = {
	unitKind: _Output633;
	lemma: _Output634;
	emojiDescription: _Output569;
};
type _Output638 = "Reading";
type _Output640 = "Lemma";
type _Output641 = Record<string, never>;
type _Output639 = {
	unitKind: _Output640;
	language: _Output229;
	family: _Output230;
	kind: _Output231;
	canonicalForm: _Output567;
	coreFeatures: _Output641;
};
type _Output637 = {
	unitKind: _Output638;
	lemma: _Output639;
	emojiDescription: _Output569;
};
type _Output643 = "Reading";
type _Output645 = "Lemma";
type _Output646 = Record<string, never>;
type _Output644 = {
	unitKind: _Output645;
	language: _Output233;
	family: _Output234;
	kind: _Output235;
	canonicalForm: _Output567;
	coreFeatures: _Output646;
};
type _Output642 = {
	unitKind: _Output643;
	lemma: _Output644;
	emojiDescription: _Output569;
};
type _Output648 = "Reading";
type _Output650 = "Lemma";
type _Output651 = Record<string, never>;
type _Output649 = {
	unitKind: _Output650;
	language: _Output237;
	family: _Output238;
	kind: _Output239;
	canonicalForm: _Output567;
	coreFeatures: _Output651;
};
type _Output647 = {
	unitKind: _Output648;
	lemma: _Output649;
	emojiDescription: _Output569;
};
type _Output653 = "Reading";
type _Output655 = "Lemma";
type _Output656 = Record<string, never>;
type _Output654 = {
	unitKind: _Output655;
	language: _Output241;
	family: _Output242;
	kind: _Output243;
	canonicalForm: _Output567;
	coreFeatures: _Output656;
};
type _Output652 = {
	unitKind: _Output653;
	lemma: _Output654;
	emojiDescription: _Output569;
};
type _Output658 = "Reading";
type _Output660 = "Lemma";
type _Output661 = Record<string, never>;
type _Output659 = {
	unitKind: _Output660;
	language: _Output245;
	family: _Output246;
	kind: _Output247;
	canonicalForm: _Output567;
	coreFeatures: _Output661;
};
type _Output657 = {
	unitKind: _Output658;
	lemma: _Output659;
	emojiDescription: _Output569;
};
type _Output663 = "Reading";
type _Output665 = "Lemma";
type _Output666 = Record<string, never>;
type _Output664 = {
	unitKind: _Output665;
	language: _Output249;
	family: _Output250;
	kind: _Output251;
	canonicalForm: _Output567;
	coreFeatures: _Output666;
};
type _Output662 = {
	unitKind: _Output663;
	lemma: _Output664;
	emojiDescription: _Output569;
};
type _Output668 = "Reading";
type _Output670 = "Lemma";
type _Output671 = Record<string, never>;
type _Output669 = {
	unitKind: _Output670;
	language: _Output253;
	family: _Output254;
	kind: _Output255;
	canonicalForm: _Output567;
	coreFeatures: _Output671;
};
type _Output667 = {
	unitKind: _Output668;
	lemma: _Output669;
	emojiDescription: _Output569;
};
type _Output673 = "Reading";
type _Output675 = "Lemma";
type _Output676 = Record<string, never>;
type _Output674 = {
	unitKind: _Output675;
	language: _Output341;
	family: _Output342;
	kind: _Output343;
	canonicalForm: _Output567;
	coreFeatures: _Output676;
};
type _Output672 = {
	unitKind: _Output673;
	lemma: _Output674;
	emojiDescription: _Output569;
};
type _Output678 = "Reading";
type _Output680 = "Lemma";
type _Output681 = Record<string, never>;
type _Output679 = {
	unitKind: _Output680;
	language: _Output345;
	family: _Output346;
	kind: _Output347;
	canonicalForm: _Output567;
	coreFeatures: _Output681;
};
type _Output677 = {
	unitKind: _Output678;
	lemma: _Output679;
	emojiDescription: _Output569;
};
type _Output683 = "Reading";
type _Output685 = "Lemma";
type _Output686 = Record<string, never>;
type _Output684 = {
	unitKind: _Output685;
	language: _Output349;
	family: _Output350;
	kind: _Output351;
	canonicalForm: _Output567;
	coreFeatures: _Output686;
};
type _Output682 = {
	unitKind: _Output683;
	lemma: _Output684;
	emojiDescription: _Output569;
};
type _Output688 = "Reading";
type _Output690 = "Lemma";
type _Output691 = Record<string, never>;
type _Output689 = {
	unitKind: _Output690;
	language: _Output353;
	family: _Output354;
	kind: _Output355;
	canonicalForm: _Output567;
	coreFeatures: _Output691;
};
type _Output687 = {
	unitKind: _Output688;
	lemma: _Output689;
	emojiDescription: _Output569;
};
type _Output693 = "Reading";
type _Output695 = "Lemma";
type _Output696 = Record<string, never>;
type _Output694 = {
	unitKind: _Output695;
	language: _Output357;
	family: _Output358;
	kind: _Output359;
	canonicalForm: _Output567;
	coreFeatures: _Output696;
};
type _Output692 = {
	unitKind: _Output693;
	lemma: _Output694;
	emojiDescription: _Output569;
};
type _Output698 = "Reading";
type _Output700 = "Lemma";
type _Output701 = Record<string, never>;
type _Output699 = {
	unitKind: _Output700;
	language: _Output361;
	family: _Output362;
	kind: _Output363;
	canonicalForm: _Output567;
	coreFeatures: _Output701;
};
type _Output697 = {
	unitKind: _Output698;
	lemma: _Output699;
	emojiDescription: _Output569;
};
type _Output703 = "Reading";
type _Output705 = "Lemma";
type _Output706 = Record<string, never>;
type _Output704 = {
	unitKind: _Output705;
	language: _Output365;
	family: _Output366;
	kind: _Output367;
	canonicalForm: _Output567;
	coreFeatures: _Output706;
};
type _Output702 = {
	unitKind: _Output703;
	lemma: _Output704;
	emojiDescription: _Output569;
};
type _Output708 = "Reading";
type _Output710 = "Lemma";
type _Output711 = Record<string, never>;
type _Output709 = {
	unitKind: _Output710;
	language: _Output369;
	family: _Output370;
	kind: _Output371;
	canonicalForm: _Output567;
	coreFeatures: _Output711;
};
type _Output707 = {
	unitKind: _Output708;
	lemma: _Output709;
	emojiDescription: _Output569;
};
type _Output713 = "Reading";
type _Output715 = "Lemma";
type _Output716 = Record<string, never>;
type _Output714 = {
	unitKind: _Output715;
	language: _Output373;
	family: _Output374;
	kind: _Output375;
	canonicalForm: _Output567;
	coreFeatures: _Output716;
};
type _Output712 = {
	unitKind: _Output713;
	lemma: _Output714;
	emojiDescription: _Output569;
};
type _Output718 = "Reading";
type _Output720 = "Lemma";
type _Output721 = Record<string, never>;
type _Output719 = {
	unitKind: _Output720;
	language: _Output377;
	family: _Output378;
	kind: _Output379;
	canonicalForm: _Output567;
	coreFeatures: _Output721;
};
type _Output717 = {
	unitKind: _Output718;
	lemma: _Output719;
	emojiDescription: _Output569;
};
type _Output723 = "Reading";
type _Output725 = "Lemma";
type _Output726 = Record<string, never>;
type _Output724 = {
	unitKind: _Output725;
	language: _Output381;
	family: _Output382;
	kind: _Output383;
	canonicalForm: _Output567;
	coreFeatures: _Output726;
};
type _Output722 = {
	unitKind: _Output723;
	lemma: _Output724;
	emojiDescription: _Output569;
};
type _Output562 =
	| _Output563
	| _Output570
	| _Output575
	| _Output580
	| _Output585
	| _Output590
	| _Output597
	| _Output602
	| _Output607
	| _Output612
	| _Output617
	| _Output622
	| _Output627
	| _Output632
	| _Output637
	| _Output642
	| _Output647
	| _Output652
	| _Output657
	| _Output662
	| _Output667
	| _Output672
	| _Output677
	| _Output682
	| _Output687
	| _Output692
	| _Output697
	| _Output702
	| _Output707
	| _Output712
	| _Output717
	| _Output722;
type _Output560 = { nodeKind: _Output561; reading: _Output562 };
type _Output728 = "unitShadow";
type _Output730 = {
	language: _Output17;
	canonicalForm: _Output405;
	family: _Output18;
	kind: _Output19;
};
type _Output731 = {
	language: _Output21;
	canonicalForm: _Output405;
	family: _Output22;
	kind: _Output23;
};
type _Output732 = {
	language: _Output25;
	canonicalForm: _Output405;
	family: _Output26;
	kind: _Output27;
};
type _Output733 = {
	language: _Output29;
	canonicalForm: _Output405;
	family: _Output30;
	kind: _Output31;
};
type _Output734 = {
	language: _Output33;
	canonicalForm: _Output405;
	family: _Output34;
	kind: _Output35;
};
type _Output735 = {
	language: _Output37;
	canonicalForm: _Output405;
	family: _Output38;
	kind: _Output39;
};
type _Output736 = {
	language: _Output41;
	canonicalForm: _Output405;
	family: _Output42;
	kind: _Output43;
};
type _Output737 = {
	language: _Output45;
	canonicalForm: _Output405;
	family: _Output46;
	kind: _Output47;
};
type _Output738 = {
	language: _Output49;
	canonicalForm: _Output405;
	family: _Output50;
	kind: _Output51;
};
type _Output739 = {
	language: _Output53;
	canonicalForm: _Output405;
	family: _Output54;
	kind: _Output55;
};
type _Output740 = {
	language: _Output57;
	canonicalForm: _Output405;
	family: _Output58;
	kind: _Output59;
};
type _Output741 = {
	language: _Output61;
	canonicalForm: _Output405;
	family: _Output62;
	kind: _Output63;
};
type _Output742 = {
	language: _Output65;
	canonicalForm: _Output405;
	family: _Output66;
	kind: _Output67;
};
type _Output743 = {
	language: _Output69;
	canonicalForm: _Output405;
	family: _Output70;
	kind: _Output71;
};
type _Output744 = {
	language: _Output73;
	canonicalForm: _Output405;
	family: _Output74;
	kind: _Output75;
};
type _Output745 = {
	language: _Output77;
	canonicalForm: _Output405;
	family: _Output78;
	kind: _Output79;
};
type _Output746 = {
	language: _Output81;
	canonicalForm: _Output405;
	family: _Output82;
	kind: _Output83;
};
type _Output747 = {
	language: _Output125;
	canonicalForm: _Output405;
	family: _Output126;
	kind: _Output127;
};
type _Output748 = {
	language: _Output129;
	canonicalForm: _Output405;
	family: _Output130;
	kind: _Output131;
};
type _Output749 = {
	language: _Output133;
	canonicalForm: _Output405;
	family: _Output134;
	kind: _Output135;
};
type _Output750 = {
	language: _Output137;
	canonicalForm: _Output405;
	family: _Output138;
	kind: _Output139;
};
type _Output751 = {
	language: _Output141;
	canonicalForm: _Output405;
	family: _Output142;
	kind: _Output143;
};
type _Output752 = {
	language: _Output145;
	canonicalForm: _Output405;
	family: _Output146;
	kind: _Output147;
};
type _Output753 = {
	language: _Output149;
	canonicalForm: _Output405;
	family: _Output150;
	kind: _Output151;
};
type _Output754 = {
	language: _Output153;
	canonicalForm: _Output405;
	family: _Output154;
	kind: _Output155;
};
type _Output755 = {
	language: _Output157;
	canonicalForm: _Output405;
	family: _Output158;
	kind: _Output159;
};
type _Output756 = {
	language: _Output161;
	canonicalForm: _Output405;
	family: _Output162;
	kind: _Output163;
};
type _Output757 = {
	language: _Output165;
	canonicalForm: _Output405;
	family: _Output166;
	kind: _Output167;
};
type _Output758 = {
	language: _Output169;
	canonicalForm: _Output405;
	family: _Output170;
	kind: _Output171;
};
type _Output759 = {
	language: _Output173;
	canonicalForm: _Output405;
	family: _Output174;
	kind: _Output175;
};
type _Output760 = {
	language: _Output177;
	canonicalForm: _Output405;
	family: _Output178;
	kind: _Output179;
};
type _Output761 = {
	language: _Output181;
	canonicalForm: _Output405;
	family: _Output182;
	kind: _Output183;
};
type _Output762 = {
	language: _Output185;
	canonicalForm: _Output405;
	family: _Output186;
	kind: _Output187;
};
type _Output763 = {
	language: _Output189;
	canonicalForm: _Output405;
	family: _Output190;
	kind: _Output191;
};
type _Output764 = {
	language: _Output193;
	canonicalForm: _Output405;
	family: _Output194;
	kind: _Output195;
};
type _Output765 = {
	language: _Output197;
	canonicalForm: _Output405;
	family: _Output198;
	kind: _Output199;
};
type _Output766 = {
	language: _Output201;
	canonicalForm: _Output405;
	family: _Output202;
	kind: _Output203;
};
type _Output767 = {
	language: _Output205;
	canonicalForm: _Output405;
	family: _Output206;
	kind: _Output207;
};
type _Output768 = {
	language: _Output209;
	canonicalForm: _Output405;
	family: _Output210;
	kind: _Output211;
};
type _Output769 = {
	language: _Output257;
	canonicalForm: _Output405;
	family: _Output258;
	kind: _Output259;
};
type _Output770 = {
	language: _Output261;
	canonicalForm: _Output405;
	family: _Output262;
	kind: _Output263;
};
type _Output771 = {
	language: _Output265;
	canonicalForm: _Output405;
	family: _Output266;
	kind: _Output267;
};
type _Output772 = {
	language: _Output269;
	canonicalForm: _Output405;
	family: _Output270;
	kind: _Output271;
};
type _Output773 = {
	language: _Output273;
	canonicalForm: _Output405;
	family: _Output274;
	kind: _Output275;
};
type _Output774 = {
	language: _Output277;
	canonicalForm: _Output405;
	family: _Output278;
	kind: _Output279;
};
type _Output775 = {
	language: _Output281;
	canonicalForm: _Output405;
	family: _Output282;
	kind: _Output283;
};
type _Output776 = {
	language: _Output285;
	canonicalForm: _Output405;
	family: _Output286;
	kind: _Output287;
};
type _Output777 = {
	language: _Output289;
	canonicalForm: _Output405;
	family: _Output290;
	kind: _Output291;
};
type _Output778 = {
	language: _Output293;
	canonicalForm: _Output405;
	family: _Output294;
	kind: _Output295;
};
type _Output779 = {
	language: _Output297;
	canonicalForm: _Output405;
	family: _Output298;
	kind: _Output299;
};
type _Output780 = {
	language: _Output301;
	canonicalForm: _Output405;
	family: _Output302;
	kind: _Output303;
};
type _Output781 = {
	language: _Output305;
	canonicalForm: _Output405;
	family: _Output306;
	kind: _Output307;
};
type _Output782 = {
	language: _Output309;
	canonicalForm: _Output405;
	family: _Output310;
	kind: _Output311;
};
type _Output783 = {
	language: _Output313;
	canonicalForm: _Output405;
	family: _Output314;
	kind: _Output315;
};
type _Output784 = {
	language: _Output317;
	canonicalForm: _Output405;
	family: _Output318;
	kind: _Output319;
};
type _Output785 = {
	language: _Output321;
	canonicalForm: _Output405;
	family: _Output322;
	kind: _Output323;
};
type _Output786 = {
	language: _Output325;
	canonicalForm: _Output405;
	family: _Output326;
	kind: _Output327;
};
type _Output787 = {
	language: _Output329;
	canonicalForm: _Output405;
	family: _Output330;
	kind: _Output331;
};
type _Output788 = {
	language: _Output333;
	canonicalForm: _Output405;
	family: _Output334;
	kind: _Output335;
};
type _Output789 = {
	language: _Output337;
	canonicalForm: _Output405;
	family: _Output338;
	kind: _Output339;
};
type _Output790 = {
	language: _Output385;
	canonicalForm: _Output405;
	family: _Output386;
	kind: _Output387;
};
type _Output791 = {
	language: _Output389;
	canonicalForm: _Output405;
	family: _Output390;
	kind: _Output391;
};
type _Output792 = {
	language: _Output393;
	canonicalForm: _Output405;
	family: _Output394;
	kind: _Output395;
};
type _Output793 = {
	language: _Output397;
	canonicalForm: _Output405;
	family: _Output398;
	kind: _Output399;
};
type _Output729 =
	| _Output730
	| _Output731
	| _Output732
	| _Output733
	| _Output734
	| _Output735
	| _Output736
	| _Output737
	| _Output738
	| _Output739
	| _Output740
	| _Output741
	| _Output742
	| _Output743
	| _Output744
	| _Output745
	| _Output746
	| _Output747
	| _Output748
	| _Output749
	| _Output750
	| _Output751
	| _Output752
	| _Output753
	| _Output754
	| _Output755
	| _Output756
	| _Output757
	| _Output758
	| _Output759
	| _Output760
	| _Output761
	| _Output762
	| _Output763
	| _Output764
	| _Output765
	| _Output766
	| _Output767
	| _Output768
	| _Output769
	| _Output770
	| _Output771
	| _Output772
	| _Output773
	| _Output774
	| _Output775
	| _Output776
	| _Output777
	| _Output778
	| _Output779
	| _Output780
	| _Output781
	| _Output782
	| _Output783
	| _Output784
	| _Output785
	| _Output786
	| _Output787
	| _Output788
	| _Output789
	| _Output790
	| _Output791
	| _Output792
	| _Output793;
type _Output727 = { nodeKind: _Output728; unitShadow: _Output729 };
type _Output795 = "structure";
type _Output796 = Array<_Output558>;
type _Output794 = { nodeKind: _Output795; children: _Output796 };
type _Output559 = _Output560 | _Output727 | _Output794;
type _Output558 = _Output559;
type _Output557 = Array<_Output558>;
type _Output555 = { nodeKind: _Output556; children: _Output557 };
type _Output554 = { root: _Output555 };
type _Output797 = { relation: _Output401; target: _Output403 };
type _Output800 = "reading";
type _Output805 = "Reading";
type _Output807 = "Lemma";
type _Output810 = "Yes";
type _Output809 = _Output810 | null;
type _Output812 = "Yes";
type _Output811 = _Output812 | null;
type _Output814 = "Card" | "Ord";
type _Output813 = _Output814 | null;
type _Output816 = "Short";
type _Output815 = _Output816 | null;
type _Output808 = {
	abbr: _Output809;
	foreign: _Output811;
	numType: _Output813;
	variant: _Output815;
};
type _Output806 = {
	unitKind: _Output807;
	language: _Output17;
	family: _Output18;
	kind: _Output19;
	canonicalForm: _Output567;
	coreFeatures: _Output808;
};
type _Output804 = {
	unitKind: _Output805;
	lemma: _Output806;
	emojiDescription: _Output569;
};
type _Output818 = "Reading";
type _Output820 = "Lemma";
type _Output822 = _Output810 | null;
type _Output824 = "Circ" | "Post" | "Prep";
type _Output823 = _Output824 | null;
type _Output826 = "ADV" | "SCONJ";
type _Output825 = _Output826 | null;
type _Output827 = _Output812 | null;
type _Output829 =
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
type _Output828 = _Output829 | null;
type _Output831 = "Vbp";
type _Output830 = _Output831 | null;
type _Output821 = {
	abbr: _Output822;
	adpType: _Output823;
	extPos: _Output825;
	foreign: _Output827;
	governedCase: _Output828;
	partType: _Output830;
};
type _Output819 = {
	unitKind: _Output820;
	language: _Output21;
	family: _Output22;
	kind: _Output23;
	canonicalForm: _Output567;
	coreFeatures: _Output821;
};
type _Output817 = {
	unitKind: _Output818;
	lemma: _Output819;
	emojiDescription: _Output569;
};
type _Output833 = "Reading";
type _Output835 = "Lemma";
type _Output837 = _Output812 | null;
type _Output839 = "Card" | "Mult";
type _Output838 = _Output839 | null;
type _Output841 = "Dem" | "Ind" | "Int" | "Neg" | "Rel";
type _Output840 = _Output841 | null;
type _Output836 = {
	foreign: _Output837;
	numType: _Output838;
	pronType: _Output840;
};
type _Output834 = {
	unitKind: _Output835;
	language: _Output25;
	family: _Output26;
	kind: _Output27;
	canonicalForm: _Output567;
	coreFeatures: _Output836;
};
type _Output832 = {
	unitKind: _Output833;
	lemma: _Output834;
	emojiDescription: _Output569;
};
type _Output843 = "Reading";
type _Output845 = "Lemma";
type _Output848 = "Mod";
type _Output847 = _Output848 | null;
type _Output846 = { verbType: _Output847 };
type _Output844 = {
	unitKind: _Output845;
	language: _Output29;
	family: _Output30;
	kind: _Output31;
	canonicalForm: _Output567;
	coreFeatures: _Output846;
};
type _Output842 = {
	unitKind: _Output843;
	lemma: _Output844;
	emojiDescription: _Output569;
};
type _Output850 = "Reading";
type _Output852 = "Lemma";
type _Output855 = "Comp";
type _Output854 = _Output855 | null;
type _Output853 = { conjType: _Output854 };
type _Output851 = {
	unitKind: _Output852;
	language: _Output33;
	family: _Output34;
	kind: _Output35;
	canonicalForm: _Output567;
	coreFeatures: _Output853;
};
type _Output849 = {
	unitKind: _Output850;
	lemma: _Output851;
	emojiDescription: _Output569;
};
type _Output857 = "Reading";
type _Output859 = "Lemma";
type _Output862 = "Def" | "Ind";
type _Output861 = _Output862 | null;
type _Output864 = "ADV" | "DET";
type _Output863 = _Output864 | null;
type _Output865 = _Output812 | null;
type _Output867 = "Card" | "Ord";
type _Output866 = _Output867 | null;
type _Output869 = "1" | "2" | "3";
type _Output868 = _Output869 | null;
type _Output871 = "Form" | "Infm";
type _Output870 = _Output871 | null;
type _Output873 = "Yes";
type _Output872 = _Output873 | null;
type _Output875 =
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
type _Output874 = _Output875 | null;
type _Output860 = {
	definite: _Output861;
	extPos: _Output863;
	foreign: _Output865;
	numType: _Output866;
	person: _Output868;
	polite: _Output870;
	poss: _Output872;
	pronType: _Output874;
};
type _Output858 = {
	unitKind: _Output859;
	language: _Output37;
	family: _Output38;
	kind: _Output39;
	canonicalForm: _Output567;
	coreFeatures: _Output860;
};
type _Output856 = {
	unitKind: _Output857;
	lemma: _Output858;
	emojiDescription: _Output569;
};
type _Output877 = "Reading";
type _Output879 = "Lemma";
type _Output882 = "Res";
type _Output881 = _Output882 | null;
type _Output880 = { partType: _Output881 };
type _Output878 = {
	unitKind: _Output879;
	language: _Output41;
	family: _Output42;
	kind: _Output43;
	canonicalForm: _Output567;
	coreFeatures: _Output880;
};
type _Output876 = {
	unitKind: _Output877;
	lemma: _Output878;
	emojiDescription: _Output569;
};
type _Output884 = "Reading";
type _Output886 = "Lemma";
type _Output889 = "Fem" | "Masc" | "Neut";
type _Output888 = _Output889 | null;
type _Output891 = "Yes";
type _Output890 = _Output891 | null;
type _Output887 = { gender: _Output888; hyph: _Output890 };
type _Output885 = {
	unitKind: _Output886;
	language: _Output45;
	family: _Output46;
	kind: _Output47;
	canonicalForm: _Output567;
	coreFeatures: _Output887;
};
type _Output883 = {
	unitKind: _Output884;
	lemma: _Output885;
	emojiDescription: _Output569;
};
type _Output893 = "Reading";
type _Output895 = "Lemma";
type _Output897 = _Output810 | null;
type _Output898 = _Output812 | null;
type _Output900 = "Card" | "Frac" | "Mult" | "Range";
type _Output899 = _Output900 | null;
type _Output896 = {
	abbr: _Output897;
	foreign: _Output898;
	numType: _Output899;
};
type _Output894 = {
	unitKind: _Output895;
	language: _Output49;
	family: _Output50;
	kind: _Output51;
	canonicalForm: _Output567;
	coreFeatures: _Output896;
};
type _Output892 = {
	unitKind: _Output893;
	lemma: _Output894;
	emojiDescription: _Output569;
};
type _Output902 = "Reading";
type _Output904 = "Lemma";
type _Output906 = _Output810 | null;
type _Output907 = _Output812 | null;
type _Output908 = _Output891 | null;
type _Output910 = "Card" | "Mult" | "Range";
type _Output909 = _Output910 | null;
type _Output905 = {
	abbr: _Output906;
	foreign: _Output907;
	hyph: _Output908;
	numType: _Output909;
};
type _Output903 = {
	unitKind: _Output904;
	language: _Output53;
	family: _Output54;
	kind: _Output55;
	canonicalForm: _Output567;
	coreFeatures: _Output905;
};
type _Output901 = {
	unitKind: _Output902;
	lemma: _Output903;
	emojiDescription: _Output569;
};
type _Output912 = "Reading";
type _Output914 = "Lemma";
type _Output916 = _Output810 | null;
type _Output917 = _Output812 | null;
type _Output919 = "Inf";
type _Output918 = _Output919 | null;
type _Output921 = "Neg" | "Pos";
type _Output920 = _Output921 | null;
type _Output915 = {
	abbr: _Output916;
	foreign: _Output917;
	partType: _Output918;
	polarity: _Output920;
};
type _Output913 = {
	unitKind: _Output914;
	language: _Output57;
	family: _Output58;
	kind: _Output59;
	canonicalForm: _Output567;
	coreFeatures: _Output915;
};
type _Output911 = {
	unitKind: _Output912;
	lemma: _Output913;
	emojiDescription: _Output569;
};
type _Output923 = "Reading";
type _Output925 = "Lemma";
type _Output928 = "Acc" | "Dat" | "Gen" | "Nom";
type _Output927 = _Output928 | null;
type _Output930 = "Plur" | "Sing";
type _Output929 = _Output930 | null;
type _Output932 = "Fem" | "Masc" | "Neut";
type _Output931 = _Output932 | null;
type _Output934 = "DET";
type _Output933 = _Output934 | null;
type _Output935 = _Output812 | null;
type _Output937 = "1" | "2" | "3";
type _Output936 = _Output937 | null;
type _Output939 = "Form" | "Infm";
type _Output938 = _Output939 | null;
type _Output940 = _Output873 | null;
type _Output942 = "Dem" | "Ind" | "Int" | "Neg" | "Prs" | "Rcp" | "Rel" | "Tot";
type _Output941 = _Output942 | null;
type _Output944 = "Fem" | "Masc" | "Neut";
type _Output943 = _Output944 | null;
type _Output946 = "Plur" | "Sing";
type _Output945 = _Output946 | null;
type _Output926 = {
	case: _Output927;
	number: _Output929;
	"gender[psor]": _Output931;
	extPos: _Output933;
	foreign: _Output935;
	person: _Output936;
	polite: _Output938;
	poss: _Output940;
	pronType: _Output941;
	gender: _Output943;
	referenceNumber: _Output945;
};
type _Output924 = {
	unitKind: _Output925;
	language: _Output61;
	family: _Output62;
	kind: _Output63;
	canonicalForm: _Output567;
	coreFeatures: _Output926;
};
type _Output922 = {
	unitKind: _Output923;
	lemma: _Output924;
	emojiDescription: _Output569;
};
type _Output948 = "Reading";
type _Output950 = "Lemma";
type _Output952 = _Output810 | null;
type _Output953 = _Output812 | null;
type _Output955 = "Fem" | "Masc" | "Neut";
type _Output954 = _Output955 | null;
type _Output951 = { abbr: _Output952; foreign: _Output953; gender: _Output954 };
type _Output949 = {
	unitKind: _Output950;
	language: _Output65;
	family: _Output66;
	kind: _Output67;
	canonicalForm: _Output567;
	coreFeatures: _Output951;
};
type _Output947 = {
	unitKind: _Output948;
	lemma: _Output949;
	emojiDescription: _Output569;
};
type _Output957 = "Reading";
type _Output959 = "Lemma";
type _Output962 =
	| "Brck"
	| "Colo"
	| "Comm"
	| "Dash"
	| "Elip"
	| "Excl"
	| "Peri"
	| "Qest"
	| "Quot";
type _Output961 = _Output962 | null;
type _Output960 = { punctType: _Output961 };
type _Output958 = {
	unitKind: _Output959;
	language: _Output69;
	family: _Output70;
	kind: _Output71;
	canonicalForm: _Output567;
	coreFeatures: _Output960;
};
type _Output956 = {
	unitKind: _Output957;
	lemma: _Output958;
	emojiDescription: _Output569;
};
type _Output964 = "Reading";
type _Output966 = "Lemma";
type _Output969 = "Comp";
type _Output968 = _Output969 | null;
type _Output967 = { conjType: _Output968 };
type _Output965 = {
	unitKind: _Output966;
	language: _Output73;
	family: _Output74;
	kind: _Output75;
	canonicalForm: _Output567;
	coreFeatures: _Output967;
};
type _Output963 = {
	unitKind: _Output964;
	lemma: _Output965;
	emojiDescription: _Output569;
};
type _Output971 = "Reading";
type _Output973 = "Lemma";
type _Output975 = _Output812 | null;
type _Output977 = "Card" | "Range";
type _Output976 = _Output977 | null;
type _Output974 = { foreign: _Output975; numType: _Output976 };
type _Output972 = {
	unitKind: _Output973;
	language: _Output77;
	family: _Output78;
	kind: _Output79;
	canonicalForm: _Output567;
	coreFeatures: _Output974;
};
type _Output970 = {
	unitKind: _Output971;
	lemma: _Output972;
	emojiDescription: _Output569;
};
type _Output979 = "Reading";
type _Output981 = "Lemma";
type _Output983 = _Output596 | null;
type _Output985 = "Yes";
type _Output984 = _Output985 | null;
type _Output986 = _Output848 | null;
type _Output982 = {
	hasSepPrefix: _Output983;
	lexicallyReflexive: _Output984;
	verbType: _Output986;
};
type _Output980 = {
	unitKind: _Output981;
	language: _Output81;
	family: _Output82;
	kind: _Output83;
	canonicalForm: _Output567;
	coreFeatures: _Output982;
};
type _Output978 = {
	unitKind: _Output979;
	lemma: _Output980;
	emojiDescription: _Output569;
};
type _Output988 = "Reading";
type _Output990 = "Lemma";
type _Output991 = Record<string, never>;
type _Output989 = {
	unitKind: _Output990;
	language: _Output125;
	family: _Output126;
	kind: _Output127;
	canonicalForm: _Output567;
	coreFeatures: _Output991;
};
type _Output987 = {
	unitKind: _Output988;
	lemma: _Output989;
	emojiDescription: _Output569;
};
type _Output993 = "Reading";
type _Output995 = "Lemma";
type _Output996 = Record<string, never>;
type _Output994 = {
	unitKind: _Output995;
	language: _Output129;
	family: _Output130;
	kind: _Output131;
	canonicalForm: _Output567;
	coreFeatures: _Output996;
};
type _Output992 = {
	unitKind: _Output993;
	lemma: _Output994;
	emojiDescription: _Output569;
};
type _Output998 = "Reading";
type _Output1000 = "Lemma";
type _Output1003 =
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
type _Output1002 = _Output1003 | null;
type _Output1001 = { discourseFormulaRole: _Output1002 };
type _Output999 = {
	unitKind: _Output1000;
	language: _Output133;
	family: _Output134;
	kind: _Output135;
	canonicalForm: _Output567;
	coreFeatures: _Output1001;
};
type _Output997 = {
	unitKind: _Output998;
	lemma: _Output999;
	emojiDescription: _Output569;
};
type _Output1005 = "Reading";
type _Output1007 = "Lemma";
type _Output1008 = Record<string, never>;
type _Output1006 = {
	unitKind: _Output1007;
	language: _Output137;
	family: _Output138;
	kind: _Output139;
	canonicalForm: _Output567;
	coreFeatures: _Output1008;
};
type _Output1004 = {
	unitKind: _Output1005;
	lemma: _Output1006;
	emojiDescription: _Output569;
};
type _Output1010 = "Reading";
type _Output1012 = "Lemma";
type _Output1013 = Record<string, never>;
type _Output1011 = {
	unitKind: _Output1012;
	language: _Output141;
	family: _Output142;
	kind: _Output143;
	canonicalForm: _Output567;
	coreFeatures: _Output1013;
};
type _Output1009 = {
	unitKind: _Output1010;
	lemma: _Output1011;
	emojiDescription: _Output569;
};
type _Output1015 = "Reading";
type _Output1017 = "Lemma";
type _Output1019 = _Output810 | null;
type _Output1021 = "ADP" | "ADV" | "SCONJ";
type _Output1020 = _Output1021 | null;
type _Output1023 = "Combi" | "Word";
type _Output1022 = _Output1023 | null;
type _Output1025 = "Frac" | "Ord";
type _Output1024 = _Output1025 | null;
type _Output1027 = "Expr";
type _Output1026 = _Output1027 | null;
type _Output1018 = {
	abbr: _Output1019;
	extPos: _Output1020;
	numForm: _Output1022;
	numType: _Output1024;
	style: _Output1026;
};
type _Output1016 = {
	unitKind: _Output1017;
	language: _Output145;
	family: _Output146;
	kind: _Output147;
	canonicalForm: _Output567;
	coreFeatures: _Output1018;
};
type _Output1014 = {
	unitKind: _Output1015;
	lemma: _Output1016;
	emojiDescription: _Output569;
};
type _Output1029 = "Reading";
type _Output1031 = "Lemma";
type _Output1033 = _Output810 | null;
type _Output1035 = "ADP" | "ADV" | "SCONJ";
type _Output1034 = _Output1035 | null;
type _Output1032 = { abbr: _Output1033; extPos: _Output1034 };
type _Output1030 = {
	unitKind: _Output1031;
	language: _Output149;
	family: _Output150;
	kind: _Output151;
	canonicalForm: _Output567;
	coreFeatures: _Output1032;
};
type _Output1028 = {
	unitKind: _Output1029;
	lemma: _Output1030;
	emojiDescription: _Output569;
};
type _Output1037 = "Reading";
type _Output1039 = "Lemma";
type _Output1041 = _Output810 | null;
type _Output1043 = "ADP" | "ADV" | "CCONJ" | "SCONJ";
type _Output1042 = _Output1043 | null;
type _Output1045 = "Word";
type _Output1044 = _Output1045 | null;
type _Output1047 = "Frac" | "Mult" | "Ord";
type _Output1046 = _Output1047 | null;
type _Output1050 = "Dem" | "Ind" | "Int" | "Neg" | "Rel" | "Tot";
type _Output1051 = [_Output1050, ...Array<_Output1050>];
type _Output1049 = _Output1050 | _Output1051;
type _Output1048 = _Output1049 | null;
type _Output1053 = "Expr" | "Slng";
type _Output1052 = _Output1053 | null;
type _Output1040 = {
	abbr: _Output1041;
	extPos: _Output1042;
	numForm: _Output1044;
	numType: _Output1046;
	pronType: _Output1048;
	style: _Output1052;
};
type _Output1038 = {
	unitKind: _Output1039;
	language: _Output153;
	family: _Output154;
	kind: _Output155;
	canonicalForm: _Output567;
	coreFeatures: _Output1040;
};
type _Output1036 = {
	unitKind: _Output1037;
	lemma: _Output1038;
	emojiDescription: _Output569;
};
type _Output1055 = "Reading";
type _Output1057 = "Lemma";
type _Output1059 = _Output810 | null;
type _Output1061 = "Arch" | "Vrnc";
type _Output1060 = _Output1061 | null;
type _Output1058 = { abbr: _Output1059; style: _Output1060 };
type _Output1056 = {
	unitKind: _Output1057;
	language: _Output157;
	family: _Output158;
	kind: _Output159;
	canonicalForm: _Output567;
	coreFeatures: _Output1058;
};
type _Output1054 = {
	unitKind: _Output1055;
	lemma: _Output1056;
	emojiDescription: _Output569;
};
type _Output1063 = "Reading";
type _Output1065 = "Lemma";
type _Output1067 = _Output810 | null;
type _Output1069 = "Neg";
type _Output1068 = _Output1069 | null;
type _Output1066 = { abbr: _Output1067; polarity: _Output1068 };
type _Output1064 = {
	unitKind: _Output1065;
	language: _Output161;
	family: _Output162;
	kind: _Output163;
	canonicalForm: _Output567;
	coreFeatures: _Output1066;
};
type _Output1062 = {
	unitKind: _Output1063;
	lemma: _Output1064;
	emojiDescription: _Output569;
};
type _Output1071 = "Reading";
type _Output1073 = "Lemma";
type _Output1075 = _Output810 | null;
type _Output1077 = "Def" | "Ind";
type _Output1076 = _Output1077 | null;
type _Output1079 = "ADV" | "PRON";
type _Output1078 = _Output1079 | null;
type _Output1081 = "Word";
type _Output1080 = _Output1081 | null;
type _Output1083 = "Frac";
type _Output1082 = _Output1083 | null;
type _Output1086 =
	| "Art"
	| "Dem"
	| "Ind"
	| "Int"
	| "Neg"
	| "Rcp"
	| "Rel"
	| "Tot";
type _Output1087 = [_Output1086, ...Array<_Output1086>];
type _Output1085 = _Output1086 | _Output1087;
type _Output1084 = _Output1085 | null;
type _Output1089 = "Vrnc";
type _Output1088 = _Output1089 | null;
type _Output1074 = {
	abbr: _Output1075;
	definite: _Output1076;
	extPos: _Output1078;
	numForm: _Output1080;
	numType: _Output1082;
	pronType: _Output1084;
	style: _Output1088;
};
type _Output1072 = {
	unitKind: _Output1073;
	language: _Output165;
	family: _Output166;
	kind: _Output167;
	canonicalForm: _Output567;
	coreFeatures: _Output1074;
};
type _Output1070 = {
	unitKind: _Output1071;
	lemma: _Output1072;
	emojiDescription: _Output569;
};
type _Output1091 = "Reading";
type _Output1093 = "Lemma";
type _Output1095 = _Output810 | null;
type _Output1096 = _Output812 | null;
type _Output1098 = "Neg" | "Pos";
type _Output1097 = _Output1098 | null;
type _Output1100 = "Expr";
type _Output1099 = _Output1100 | null;
type _Output1094 = {
	abbr: _Output1095;
	foreign: _Output1096;
	polarity: _Output1097;
	style: _Output1099;
};
type _Output1092 = {
	unitKind: _Output1093;
	language: _Output169;
	family: _Output170;
	kind: _Output171;
	canonicalForm: _Output567;
	coreFeatures: _Output1094;
};
type _Output1090 = {
	unitKind: _Output1091;
	lemma: _Output1092;
	emojiDescription: _Output569;
};
type _Output1102 = "Reading";
type _Output1104 = "Lemma";
type _Output1106 = _Output810 | null;
type _Output1108 = "ADV" | "PROPN";
type _Output1107 = _Output1108 | null;
type _Output1109 = _Output812 | null;
type _Output1111 = "Combi" | "Digit" | "Word";
type _Output1110 = _Output1111 | null;
type _Output1113 = "Card" | "Frac" | "Ord";
type _Output1112 = _Output1113 | null;
type _Output1115 = "Expr" | "Vrnc";
type _Output1114 = _Output1115 | null;
type _Output1105 = {
	abbr: _Output1106;
	extPos: _Output1107;
	foreign: _Output1109;
	numForm: _Output1110;
	numType: _Output1112;
	style: _Output1114;
};
type _Output1103 = {
	unitKind: _Output1104;
	language: _Output173;
	family: _Output174;
	kind: _Output175;
	canonicalForm: _Output567;
	coreFeatures: _Output1105;
};
type _Output1101 = {
	unitKind: _Output1102;
	lemma: _Output1103;
	emojiDescription: _Output569;
};
type _Output1117 = "Reading";
type _Output1119 = "Lemma";
type _Output1121 = _Output810 | null;
type _Output1123 = "PROPN";
type _Output1122 = _Output1123 | null;
type _Output1125 = "Digit" | "Roman" | "Word";
type _Output1124 = _Output1125 | null;
type _Output1127 = "Card" | "Frac";
type _Output1126 = _Output1127 | null;
type _Output1120 = {
	abbr: _Output1121;
	extPos: _Output1122;
	numForm: _Output1124;
	numType: _Output1126;
};
type _Output1118 = {
	unitKind: _Output1119;
	language: _Output177;
	family: _Output178;
	kind: _Output179;
	canonicalForm: _Output567;
	coreFeatures: _Output1120;
};
type _Output1116 = {
	unitKind: _Output1117;
	lemma: _Output1118;
	emojiDescription: _Output569;
};
type _Output1129 = "Reading";
type _Output1131 = "Lemma";
type _Output1134 = "PROPN";
type _Output1133 = _Output1134 | null;
type _Output1135 = _Output812 | null;
type _Output1132 = { extPos: _Output1133; foreign: _Output1135 };
type _Output1130 = {
	unitKind: _Output1131;
	language: _Output181;
	family: _Output182;
	kind: _Output183;
	canonicalForm: _Output567;
	coreFeatures: _Output1132;
};
type _Output1128 = {
	unitKind: _Output1129;
	lemma: _Output1130;
	emojiDescription: _Output569;
};
type _Output1137 = "Reading";
type _Output1139 = "Lemma";
type _Output1141 = _Output810 | null;
type _Output1143 = "CCONJ";
type _Output1142 = _Output1143 | null;
type _Output1145 = "Neg";
type _Output1144 = _Output1145 | null;
type _Output1140 = {
	abbr: _Output1141;
	extPos: _Output1142;
	polarity: _Output1144;
};
type _Output1138 = {
	unitKind: _Output1139;
	language: _Output185;
	family: _Output186;
	kind: _Output187;
	canonicalForm: _Output567;
	coreFeatures: _Output1140;
};
type _Output1136 = {
	unitKind: _Output1137;
	lemma: _Output1138;
	emojiDescription: _Output569;
};
type _Output1147 = "Reading";
type _Output1149 = "Lemma";
type _Output1151 = _Output810 | null;
type _Output1153 = "ADV" | "PRON";
type _Output1152 = _Output1153 | null;
type _Output1155 = "1" | "2" | "3";
type _Output1154 = _Output1155 | null;
type _Output1156 = _Output873 | null;
type _Output1159 =
	| "Dem"
	| "Emp"
	| "Ind"
	| "Int"
	| "Neg"
	| "Prs"
	| "Rcp"
	| "Rel"
	| "Tot";
type _Output1160 = [_Output1159, ...Array<_Output1159>];
type _Output1158 = _Output1159 | _Output1160;
type _Output1157 = _Output1158 | null;
type _Output1162 = "Arch" | "Coll" | "Expr" | "Slng" | "Vrnc";
type _Output1161 = _Output1162 | null;
type _Output1150 = {
	abbr: _Output1151;
	extPos: _Output1152;
	person: _Output1154;
	poss: _Output1156;
	pronType: _Output1157;
	style: _Output1161;
};
type _Output1148 = {
	unitKind: _Output1149;
	language: _Output189;
	family: _Output190;
	kind: _Output191;
	canonicalForm: _Output567;
	coreFeatures: _Output1150;
};
type _Output1146 = {
	unitKind: _Output1147;
	lemma: _Output1148;
	emojiDescription: _Output569;
};
type _Output1164 = "Reading";
type _Output1166 = "Lemma";
type _Output1168 = _Output810 | null;
type _Output1170 = "PROPN";
type _Output1169 = _Output1170 | null;
type _Output1172 = "Expr";
type _Output1171 = _Output1172 | null;
type _Output1167 = {
	abbr: _Output1168;
	extPos: _Output1169;
	style: _Output1171;
};
type _Output1165 = {
	unitKind: _Output1166;
	language: _Output193;
	family: _Output194;
	kind: _Output195;
	canonicalForm: _Output567;
	coreFeatures: _Output1167;
};
type _Output1163 = {
	unitKind: _Output1164;
	lemma: _Output1165;
	emojiDescription: _Output569;
};
type _Output1174 = "Reading";
type _Output1176 = "Lemma";
type _Output1177 = Record<string, never>;
type _Output1175 = {
	unitKind: _Output1176;
	language: _Output197;
	family: _Output198;
	kind: _Output199;
	canonicalForm: _Output567;
	coreFeatures: _Output1177;
};
type _Output1173 = {
	unitKind: _Output1174;
	lemma: _Output1175;
	emojiDescription: _Output569;
};
type _Output1179 = "Reading";
type _Output1181 = "Lemma";
type _Output1183 = _Output810 | null;
type _Output1185 = "ADP" | "SCONJ";
type _Output1184 = _Output1185 | null;
type _Output1187 = "Vrnc";
type _Output1186 = _Output1187 | null;
type _Output1182 = {
	abbr: _Output1183;
	extPos: _Output1184;
	style: _Output1186;
};
type _Output1180 = {
	unitKind: _Output1181;
	language: _Output201;
	family: _Output202;
	kind: _Output203;
	canonicalForm: _Output567;
	coreFeatures: _Output1182;
};
type _Output1178 = {
	unitKind: _Output1179;
	lemma: _Output1180;
	emojiDescription: _Output569;
};
type _Output1189 = "Reading";
type _Output1191 = "Lemma";
type _Output1193 = _Output810 | null;
type _Output1195 = "ADP" | "PROPN";
type _Output1194 = _Output1195 | null;
type _Output1192 = { abbr: _Output1193; extPos: _Output1194 };
type _Output1190 = {
	unitKind: _Output1191;
	language: _Output205;
	family: _Output206;
	kind: _Output207;
	canonicalForm: _Output567;
	coreFeatures: _Output1192;
};
type _Output1188 = {
	unitKind: _Output1189;
	lemma: _Output1190;
	emojiDescription: _Output569;
};
type _Output1197 = "Reading";
type _Output1199 = "Lemma";
type _Output1201 = _Output810 | null;
type _Output1203 = "ADP" | "CCONJ" | "PROPN";
type _Output1202 = _Output1203 | null;
type _Output1205 = "Yes";
type _Output1204 = _Output1205 | null;
type _Output1207 = "Expr" | "Vrnc";
type _Output1206 = _Output1207 | null;
type _Output1200 = {
	abbr: _Output1201;
	extPos: _Output1202;
	phrasal: _Output1204;
	style: _Output1206;
};
type _Output1198 = {
	unitKind: _Output1199;
	language: _Output209;
	family: _Output210;
	kind: _Output211;
	canonicalForm: _Output567;
	coreFeatures: _Output1200;
};
type _Output1196 = {
	unitKind: _Output1197;
	lemma: _Output1198;
	emojiDescription: _Output569;
};
type _Output1209 = "Reading";
type _Output1211 = "Lemma";
type _Output1212 = Record<string, never>;
type _Output1210 = {
	unitKind: _Output1211;
	language: _Output257;
	family: _Output258;
	kind: _Output259;
	canonicalForm: _Output567;
	coreFeatures: _Output1212;
};
type _Output1208 = {
	unitKind: _Output1209;
	lemma: _Output1210;
	emojiDescription: _Output569;
};
type _Output1214 = "Reading";
type _Output1216 = "Lemma";
type _Output1218 = _Output1003 | null;
type _Output1217 = { discourseFormulaRole: _Output1218 };
type _Output1215 = {
	unitKind: _Output1216;
	language: _Output261;
	family: _Output262;
	kind: _Output263;
	canonicalForm: _Output567;
	coreFeatures: _Output1217;
};
type _Output1213 = {
	unitKind: _Output1214;
	lemma: _Output1215;
	emojiDescription: _Output569;
};
type _Output1220 = "Reading";
type _Output1222 = "Lemma";
type _Output1223 = Record<string, never>;
type _Output1221 = {
	unitKind: _Output1222;
	language: _Output265;
	family: _Output266;
	kind: _Output267;
	canonicalForm: _Output567;
	coreFeatures: _Output1223;
};
type _Output1219 = {
	unitKind: _Output1220;
	lemma: _Output1221;
	emojiDescription: _Output569;
};
type _Output1225 = "Reading";
type _Output1227 = "Lemma";
type _Output1228 = Record<string, never>;
type _Output1226 = {
	unitKind: _Output1227;
	language: _Output269;
	family: _Output270;
	kind: _Output271;
	canonicalForm: _Output567;
	coreFeatures: _Output1228;
};
type _Output1224 = {
	unitKind: _Output1225;
	lemma: _Output1226;
	emojiDescription: _Output569;
};
type _Output1230 = "Reading";
type _Output1232 = "Lemma";
type _Output1234 = _Output810 | null;
type _Output1233 = { abbr: _Output1234 };
type _Output1231 = {
	unitKind: _Output1232;
	language: _Output273;
	family: _Output274;
	kind: _Output275;
	canonicalForm: _Output567;
	coreFeatures: _Output1233;
};
type _Output1229 = {
	unitKind: _Output1230;
	lemma: _Output1231;
	emojiDescription: _Output569;
};
type _Output1236 = "Reading";
type _Output1238 = "Lemma";
type _Output1240 = _Output810 | null;
type _Output1242 = "Acc" | "Gen";
type _Output1241 = _Output1242 | null;
type _Output1239 = { abbr: _Output1240; case: _Output1241 };
type _Output1237 = {
	unitKind: _Output1238;
	language: _Output277;
	family: _Output278;
	kind: _Output279;
	canonicalForm: _Output567;
	coreFeatures: _Output1239;
};
type _Output1235 = {
	unitKind: _Output1236;
	lemma: _Output1237;
	emojiDescription: _Output569;
};
type _Output1244 = "Reading";
type _Output1246 = "Lemma";
type _Output1249 = "Yes";
type _Output1248 = _Output1249 | null;
type _Output1247 = { prefix: _Output1248 };
type _Output1245 = {
	unitKind: _Output1246;
	language: _Output281;
	family: _Output282;
	kind: _Output283;
	canonicalForm: _Output567;
	coreFeatures: _Output1247;
};
type _Output1243 = {
	unitKind: _Output1244;
	lemma: _Output1245;
	emojiDescription: _Output569;
};
type _Output1251 = "Reading";
type _Output1253 = "Lemma";
type _Output1256 = "Cop" | "Mod";
type _Output1255 = _Output1256 | null;
type _Output1254 = { verbType: _Output1255 };
type _Output1252 = {
	unitKind: _Output1253;
	language: _Output285;
	family: _Output286;
	kind: _Output287;
	canonicalForm: _Output567;
	coreFeatures: _Output1254;
};
type _Output1250 = {
	unitKind: _Output1251;
	lemma: _Output1252;
	emojiDescription: _Output569;
};
type _Output1258 = "Reading";
type _Output1260 = "Lemma";
type _Output1261 = Record<string, never>;
type _Output1259 = {
	unitKind: _Output1260;
	language: _Output289;
	family: _Output290;
	kind: _Output291;
	canonicalForm: _Output567;
	coreFeatures: _Output1261;
};
type _Output1257 = {
	unitKind: _Output1258;
	lemma: _Output1259;
	emojiDescription: _Output569;
};
type _Output1263 = "Reading";
type _Output1265 = "Lemma";
type _Output1268 = "Art" | "Int";
type _Output1267 = _Output1268 | null;
type _Output1266 = { pronType: _Output1267 };
type _Output1264 = {
	unitKind: _Output1265;
	language: _Output293;
	family: _Output294;
	kind: _Output295;
	canonicalForm: _Output567;
	coreFeatures: _Output1266;
};
type _Output1262 = {
	unitKind: _Output1263;
	lemma: _Output1264;
	emojiDescription: _Output569;
};
type _Output1270 = "Reading";
type _Output1272 = "Lemma";
type _Output1273 = Record<string, never>;
type _Output1271 = {
	unitKind: _Output1272;
	language: _Output297;
	family: _Output298;
	kind: _Output299;
	canonicalForm: _Output567;
	coreFeatures: _Output1273;
};
type _Output1269 = {
	unitKind: _Output1270;
	lemma: _Output1271;
	emojiDescription: _Output569;
};
type _Output1275 = "Reading";
type _Output1277 = "Lemma";
type _Output1279 = _Output810 | null;
type _Output1282 = "Fem" | "Masc";
type _Output1283 = [_Output1282, ...Array<_Output1282>];
type _Output1281 = _Output1282 | _Output1283;
type _Output1280 = _Output1281 | null;
type _Output1278 = { abbr: _Output1279; gender: _Output1280 };
type _Output1276 = {
	unitKind: _Output1277;
	language: _Output301;
	family: _Output302;
	kind: _Output303;
	canonicalForm: _Output567;
	coreFeatures: _Output1278;
};
type _Output1274 = {
	unitKind: _Output1275;
	lemma: _Output1276;
	emojiDescription: _Output569;
};
type _Output1285 = "Reading";
type _Output1287 = "Lemma";
type _Output1288 = Record<string, never>;
type _Output1286 = {
	unitKind: _Output1287;
	language: _Output305;
	family: _Output306;
	kind: _Output307;
	canonicalForm: _Output567;
	coreFeatures: _Output1288;
};
type _Output1284 = {
	unitKind: _Output1285;
	lemma: _Output1286;
	emojiDescription: _Output569;
};
type _Output1290 = "Reading";
type _Output1292 = "Lemma";
type _Output1293 = Record<string, never>;
type _Output1291 = {
	unitKind: _Output1292;
	language: _Output309;
	family: _Output310;
	kind: _Output311;
	canonicalForm: _Output567;
	coreFeatures: _Output1293;
};
type _Output1289 = {
	unitKind: _Output1290;
	lemma: _Output1291;
	emojiDescription: _Output569;
};
type _Output1295 = "Reading";
type _Output1297 = "Lemma";
type _Output1298 = Record<string, never>;
type _Output1296 = {
	unitKind: _Output1297;
	language: _Output313;
	family: _Output314;
	kind: _Output315;
	canonicalForm: _Output567;
	coreFeatures: _Output1298;
};
type _Output1294 = {
	unitKind: _Output1295;
	lemma: _Output1296;
	emojiDescription: _Output569;
};
type _Output1300 = "Reading";
type _Output1302 = "Lemma";
type _Output1305 = "Def";
type _Output1304 = _Output1305 | null;
type _Output1307 = "Dem" | "Ind" | "Int" | "Prs";
type _Output1306 = _Output1307 | null;
type _Output1309 = "Yes";
type _Output1308 = _Output1309 | null;
type _Output1303 = {
	definite: _Output1304;
	pronType: _Output1306;
	reflex: _Output1308;
};
type _Output1301 = {
	unitKind: _Output1302;
	language: _Output317;
	family: _Output318;
	kind: _Output319;
	canonicalForm: _Output567;
	coreFeatures: _Output1303;
};
type _Output1299 = {
	unitKind: _Output1300;
	lemma: _Output1301;
	emojiDescription: _Output569;
};
type _Output1311 = "Reading";
type _Output1313 = "Lemma";
type _Output1315 = _Output810 | null;
type _Output1318 = "Fem" | "Masc";
type _Output1319 = [_Output1318, ...Array<_Output1318>];
type _Output1317 = _Output1318 | _Output1319;
type _Output1316 = _Output1317 | null;
type _Output1314 = { abbr: _Output1315; gender: _Output1316 };
type _Output1312 = {
	unitKind: _Output1313;
	language: _Output321;
	family: _Output322;
	kind: _Output323;
	canonicalForm: _Output567;
	coreFeatures: _Output1314;
};
type _Output1310 = {
	unitKind: _Output1311;
	lemma: _Output1312;
	emojiDescription: _Output569;
};
type _Output1321 = "Reading";
type _Output1323 = "Lemma";
type _Output1324 = Record<string, never>;
type _Output1322 = {
	unitKind: _Output1323;
	language: _Output325;
	family: _Output326;
	kind: _Output327;
	canonicalForm: _Output567;
	coreFeatures: _Output1324;
};
type _Output1320 = {
	unitKind: _Output1321;
	lemma: _Output1322;
	emojiDescription: _Output569;
};
type _Output1326 = "Reading";
type _Output1328 = "Lemma";
type _Output1331 = "Tem";
type _Output1330 = _Output1331 | null;
type _Output1329 = { case: _Output1330 };
type _Output1327 = {
	unitKind: _Output1328;
	language: _Output329;
	family: _Output330;
	kind: _Output331;
	canonicalForm: _Output567;
	coreFeatures: _Output1329;
};
type _Output1325 = {
	unitKind: _Output1326;
	lemma: _Output1327;
	emojiDescription: _Output569;
};
type _Output1333 = "Reading";
type _Output1335 = "Lemma";
type _Output1336 = Record<string, never>;
type _Output1334 = {
	unitKind: _Output1335;
	language: _Output333;
	family: _Output334;
	kind: _Output335;
	canonicalForm: _Output567;
	coreFeatures: _Output1336;
};
type _Output1332 = {
	unitKind: _Output1333;
	lemma: _Output1334;
	emojiDescription: _Output569;
};
type _Output1338 = "Reading";
type _Output1340 = "Lemma";
type _Output1343 =
	| "HIFIL"
	| "HITPAEL"
	| "HUFAL"
	| "NIFAL"
	| "PAAL"
	| "PIEL"
	| "PUAL";
type _Output1342 = _Output1343 | null;
type _Output1345 = "Yes";
type _Output1344 = _Output1345 | null;
type _Output1341 = { hebBinyan: _Output1342; hebExistential: _Output1344 };
type _Output1339 = {
	unitKind: _Output1340;
	language: _Output337;
	family: _Output338;
	kind: _Output339;
	canonicalForm: _Output567;
	coreFeatures: _Output1341;
};
type _Output1337 = {
	unitKind: _Output1338;
	lemma: _Output1339;
	emojiDescription: _Output569;
};
type _Output1347 = "Reading";
type _Output1349 = "Lemma";
type _Output1350 = Record<string, never>;
type _Output1348 = {
	unitKind: _Output1349;
	language: _Output385;
	family: _Output386;
	kind: _Output387;
	canonicalForm: _Output567;
	coreFeatures: _Output1350;
};
type _Output1346 = {
	unitKind: _Output1347;
	lemma: _Output1348;
	emojiDescription: _Output569;
};
type _Output1352 = "Reading";
type _Output1354 = "Lemma";
type _Output1355 = Record<string, never>;
type _Output1353 = {
	unitKind: _Output1354;
	language: _Output389;
	family: _Output390;
	kind: _Output391;
	canonicalForm: _Output567;
	coreFeatures: _Output1355;
};
type _Output1351 = {
	unitKind: _Output1352;
	lemma: _Output1353;
	emojiDescription: _Output569;
};
type _Output1357 = "Reading";
type _Output1359 = "Lemma";
type _Output1360 = Record<string, never>;
type _Output1358 = {
	unitKind: _Output1359;
	language: _Output393;
	family: _Output394;
	kind: _Output395;
	canonicalForm: _Output567;
	coreFeatures: _Output1360;
};
type _Output1356 = {
	unitKind: _Output1357;
	lemma: _Output1358;
	emojiDescription: _Output569;
};
type _Output1362 = "Reading";
type _Output1364 = "Lemma";
type _Output1365 = Record<string, never>;
type _Output1363 = {
	unitKind: _Output1364;
	language: _Output397;
	family: _Output398;
	kind: _Output399;
	canonicalForm: _Output567;
	coreFeatures: _Output1365;
};
type _Output1361 = {
	unitKind: _Output1362;
	lemma: _Output1363;
	emojiDescription: _Output569;
};
type _Output803 =
	| _Output804
	| _Output817
	| _Output832
	| _Output842
	| _Output849
	| _Output856
	| _Output876
	| _Output883
	| _Output892
	| _Output901
	| _Output911
	| _Output922
	| _Output947
	| _Output956
	| _Output963
	| _Output970
	| _Output978
	| _Output563
	| _Output570
	| _Output575
	| _Output580
	| _Output585
	| _Output590
	| _Output597
	| _Output602
	| _Output607
	| _Output612
	| _Output987
	| _Output992
	| _Output997
	| _Output1004
	| _Output1009
	| _Output1014
	| _Output1028
	| _Output1036
	| _Output1054
	| _Output1062
	| _Output1070
	| _Output1090
	| _Output1101
	| _Output1116
	| _Output1128
	| _Output1136
	| _Output1146
	| _Output1163
	| _Output1173
	| _Output1178
	| _Output1188
	| _Output1196
	| _Output617
	| _Output622
	| _Output627
	| _Output632
	| _Output637
	| _Output642
	| _Output647
	| _Output652
	| _Output657
	| _Output662
	| _Output667
	| _Output1208
	| _Output1213
	| _Output1219
	| _Output1224
	| _Output1229
	| _Output1235
	| _Output1243
	| _Output1250
	| _Output1257
	| _Output1262
	| _Output1269
	| _Output1274
	| _Output1284
	| _Output1289
	| _Output1294
	| _Output1299
	| _Output1310
	| _Output1320
	| _Output1325
	| _Output1332
	| _Output1337
	| _Output672
	| _Output677
	| _Output682
	| _Output687
	| _Output692
	| _Output697
	| _Output702
	| _Output707
	| _Output712
	| _Output717
	| _Output722
	| _Output1346
	| _Output1351
	| _Output1356
	| _Output1361;
type _Output802 = Array<_Output803>;
type _Output801 = _Output802 | undefined;
type _Output799 = { targetKind: _Output800; synonym?: _Output801 };
type _Output1368 = "lemma";
type _Output1367 = _Output1368 | undefined;
type _Output1371 =
	| _Output806
	| _Output819
	| _Output834
	| _Output844
	| _Output851
	| _Output858
	| _Output878
	| _Output885
	| _Output894
	| _Output903
	| _Output913
	| _Output924
	| _Output949
	| _Output958
	| _Output965
	| _Output972
	| _Output980
	| _Output565
	| _Output572
	| _Output577
	| _Output582
	| _Output587
	| _Output592
	| _Output599
	| _Output604
	| _Output609
	| _Output614
	| _Output989
	| _Output994
	| _Output999
	| _Output1006
	| _Output1011
	| _Output1016
	| _Output1030
	| _Output1038
	| _Output1056
	| _Output1064
	| _Output1072
	| _Output1092
	| _Output1103
	| _Output1118
	| _Output1130
	| _Output1138
	| _Output1148
	| _Output1165
	| _Output1175
	| _Output1180
	| _Output1190
	| _Output1198
	| _Output619
	| _Output624
	| _Output629
	| _Output634
	| _Output639
	| _Output644
	| _Output649
	| _Output654
	| _Output659
	| _Output664
	| _Output669
	| _Output1210
	| _Output1215
	| _Output1221
	| _Output1226
	| _Output1231
	| _Output1237
	| _Output1245
	| _Output1252
	| _Output1259
	| _Output1264
	| _Output1271
	| _Output1276
	| _Output1286
	| _Output1291
	| _Output1296
	| _Output1301
	| _Output1312
	| _Output1322
	| _Output1327
	| _Output1334
	| _Output1339
	| _Output674
	| _Output679
	| _Output684
	| _Output689
	| _Output694
	| _Output699
	| _Output704
	| _Output709
	| _Output714
	| _Output719
	| _Output724
	| _Output1348
	| _Output1353
	| _Output1358
	| _Output1363;
type _Output1370 = Array<_Output1371>;
type _Output1369 = _Output1370 | undefined;
type _Output1373 = Array<_Output1371>;
type _Output1372 = _Output1373 | undefined;
type _Output1375 = Array<_Output1371>;
type _Output1374 = _Output1375 | undefined;
type _Output1377 = Array<_Output1371>;
type _Output1376 = _Output1377 | undefined;
type _Output1379 = Array<_Output1371>;
type _Output1378 = _Output1379 | undefined;
type _Output1381 = Array<_Output1371>;
type _Output1380 = _Output1381 | undefined;
type _Output1366 = {
	targetKind?: _Output1367;
	synonym?: _Output1369;
	nearSynonym?: _Output1372;
	antonym?: _Output1374;
	nearAntonym?: _Output1376;
	hypernym?: _Output1378;
	holonym?: _Output1380;
};
type _Output798 = _Output799 | _Output1366;
type _Output1384 = string;
type _Output1383 = _Output1384 | undefined;
type _Output1385 = _Output1384 | undefined;
type _Output1389 = Array<_Output1384>;
type _Output1388 = _Output1389 | undefined;
type _Output1390 = _Output1389 | undefined;
type _Output1387 = { en?: _Output1388; ru?: _Output1390 };
type _Output1386 = _Output1387 | undefined;
type _Output1391 = _Output554 | undefined;
type _Output1392 = _Output501 | undefined;
type _Output1393 = _Output798 | undefined;
type _Output1397 = _Output819 | _Output1030 | _Output1237;
type _Output1398 = "Acc" | "Dat" | "Gen";
type _Output1396 = { preposition: _Output1397; case: _Output1398 };
type _Output1395 = Array<_Output1396>;
type _Output1394 = _Output1395 | undefined;
type _Output1382 = {
	transcription?: _Output1383;
	definition?: _Output1385;
	translations?: _Output1386;
	morphologicalTree?: _Output1391;
	lexicalBreakdown?: _Output1392;
	semanticRelations?: _Output1393;
	governedPrepositions?: _Output1394;
};
type _Output1401 = "Contribute" | "Correct";
type _Output1402 = "transcription" | "definition";
type _Output1400 = {
	kind: _Output1401;
	aspect: _Output1402;
	value: _Output1384;
};
type _Output1404 = "Retract";
type _Output1403 = { kind: _Output1404; aspect: _Output1402 };
type _Output1406 = "translations";
type _Output1405 = {
	kind: _Output1401;
	aspect: _Output1406;
	language: _Output402;
	value: _Output1389;
};
type _Output1408 = "Retract";
type _Output1409 = "translations";
type _Output1407 = {
	kind: _Output1408;
	aspect: _Output1409;
	language: _Output402;
};
type _Output1411 = "semanticRelations";
type _Output1412 = "synonym";
type _Output1413 = "reading";
type _Output1414 = Array<_Output803>;
type _Output1410 = {
	kind: _Output1401;
	aspect: _Output1411;
	relation: _Output1412;
	targetKind: _Output1413;
	value: _Output1414;
};
type _Output1416 = "semanticRelations";
type _Output1418 = "lemma";
type _Output1417 = _Output1418 | undefined;
type _Output1419 = Array<_Output1371>;
type _Output1415 = {
	kind: _Output1401;
	aspect: _Output1416;
	relation: _Output401;
	targetKind?: _Output1417;
	value: _Output1419;
};
type _Output1421 = "Retract";
type _Output1422 = "semanticRelations";
type _Output1423 = "synonym";
type _Output1424 = "reading";
type _Output1420 = {
	kind: _Output1421;
	aspect: _Output1422;
	relation: _Output1423;
	targetKind: _Output1424;
};
type _Output1426 = "Retract";
type _Output1427 = "semanticRelations";
type _Output1429 = "lemma";
type _Output1428 = _Output1429 | undefined;
type _Output1425 = {
	kind: _Output1426;
	aspect: _Output1427;
	relation: _Output401;
	targetKind?: _Output1428;
};
type _Output1431 = "governedPrepositions";
type _Output1430 = {
	kind: _Output1401;
	aspect: _Output1431;
	value: _Output1395;
};
type _Output1433 = "Retract";
type _Output1434 = "governedPrepositions";
type _Output1432 = { kind: _Output1433; aspect: _Output1434 };
type _Output1436 = "morphologicalTree";
type _Output1435 = {
	kind: _Output1401;
	aspect: _Output1436;
	value: _Output554;
};
type _Output1438 = "lexicalBreakdown";
type _Output1437 = {
	kind: _Output1401;
	aspect: _Output1438;
	value: _Output501;
};
type _Output1440 = "Retract";
type _Output1441 = "morphologicalTree" | "lexicalBreakdown";
type _Output1439 = { kind: _Output1440; aspect: _Output1441 };
type _Output1399 =
	| _Output1400
	| _Output1403
	| _Output1405
	| _Output1407
	| _Output1410
	| _Output1415
	| _Output1420
	| _Output1425
	| _Output1430
	| _Output1432
	| _Output1435
	| _Output1437
	| _Output1439;
type _Output1442 =
	| "synonym"
	| "nearSynonym"
	| "antonym"
	| "nearAntonym"
	| "hypernym"
	| "hyponym"
	| "meronym"
	| "holonym";
type _Output1444 = _Output1371 | _Output803;
type _Output1445 = "direct" | "inferred";
type _Output1443 = {
	source: _Output803;
	relation: _Output1442;
	target: _Output1444;
	provenance: _Output1445;
};
type _Output1446 = "governs" | "governedBy";
type _Output1448 = _Output1371 | _Output803;
type _Output1449 = "direct" | "inferred";
type _Output1447 = {
	source: _Output803;
	relation: _Output1446;
	target: _Output1448;
	case: _Output1398;
	provenance: _Output1449;
};
export type KnowledgeSettings = _Output0;
export type KnowledgeRequestMask = _Output7;
export type KnowledgeSelectionInput = _Output14;
export type DirectSemanticRelation = _Output401;
export type TranslationLanguage = _Output402;
export type UnitShadow = _Output403;
export type LexicalBreakdown = _Output501;
export type MorphologicalTree = _Output554;
export type PendingSemanticRelation = _Output797;
export type SemanticRelations = _Output798;
export type ReadingKnowledge = _Output1382;
export type KnowledgeChange = _Output1399;
export type SemanticRelation = _Output1442;
export type SemanticRelationProjection = _Output1443;
export type GovernedCase = _Output1398;
export type GovernedPreposition = _Output1396;
export type GovernmentRelation = _Output1446;
export type GovernmentProjection = _Output1447;
