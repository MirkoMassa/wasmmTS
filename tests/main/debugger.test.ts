import {describe, expect, test} from '@jest/globals';
import  * as parserTypes from "../../src/types";
import  * as execTypes from "../../src/exec/types";
import {Op} from "../../src/helperParser"
import {Opcode} from "../../src/opcodes"
import * as WMTS from '../../src/exec/wasmm'
import { buildStateStrings, descriptionTypes, elemDescriptor, stateDescriptor } from '../../src/debugging/stringifier';
import fs, { stat } from 'fs';
import { custom } from '../../src/types';


describe("buildStateStrings", ()=>{
    test("loop.wasm", async () => {
        const buffer = fs.readFileSync('./tests/wasm/loop.wasm');
        const inst = await WMTS.WebAssemblyMts.instantiate(buffer).then(res=> res.instance);
        const customSection = inst.custom as custom[];
        const res = inst.exportsTT.varloop(6);
        const store = res.stores as execTypes.storeProducePatches;
        const stateStr = buildStateStrings(store, customSection);
        console.log(JSON.stringify(stateStr[stateStr.length-7], null, 2));
    })
    test.only("arrays.wasm", async () => {
        const buffer = fs.readFileSync('./tests/wasm/arrays.wasm');
        const inst = await WMTS.WebAssemblyMts.instantiate(buffer).then(res=> res.instance);
        const customSection = inst.custom as custom[];
        const res = inst.exportsTT.createArrTest(6);
        const store = res.stores as execTypes.storeProducePatches;
        const stateStr = buildStateStrings(store, customSection);
        console.log(JSON.stringify(stateStr[stateStr.length-7], null, 2));
    })
})