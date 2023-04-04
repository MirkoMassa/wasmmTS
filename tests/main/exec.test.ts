import {describe, expect, test} from '@jest/globals';
import  * as parserTypes from "../../src/types";
import  * as execTypes from "../../src/exec/types";
import {Op} from "../../src/helperParser"
import {Opcode} from "../../src/opcodes"
import * as WMTS from '../../src/exec/wasmm'
import fs from 'fs';

describe("RunTest", ()=>{
    test("fib", async () => {
        const buffer = fs.readFileSync('./tests/wasm/fib.wasm');
        const inst = await WMTS.WebAssemblyMts.instantiate(buffer);
        const exportsTT = inst.instance.exportsTT;
        const res = exportsTT.fib(8);
        
        const apiInst = await WebAssembly.instantiate(buffer).then(res => res.instance.exports);
        // @ts-ignore
        const apires = apiInst.fib(8);
        console.log(res.val, apires)
    })
    test.only("fibit", async () => {
        const buffer = fs.readFileSync('./tests/wasm/fib.wasm');
        const inst = await WMTS.WebAssemblyMts.instantiate(buffer);
        const exportsTT = inst.instance.exportsTT;

        const res = exportsTT.fibit(8);
        // see how locals are
        const apiInst = await WebAssembly.instantiate(buffer).then(res => res.instance.exports);
        // @ts-ignore
        const apires = apiInst.fibit(8);
        console.log(res.val.args, apires)
    })
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
    test("if-else nested", async () => {
        const buffer = fs.readFileSync('./tests/wasm/ifelsenest.wasm');
        // const tmodule = await WMTS.WebAssemblyMts.instantiate(buffer)
        // console.log("exports",tmodule.instance.exports)
        const inst = await WMTS.WebAssemblyMts.instantiate(buffer).then(res=> res.instance.exports);
        // const res = inst.testnest(5, 0); //true, false
        const res = inst.testnest(0, 1); //false, true
        console.log(res);
    })
    test("block", async () => {
        const buffer = fs.readFileSync('./tests/wasm/block.wasm');
        const tmodule = await WebAssembly.instantiate(buffer).then(res => res.instance.exports);
        const inst = await WMTS.WebAssemblyMts.instantiate(buffer).then(res=> res.instance.exports);
        const res = inst.block(0);
        // @ts-ignore
        const oracle = tmodule.block(0);
        console.log(res, oracle);
        expect(res === oracle);
    })
    test("block2", async () => {
        const buffer = fs.readFileSync('./tests/wasm/block2.wasm');
        const tmodule = await WebAssembly.instantiate(buffer).then(res => res.instance.exports);
        const inst = await WMTS.WebAssemblyMts.instantiate(buffer).then(res=> res.instance.exports);
        const res = inst.block(0);
        expect(res == 12);
        // @ts-ignore
        const oracle = tmodule.block(0);
        console.log("myres",res, "webassembly namespace res",oracle);
        expect(res === oracle);
        const res2 = inst.block(6);
        // @ts-ignore
        const oracle2 = tmodule.block(6);
        expect(res2 == 7);
        console.log("myres",res2, "webassembly namespace res",oracle2);
    })
    test("loop", async () => {
        const buffer = fs.readFileSync('./tests/wasm/loop.wasm');
        const tmodule = await WebAssembly.instantiate(buffer).then(res => res.instance.exports);
        const inst = await WMTS.WebAssemblyMts.instantiate(buffer).then(res=> res.instance.exports);
        const res = inst.varloop(0);
        expect(res == 10);
        // @ts-ignore
        const oracle = tmodule.varloop(0);
        console.log(res, oracle);
        expect(res === oracle);
    })
    test("loopFuncType", async () => {
        const buffer = fs.readFileSync('./tests/wasm/loopFuncType.wasm');
        const tmodule = await WebAssembly.instantiate(buffer).then(res => res.instance.exports);
        const inst = await WMTS.WebAssemblyMts.instantiate(buffer).then(res=> res.instance.exports);
        const res = inst.varloop(0);
        // @ts-ignore
        const oracle = tmodule.varloop(0);
        console.log(res, oracle);
        expect(res === oracle);
    })
    test("loopBlockFuncType", async () => {
        const buffer = fs.readFileSync('./tests/wasm/loopBlockFuncType.wasm');
        const tmodule = await WebAssembly.instantiate(buffer).then(res => res.instance.exports);
        const inst = await WMTS.WebAssemblyMts.instantiate(buffer).then(res=> res.instance.exports);
        const res = inst.varloop(0);
        // @ts-ignore
        const oracle = tmodule.varloop(0);
        console.log(res, oracle);
        expect(res === oracle);
    })
    test("loadstore", async () => {
        const buffer = fs.readFileSync('./tests/wasm/loadstore.wasm');
        const tmodule = await WebAssembly.instantiate(buffer).then(res => res.instance.exports);
        const inst = await WMTS.WebAssemblyMts.instantiate(buffer).then(res=> res.instance.exports);
        const res = inst.i32store(0x2739FF12);
        // @ts-ignore
        const oracle = tmodule.i32store(0x2739FF12);
        console.log("myres",res, "APIres",oracle);
        // @ts-ignore
        console.log("memory output",inst.memory);
        // @ts-ignore
        console.log("memory output API",tmodule.memory.buffer);
        expect(res === oracle);
    })
    test("arrays", async () => {
        const buffer = fs.readFileSync('./tests/wasm/arrays.wasm');
        const inst = await WMTS.WebAssemblyMts.instantiate(buffer, {imports: {reduce_func: (x: number,y: number) => x+y}});
        console.log(JSON.stringify(inst.module, null, 2))
        console.log(WMTS.WebAssemblyMts.store)
        const exports = inst.instance.exports;
        const res = exports.array(10);
    
        
        // @ts-ignore
        console.log("memory output",inst.memory);


        const tmodule = await WebAssembly.instantiate(buffer, {imports: {reduce_func: (x: number,y: number) => x+y}}).then(res => res.instance.exports);
        // @ts-ignore
        const oracle = tmodule.array(10);
        // @ts-ignore
        // console.log("memory output API",tmodule.memory.buffer);
        // console.log("myres",res, "APIres",oracle);
        expect(res === oracle);
    })
    test("callTest", async () => {
        const buffer = fs.readFileSync('./tests/wasm/call.wasm');
        const tmodule = await WebAssembly.instantiate(buffer).then(res => res.instance.exports);
        const inst = await WMTS.WebAssemblyMts.instantiate(buffer).then(res=> res.instance.exports);
        const res = inst.main(4);
        // @ts-ignore
        const oracle = tmodule.main(4);
        console.log("myres",res, "APIres",oracle);
        expect(res === oracle);
    })
    test("fibonacci", async () => {
        const buffer = fs.readFileSync('./tests/wasm/fib.wasm');
        const tmodule = await WebAssembly.instantiate(buffer).then(res => res.instance.exports);
        const inst = await WMTS.WebAssemblyMts.instantiate(buffer).then(res=> res.instance.exports);
        for(let i=0; i < 6; i ++) {
            const res = inst.fib(i);
            // @ts-ignore
            const oracle = tmodule.fib(i);
            console.log("myres",res, "APIres",oracle);
            console.log("fib of",i, "APIres",oracle);
            expect(res === oracle);
        }
    })
})

describe("ImmutableStateTest", ()=>{
    test.only("loopTT", async () => {
        const buffer = fs.readFileSync('./tests/wasm/loop.wasm');
        const inst = await WMTS.WebAssemblyMts.instantiate(buffer).then(res=> res.instance);
        debugger;
        const res = inst.exportsTT.varloop(7);
        console.log(res.val);
    })
    test("arraysTT", async () => {
        const buffer = fs.readFileSync('./tests/wasm/arrays.wasm');
        const inst = await WMTS.WebAssemblyMts.instantiate(buffer, {imports: {reduce_func: (x: number,y: number) => x+y}}).then(res=> res.instance);
        const tmodule = await WebAssembly.instantiate(buffer, {imports: {reduce_func: (x: number,y: number) => x+y}}).then(res => res.instance);
        //@ts-ignore
        const oracle = tmodule.exports.createArrTest(3, 7, 3, 5);
        //@ts-ignore
        console.log(tmodule.exports.memory.buffer);
        // debugger;

        const res = inst.exportsTT.createArrTest(3, 7, 3, 5);
        console.log(res.stores.states[res.stores.states.length-1].mems[0].data);
        console.log(res.stores.states[res.stores.states.length-1]);
        console.log("myres",res.val);
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
    // test("i32add", () => {
    //     let store = new WMTS.WebAssemblyMtsStore();
    //     store.stack.push(new Op(Opcode.I32Const, 6))
    //     store.stack.push(new Op(Opcode.I32Const, 6))
    //     store.executeOp(new Op(Opcode.i32add, []));
    //     expect(store.stack).toEqual([new Op(Opcode.I32Const, 12)])
    // })

})

describe("sampleFunc", () =>{
    test("uint8storeloop", () =>{
        function test(value: number | bigint, length: 32 | 64){
            let store:Uint8Array;
            if(length == 32){
                store = new Uint8Array(4);
            }else if(length == 64){
                store = new Uint8Array(8);
            }else{
                throw new Error("invalid byte length.");
            }
            console.log("currentVal",value.toString(16))

            for (let i = 0; i < length/8; i++) {
                store[i] = 0xff & (value as number >> 8*i);
            }

            // log
            let output = "";
            store.forEach(val =>{
                output = output.concat(val.toString(16), " ");
            })
            console.log("Store array", output);
            let result = 0;
            // see if the value is correctly stored
            for (let i = 0; i < length/8; i++) {
                result = result | (store[i] << 8*i);
            }
            console.log("original value", result);
        }
        test(63, 32);
        test(624, 32);
        test(21640, 32);
    })
})