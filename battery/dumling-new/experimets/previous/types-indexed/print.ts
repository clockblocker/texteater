import {inferredType,closeTestingSessions} from '../../../../../node_modules/prinfer/dist/testing.js';
for(const name of ['DeNoun','DeNounSurface','DeNounReading']) {
 console.log(name, await inferredType(import.meta.dir+'/narrow.ts',{name,full:true,backend:'typescript7',project:import.meta.dir+'/narrow.json'}));
}
await closeTestingSessions();
