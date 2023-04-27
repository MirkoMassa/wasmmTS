import {describe, expect} from '@jest/globals';
import fs from 'fs';

import * as WMTS from '../../src/exec/wasmm'

import { enableMapSet, enablePatches, produce, current } from 'immer';
enablePatches();
enableMapSet();


describe("Memory Proxy Test", () =>{

    it("should look like a UInt8Array", ()=> {
        // var backingMap = new Map<string | symbol | number, number>;
        // // @ts-ignore
        // var MemProxy: Map<string | symbol | number, number> & {[key: string]: number} = new Proxy(backingMap, {
        //     get(target, property, receiver) {
        //         if(property == "forEach") {
        //             return <T, K>(cbFunction: (value: T, key: K, map: Map<K, T>) => void) => {
        //                 (target as Map<K, T>).forEach(cbFunction);
        //             }
        //         }
        //         if(property == 'set') return Map.prototype.set;

        //         return target.get(property);
        //     },
        //     set(target, property, value) {
        //         console.log("tpv",target, property, value)
        //         return target.set(property, value) != undefined;
        //     }
            
        // });
        var base = {
            backingMap: new Map()
        }
        // @ts-ignore
        var MemProxy: Map<string | symbol | number, number> & {[key: string]: number} = new Proxy(base, {
            get(target, property, receiver) {
                if(property == "forEach") {
                    return <T, K>(cbFunction: (value: T, key: K, map: Map<K, T>) => void) => {
                        (target.backingMap as Map<K, T>).forEach(cbFunction);
                    }
                }
                if(property == 'set') return Map.prototype.set;

                return target.backingMap.get(property);
            },
            set(target, property, value) {
                console.log("tpv",target, property, value)
                let singleValue = new Uint8Array(1);
                singleValue[0]= value;
                return target.backingMap.set(property, singleValue[0]) != undefined;
            }
            
        });
        MemProxy[0] = 12;
        // expect(MemProxy[0]).toBe(12);
        console.log(MemProxy);
        console.log(MemProxy instanceof Map, "is Map")
        var test = produce(MemProxy, (draft) => {
        // @ts-ignore
            draft[0] = 18;
            return draft;
        })
        var test2 = produce(test, (draft) => {
            // @ts-ignore
            draft[1] = 54;
            return draft;
        })
        console.log(test2, MemProxy, base);
        expect(test[0]).toBe(18);
        expect(test2[1]).toBe(54);
        expect(MemProxy[0]).toBe(12);

        console.log("array",test2)

        
    });
})

describe("Memory section states", () =>{
    it("debugging memory states", async () =>{
        const buffer = fs.readFileSync('./tests/wasm/loadstore.wasm');
        const inst = await WMTS.WebAssemblyMts.instantiate(buffer).then(res=> res.instance.exports);
        const res = inst.i32store(0x2739FF12);

        console.log(inst);
    })
})