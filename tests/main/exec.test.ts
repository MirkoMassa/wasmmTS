import {describe, expect, test} from '@jest/globals';
import  * as parserTypes from "../../src/types";
import  * as execTypes from "../../src/exec/types";
import {Op} from "../../src/helperParser"
import {Opcode} from "../../src/opcodes"
import * as WMTS from '../../src/exec/wasmm'

import fs from 'fs';

describe("RunTest", ()=>{
    test("simpletest", async () => {
        const buffer = fs.readFileSync('./tests/wasm/simpletest.wasm');
        const inst = await WMTS.WebAssemblyMts.instantiate(buffer).then(res=> res.instance.exports);
        const res = inst.sum(424, 4745);
        expect(res === 8+4);
        console.log(res)
    })
    test("if-else", async () => {
        const buffer = fs.readFileSync('./tests/wasm/ifelse.wasm');
        // const tmodule = await WMTS.WebAssemblyMts.instantiate(buffer)
        // console.log("exports",tmodule.instance.exports)
        const inst = await WMTS.WebAssemblyMts.instantiate(buffer).then(res=> res.instance.exports);
        // const res = inst.test(5); //true
        const res = inst.test(0); //false
        console.log(res);
    })
    test.only("if-else nested", async () => {
        const buffer = fs.readFileSync('./tests/wasm/ifelsenest.wasm');
        // const tmodule = await WMTS.WebAssemblyMts.instantiate(buffer)
        // console.log("exports",tmodule.instance.exports)
        const inst = await WMTS.WebAssemblyMts.instantiate(buffer).then(res=> res.instance.exports);
        const res = inst.testnest(5, 0); //true, false
        // const res = inst.testnest(0, 1); //false, true
        console.log(res);
    })
})


describe("ops", ()=>{
    test("executeop", ()=>{
        const op = new Op(65, 0);
        // can't test it because I should create an entire module separately
    })
})
describe("RuntimeTests", ()=>{
    test("isExportInstance", ()=>{

        const testinstanceTRUE:execTypes.ExportInst = {
            valName:"prova", 
            value:{
                kind: "funcaddr",
                val: 5
            }
        }
        const testinstanceFALSE:string = "I'm not an instance"
        const res1 = WMTS.isExportInst(testinstanceTRUE);
        const res2 = WMTS.isExportInst(testinstanceFALSE);
        console.log(res1, res2)
    })
    
})
describe("Javascript WebAssembly namespace tests", ()=>{
    test("true-false with integers", async () => {
        const buffer = new Uint8Array(fs.readFileSync('./tests/wasm/truefalse.wasm'));
        const tmodule = await WebAssembly.instantiate(buffer).then(res => res.instance.exports);
        // const tmodule = await WebAssembly.instantiate(buffer)
        // @ts-ignore
        // console.log(tmodule.instance.exports.tf());
    })
    test("true-false with integers, parameter", async () => {
        const buffer = new Uint8Array(fs.readFileSync('./tests/wasm/truefalsevar.wasm'));
        const tmodule = await WebAssembly.instantiate(buffer).then(res => res.instance.exports);
        // console.log(JSON.stringify(tmodule.module));
        // @ts-ignore
        console.log(tmodule.tfv(0));
    })
})
describe("Store", () => {
    test("i32add", () => {
        let store = new WMTS.WebAssemblyMtsStore();
        store.stack.push(new Op(Opcode.I32Const, 6))
        store.stack.push(new Op(Opcode.I32Const, 6))
        store.executeOp(new Op(Opcode.i32add, []));
        expect(store.stack).toEqual([new Op(Opcode.I32Const, 12)])
    })

})

