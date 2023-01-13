import fs from 'fs';
import {parseModule} from "../src/parser";

const test = new Uint8Array(fs.readFileSync('../tests/simpletest.wasm'));
console.log(JSON.stringify(parseModule(test, 1)))
// console.log(Array.prototype.slice.call(test).map(byte=>byte.toString(16)))

// const dv:DataView = new DataView(test);
// console.log(dv)