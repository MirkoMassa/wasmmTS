import {describe, expect, test} from '@jest/globals';
import {parseModule} from "../../src/parser";
import  * as types from "../../src/types";
import  {WASMSectionID} from "../../src/types";
import {decodeUnsignedLeb128 as lebToInt} from "../../src/leb128ToInt"
import * as bp from "../../src/bodyParser";
import { parseCode } from "../../src/bodyParser";
import * as helperParser from "../../src/helperParser";
import * as ip from "../../src/instructionsParser";
import fs from 'fs';
//npm install --save-dev ts-jest
//npm install @types/jest
//npx ts-jest config:init
//npx jest

// const input = new Uint8Array(fs.readFileSync('../tests/arrays.wasm'));
// console.log(JSON.stringify(parseModule(output), null, 1));

describe("parseImport", () => {
    test("parseImport section from arrays.wasm", () => { 
        const importTest = new Uint8Array([0x01, 0x07, 0x69, 0x6D, 0x70, 0x6F, 0x72, 0x74, 0x73, 0x0B, 0x72, 0x65, 0x64, 0x75, 0x63, 0x65, 0x5F, 0x66, 0x75, 0x6E, 0x63, 0x00, 0x02]);
        let result = bp.parseImport(importTest, 0);
        expect(result).toEqual(
            [
                {
                  module: [ 7, 'imports' ],
                  name: [ 11, 'reduce_func' ],
                  description: 2
                }
              ]
        )

    })
})
describe("parseFunction", () =>{
    test("parseFunction section from arrays.wasm", ()=>{
        const functionTest = new Uint8Array([0x0A, 0x00, 0x00, 0x02, 0x03, 0x02, 0x04, 0x00, 0x04, 0x02, 0x02]);
        let result = bp.parseFunction(functionTest, 0);
        expect(result).toEqual(
            [0,0,2,3,2,4,0,4,2,2]
        )
    })
})
describe("parseMemory", ()=>{
    //limits array
    test("parseMemory section from arrays.wasm", () => {
        const memory = new Uint8Array([0x01, 0x00, 0x01]);
        let result = bp.parseMemory(memory, 0);
        expect(result).toEqual(
           [{
            flag: 0,
            min: 1
           }]
        )
    })
})
describe("helperParser.parseLimits", () => {
    test("parselimit flag 1", () => {
        const limit = new Uint8Array([0x01, 0x01, 0x02]);
        let result = helperParser.parseLimits(limit, 0);
        expect(result).toEqual(
           [{
            flag: 1,
            min: 1,
            max: 2
           }, 3]
        )
        
    })
    test("parselimit flag 0", () => {
        const limit = new Uint8Array([0x00, 0x04]);
        let result = helperParser.parseLimits(limit, 0);
        expect(result).toEqual(
           [{
            flag: 0,
            min: 4
           }, 2]
        )
    })
})
describe("helperParser.parseGlobalType", () => {
    let globalTypes = [0x7F , 0x7E , 0x7D , 0x7C, 0x70, 0x6f, 0x7B];
    for(let gt of globalTypes) {
        test(`parseglobaltype valtype ${gt.toString(16)} as val`, () => {
            const global = new Uint8Array([gt, 0x01]);
            let result = helperParser.parseGlobalType(global, 0);
            expect(result).toEqual(
                [{
                    valtype: gt,
                    mutability: 1
                }, 2]
            )
        })
    }
    test("parseglobaltype invalid valtype", () => {
        const global = new Uint8Array([0x7A, 0x01]);
        expect(() => {
            helperParser.parseGlobalType(global, 0);
        }).toThrowError();
    })

    test("parseglobaltype invalid mutability", () => {
        const global = new Uint8Array([0x7F, 0x03]);
        expect(() => {
            helperParser.parseGlobalType(global, 0);
        }).toThrowError(new Error("Invalid mutability."))
    })
})

describe("parseName", () =>{
    test("parseName helper function", ()=>{
        const name = new Uint8Array([
            0x13, 0x69, 0x6D, 0x70, 0x6F, 0x72, 0x74, 0x73, 0x2F, 0x72, 0x65, 0x64, 0x75, 0x63, 0x65, 0x5F, 
            0x66, 0x75, 0x6E, 0x63
        ]);
        const res = helperParser.parseName(name, 0);
        console.log(res)
    })
})

describe("opCodes", ()=>{
    test("simple loop + function", ()=>{
        const input = new Uint8Array([
            0x02, 0x02, 0x00, 0x0B, 0x0D, 0x00, 0x03, 0x7F, 0x02, 0x7F, 0x10, 0x00, 0x41, 0x96, 0x01, 0x0B, 
            0x0B, 0x0B
        ]);
        const res = bp.parseCode(input, 0);
        console.log(JSON.stringify(res, null, 2))
    })

    test("if + function", ()=>{
        const input = new Uint8Array([
            0x02, 0x02, 0x00, 0x0B, 0x09, 0x00, 0x20, 0x00, 0x04, 0x40, 0x10, 0x00, 0x0B, 0x0B
        ]);
        const res = bp.parseCode(input, 0);
        console.log(JSON.stringify(res, null, 2))
    })
    test("if + function - else + function", ()=>{
        const input = new Uint8Array([
            0x03, 0x02, 0x00, 0x0B, 0x02, 0x00, 0x0B, 0x0C, 0x00, 0x20, 0x00, 0x04, 0x40, 0x10, 0x00, 0x05, 
            0x10, 0x01, 0x0B, 0x0B
        ]);
        const res = bp.parseCode(input, 0);
        console.log(JSON.stringify(res, null, 2))
    })
    test("memory arguments", ()=>{
        const input = new Uint8Array([
            0x01, 0x4E, 0x00, 0x41, 0x00, 0x2D, 0x00, 0x00, 0x41, 0xC1, 0x00, 0x46, 0x41, 0x03, 0x2D, 0x00, 
            0x00, 0x41, 0xA7, 0x01, 0x46, 0x71, 0x41, 0x06, 0x2D, 0x00, 0x00, 0x41, 0x00, 0x46, 0x41, 0x13, 
            0x2D, 0x00, 0x00, 0x41, 0x00, 0x46, 0x71, 0x71, 0x41, 0x14, 0x2D, 0x00, 0x00, 0x41, 0xD7, 0x00, 
            0x46, 0x41, 0x17, 0x2D, 0x00, 0x00, 0x41, 0xCD, 0x00, 0x46, 0x71, 0x41, 0x18, 0x2D, 0x00, 0x00, 
            0x41, 0x00, 0x46, 0x41, 0xFF, 0x07, 0x2D, 0x00, 0x00, 0x41, 0x00, 0x46, 0x71, 0x71, 0x71, 0x0B
        ]);
        const res = bp.parseCode(input, 0);
        console.log(JSON.stringify(res, null, 2))
    })
    test("float32 and float64 numbers parsing from floatnumbers.wasm", ()=>{
        const input = new Uint8Array([ // code section
        0x02, 0x1A, 0x00, 0x43, 0xAE, 0x87, 0x16, 0x43, 0x43, 0xA4, 0x70, 0xF4, 0x43, 0x43, 0x14, 0xAE, 
        0x73, 0x41, 0x43, 0x58, 0x76, 0x0B, 0x46, 0x92, 0x92, 0x92, 0x0F, 0x0B, 0x2A, 0x00, 0x44, 0x17, 
        0xD9, 0xCE, 0xF7, 0x53, 0x87, 0x76, 0x40, 0x44, 0x7B, 0x14, 0xAE, 0x47, 0xE1, 0x72, 0x83, 0x40, 
        0x44, 0x93, 0x18, 0x04, 0x56, 0x4E, 0x4A, 0xAF, 0x40, 0x44, 0xCD, 0xCC, 0xCC, 0xCC, 0x4C, 0xC0, 
        0xA3, 0x40, 0xA0, 0xA0, 0xA0, 0x0F, 0x0B
    ]);
        expect(ip.parseFloat32(new Uint8Array([0xAE, 0x87, 0x16, 0x43]))).toBeCloseTo(150.53)
        expect(ip.parseFloat32(new Uint8Array([0xA4, 0x70, 0xF4, 0x43]))).toBeCloseTo(488.88)
        expect(ip.parseFloat32(new Uint8Array([0x14, 0xAE, 0x73, 0x41]))).toBeCloseTo(15.23)
        expect(ip.parseFloat32(new Uint8Array([0x58, 0x76, 0x0B, 0x46]))).toBeCloseTo(8925.586)

        expect(ip.parseFloat64(new Uint8Array([0x17, 0xD9, 0xCE, 0xF7, 0x53, 0x87, 0x76, 0x40]))).toBeCloseTo(360.458)
        expect(ip.parseFloat64(new Uint8Array([0x7B, 0x14, 0xAE, 0x47, 0xE1, 0x72, 0x83, 0x40]))).toBeCloseTo(622.36)
        expect(ip.parseFloat64(new Uint8Array([0x93, 0x18, 0x04, 0x56, 0x4E, 0x4A, 0xAF, 0x40]))).toBeCloseTo(4005.153)
        expect(ip.parseFloat64(new Uint8Array([0xCD, 0xCC, 0xCC, 0xCC, 0x4C, 0xC0, 0xA3, 0x40]))).toBeCloseTo(2528.15)
    })
    test("v128.const function", () =>{
        const data = new Uint8Array([
            0x96, 0x83, 0x56, 0x41, 0x98, 0x81, 0x36, 0x42, 0x96, 0x83, 0x56, 0x41, 0x98, 0x81, 0x36, 0x42
        ]);
        const [res, i] = ip.parseInteger128(data, 0);
        console.log(res.toString(16));
    })
    test("true-false with integers (parsing)", async () => {
        const buffer = new Uint8Array(fs.readFileSync('./tests/wasm/truefalse.wasm'));
        console.log(JSON.stringify(parseModule(buffer), null, 2));
    })

    
})
describe("Section examples parsing", () =>{
    test("parsing type section from typesec.wasm", ()=>{ // ID 1
        const input = new Uint8Array(fs.readFileSync('./tests/wasm/typesec.wasm'));
        console.log(JSON.stringify(parseModule(input), null, 2));
    })
    test("parsing import section from importsec.wasm", ()=>{ // ID 2
        const input = new Uint8Array(fs.readFileSync('./tests/wasm/importsec.wasm'));
        console.log(JSON.stringify(parseModule(input), null, 2));
    })
    test("parsing function section from funcsec.wasm", ()=>{ // ID 3
        const input = new Uint8Array(fs.readFileSync('./tests/wasm/funcsec.wasm'));
        console.log(JSON.stringify(parseModule(input), null, 2));
    })
    test("parsing table section from tablesec.wasm", ()=>{ // ID 4
        const input = new Uint8Array(fs.readFileSync('./tests/wasm/tablesec.wasm'));
        console.log(JSON.stringify(parseModule(input), null, 2));
    })
    test("parsing memory and data sections from memoryanddatasec.wasm", ()=>{ // ID 5 - 11
        const input = new Uint8Array(fs.readFileSync('./tests/wasm/memoryanddatasec.wasm'));
        console.log(JSON.stringify(parseModule(input), null, 2));
    })
    test("parse global section from globalsec.wasm", ()=>{ // ID 6
        const input = new Uint8Array(fs.readFileSync('./tests/wasm/globalsec.wasm'));
        console.log(JSON.stringify(parseModule(input), null, 2));
    })
    test("parse some globals from singleglobal.wasm", ()=>{ // ID 6
        const input = new Uint8Array(fs.readFileSync('./tests/wasm/singleglobal.wasm'));
        console.log(JSON.stringify(parseModule(input), null, 2));
    })
    test("parse export section from exportsec.wasm (every case)", ()=>{ // ID 7
        const input = new Uint8Array(fs.readFileSync('./tests/wasm/exportsec.wasm'));
        console.log(JSON.stringify(parseModule(input), null, 2));
    })
    test("parsing start section from startsec.wasm", ()=>{ // ID 8
        const input = new Uint8Array(fs.readFileSync('./tests/wasm/startsec.wasm'));
        console.log(JSON.stringify(parseModule(input), null, 2));
    })
    test("parsing element section from elemsec.wasm", ()=>{ // ID 9
        const input = new Uint8Array(fs.readFileSync('./tests/wasm/elemsec.wasm'));
        console.log(JSON.stringify(parseModule(input), null, 2));
    })
    test("parsing the entire arrays.wasm (generic code section testing)", ()=>{ // ID 10
        const input = new Uint8Array(fs.readFileSync('./tests/wasm/arrays.wasm'));
        console.log(JSON.stringify(parseModule(input), null, 2));
    })
    test("parsing data section from datasec.wasm", ()=>{ // ID 11
        const input = new Uint8Array(fs.readFileSync('./tests/wasm/datasec.wasm'));
        console.log(JSON.stringify(parseModule(input), null, 2));
    })
    // test.only("parsing datacount section from datacountsec.wasm", ()=>{ // ID 12
    //     const input = new Uint8Array(fs.readFileSync('./tests/wasm/datacountsec.wasm'));
    //     console.log(JSON.stringify(parseModule(input), null, 2));
    // })
    
})

// console.log(Array.prototype.slice.call(test).map(byte=>byte.toString(16)))
// const dv:DataView = new DataView(test);
// console.log(dv)

// const data = new Uint8Array([
//     0x00, 0x21, // section id and size
//     0x04, 0x6E, 0x61, 0x6D, 0x65, // name size 4 => "name"
//     0x01, 0x13, 0x02, 0x00,
//     0x07, 0x66, 0x6C, 0x6F, 0x61, 0x74, 0x33, 0x32, // name size 7 => "float32"
//     0x01,
//     0x07, 0x66, 0x6C, 0x6F, 0x61, 0x74, 0x36, 0x34,  // name size 7 => "float64"
//     0x02, 0x05, 0x02, 0x00, 0x00, 0x01, 0x00
// ]); // check where the first character is (char bigger than something)

describe("MainParsing", ()=>{
    test("main", ()=>{
        const buffer = new Uint8Array(fs.readFileSync('./tests/wasm/ifelsenest.wasm'));
        console.log(JSON.stringify(parseModule(buffer), null, 2));
    })
    test("ifelsenest code section", ()=>{
        const data = new Uint8Array([
            0x01, 0x1A, 0x00, 0x20, 0x00, 0x04, 0x01, 0x20, 0x01, 0x04, 0x7F, 0x41, 0x04, 0x05, 
            0x41, 0x02, 0x0B, 0x41, 0x07, 0x05, 0x41, 0x04, 0x41, 0x06, 0x0B, 0x6A, 0x0F, 0x0B
        ]);
        console.log(data.length)
        const res = parseCode(data, 0);
        console.log(res);
    })
    test.only("loop", ()=>{
        const data = new Uint8Array([
            0x01, 0x23, 0x01, 0x01, 0x7F, 0x41, 0x00, 0x21, 0x01, 0x03, 0x7F, 0x20, 0x00, 0x41, 
            0x01, 0x6A, 0x21, 0x00, 0x20, 0x01, 0x41, 0x01, 0x6A, 0x21, 0x01, 0x20, 0x00, 0x41, 0x0A, 0x48, 
            0x0D, 0x00, 0x20, 0x01, 0x0B, 0x0F, 0x0B
        ]);
        const res = parseCode(data, 0);
        console.log(JSON.stringify(res, null, 2));
    })
    test("block", ()=>{
        const data = new Uint8Array([
            0x01, 0x18, 0x00, 0x02, 0x7F, 0x20, 0x00, 0x41, 0x05, 0x4A, 0x04, 0x7F, 0x41, 0x01, 
            0x0C, 0x01, 0x05, 0x41, 0x0A, 0x0B, 0x0B, 0x20, 0x00, 0x6A, 0x0F, 0x0B
        ]);
        const res = parseCode(data, 0);
        console.log(JSON.stringify(res, null, 2));
    })
    test("block2", ()=>{
        const data = new Uint8Array([
            0x01, 0x1B, 0x00, 0x02, 0x7F, 0x20, 0x00, 0x41, 0x05, 0x4A, 0x04, 0x7F, 0x41, 0x01, 0x0C, 0x01, 0x05, 
            0x41, 0x0A, 0x0B, 0x41, 0x02, 0x6A, 0x0B, 0x20, 0x00, 0x6A, 0x0F, 0x0B
        ]);
        const res = parseCode(data, 0);
        console.log(JSON.stringify(res, null, 2));
    })
})