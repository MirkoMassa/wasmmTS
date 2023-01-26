import {describe, expect, test} from '@jest/globals';
import {parseModule} from "../../src/parser";
import  * as types from "../../src/types";
import  {WASMSectionID} from "../../src/types";
import {decodeSignedLeb128 as lebToInt} from "../../src/leb128ToInt"
import * as bp from "../../src/bodyParser";
import * as descParser from "../../src/helperParser";
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
describe("descParser.parseLimits", () => {
    test("parselimit flag 1", () => {
        const limit = new Uint8Array([0x01, 0x01, 0x02]);
        let result = descParser.parseLimits(limit, 0);
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
        let result = descParser.parseLimits(limit, 0);
        expect(result).toEqual(
           [{
            flag: 0,
            min: 4
           }, 2]
        )
    })
})
describe("descParser.parseGlobalType", () => {
    let globalTypes = [0x7F , 0x7E , 0x7D , 0x7C, 0x70, 0x6f, 0x7B];
    for(let gt of globalTypes) {
        test(`parseglobaltype valtype ${gt.toString(16)} as val`, () => {
            const global = new Uint8Array([gt, 0x01]);
            let result = descParser.parseGlobalType(global, 0);
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
            descParser.parseGlobalType(global, 0);
        }).toThrowError();
    })

    test("parseglobaltype invalid mutability", () => {
        const global = new Uint8Array([0x7F, 0x03]);
        expect(() => {
            descParser.parseGlobalType(global, 0);
        }).toThrowError(new Error("Invalid mutability."))
    })
})

describe("parseExpression", () =>{
    test("parsing a simple expression from arrays.wasm", ()=>{
        const expr = new Uint8Array([0x0D, 0x00, 0x20, 0x00, 0x20, 0x01, 0x10, 0x03, 0x20, 0x02, 0x36, 0x02, 0x00, 0x0B, 0x54, 0x36]);
        const res = descParser.parseExpr(expr, 0, 14);
        expect(res).toEqual(
            [[
                13, 0, 32, 0, 32, 1,
                16, 3, 32, 2, 54, 2,
                0, 11
            ], 14]
        )
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
    test("parsing the entire arrays.wasm (mainly code section testing)", ()=>{ // ID 10
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
describe("Name", () =>{
    test("parseName helper function", ()=>{
        const name = new Uint8Array([
            0x13, 0x69, 0x6D, 0x70, 0x6F, 0x72, 0x74, 0x73, 0x2F, 0x72, 0x65, 0x64, 0x75, 0x63, 0x65, 0x5F, 
            0x66, 0x75, 0x6E, 0x63
        ]);
        const res = descParser.parseName(name, 0);
        console.log(res)
    })
})
// console.log(Array.prototype.slice.call(test).map(byte=>byte.toString(16)))

// const dv:DataView = new DataView(test);
// console.log(dv)