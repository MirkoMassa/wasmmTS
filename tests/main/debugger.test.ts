import {describe, expect, test} from '@jest/globals';
import  * as parserTypes from "../../src/types";
import  * as execTypes from "../../src/exec/types";
import {Op} from "../../src/helperParser"
import {Opcode} from "../../src/opcodes"
import * as WMTS from '../../src/exec/wasmm'
import { buildMemStatesArrays, buildMemStatesStrings, buildPatchesStrings, buildStateStrings, descriptionTypes, elemDescriptor, stateDescriptor } from '../../src/debugging/stringifier';
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
        console.log(JSON.stringify(stateStr[stateStr.length-6], null, 2));
    })

    test("arrays.wasm", async () => {
        const buffer = fs.readFileSync('./tests/wasm/arrays.wasm');
        const inst = await WMTS.WebAssemblyMts.instantiate(buffer).then(res=> res.instance);
        const customSection = inst.custom as custom[];
        const res = inst.exportsTT.createArrTest(6);
        const store = res.stores as execTypes.storeProducePatches;
        const stateStr = buildStateStrings(store, customSection);
        console.log(JSON.stringify(stateStr[stateStr.length-7], null, 2));
    })
})

describe("patches", () => {
    test("loop.wasm patches", async () => {
        const buffer = fs.readFileSync('./tests/wasm/loop.wasm');
        const inst = await WMTS.WebAssemblyMts.instantiate(buffer).then(res=> res.instance);
        const customSection = inst.custom as custom[];
        const res = inst.exportsTT.varloop(6);
        const store = res.stores as execTypes.storeProducePatches;
        
        const patches = buildPatchesStrings(store, customSection);
        
        console.log(JSON.stringify(patches, null, 2));

    })
})

describe("memLogger", () =>{
    test("loadstore.wasm", async () => {
        const buffer = fs.readFileSync('./tests/wasm/loadstore.wasm');
        const inst = await WMTS.WebAssemblyMts.instantiate(buffer).then(res=> res.instance);
        const res = inst.exportsTT.i32store(0x2739FF12);
        // const res = inst.exportsTT.i32store(0x2739);
        // should add to mem 0x27 0x39 0xFF 0x12
        const store = res.stores as execTypes.storeProducePatches;
        const memStates = buildMemStatesStrings(store);
        const memStatesArrays = buildMemStatesArrays(store);
        // console.log("states",memStates)
        console.log("state arrays", memStatesArrays);
    })
})