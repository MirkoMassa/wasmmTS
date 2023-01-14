import fs from 'fs';
import {parseModule} from "../src/parser";

const test = new Uint8Array(fs.readFileSync('../tests/simpletest3.wasm'));
console.log(JSON.stringify(parseModule(test), null, 1))

// console.log(Array.prototype.slice.call(test).map(byte=>byte.toString(16)))

// const dv:DataView = new DataView(test);
// console.log(dv)