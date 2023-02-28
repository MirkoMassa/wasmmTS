import {describe, expect, test} from '@jest/globals';
import  * as parserTypes from "../../src/types";
import  * as execTypes from "../../src/exec/types";
import {Op} from "../../src/helperParser"
import {Opcode} from "../../src/opcodes"
import * as WMTS from '../../src/exec/wasmm'

import fs from 'fs';
describe("Javascript WebAssembly namespace tests", ()=>{
    test("true-false with integers", async () => {
        const buffer = new Uint8Array(fs.readFileSync('./tests/wasm/truefalse.wasm'));
        const tmodule = await WebAssembly.instantiate(buffer).then(res => res.instance.exports);
        // const tmodule = await WebAssembly.instantiate(buffer)
        // @ts-ignore
        console.log(tmodule.instance.exports.tf());
    })
    test.only("true-false with integers, parameter", async () => {
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

