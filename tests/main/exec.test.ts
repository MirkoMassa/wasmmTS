import {describe, expect, test} from '@jest/globals';
import  * as parserTypes from "../../src/types";
import  * as execTypes from "../../src/exec/types";
import {Op} from "../../src/helperParser"
import {Opcode} from "../../src/opcodes"
import * as WMTS from '../../src/exec/wasmm'

describe("Store", () => {

    test("i32add", () => {
        let store = new WMTS.WebAssemblyMtsStore();
        store.stack.push(new Op(Opcode.I64Const, 6))
        store.stack.push(new Op(Opcode.I64Const, 6))
        store.executeOp(new Op(Opcode.i32add,[]));
        expect(store.stack).toEqual([new Op(Opcode.I64Const, 12)])
    })
})

