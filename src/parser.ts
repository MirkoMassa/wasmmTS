import  * as types from "./types";
import {mimir} from "./debugging/sleep";
import {decodeSignedLeb128 as lebToInt} from "./Leb128ToInt"
import * as bp from "./bodyParser";
import { setMaxIdleHTTPParsers } from "http";

export class WasmModule implements types.WASMModule {
    
    constructor(public readonly version: number, public sections: types.WASMSection[]){}
    
}
export class Section implements types.WASMSection {

    constructor(public id: types.WASMSectionID, public size: number, public content:bp.ParsedBody | Object){}
}

export function parseModule(bytes: Uint8Array): [module: WasmModule, index: number] {
    //WASM_BINARY_MAGIC && WASM_BINARY_VERSION
    const preamble = [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]

    for (let i = 0; i < 8; i++) {
        if(preamble[i] != bytes[i]) throw new Error("Unexpected module preamble.");
    }
    let sectionIndex = 8;
    let sections: types.WASMSection[] = [];
    while(sectionIndex < bytes.byteLength){ //looping through sections
        // console.log(sectionIndex)
        let [section, si] = parseSection(bytes, sectionIndex);
        sections.push(section);
        sectionIndex = si; // should match the length of the module
    }

    return [new WasmModule(1, sections), sectionIndex];
}

export function parseSection(bytes: Uint8Array, index: number): [section: types.WASMSection, index: number] {
    const sectionId = bytes[index];
    const [size, width] = lebToInt(bytes.slice(index+1, index+1+4));
    
    //debugging

    // console.log(size, width);
    // mimir(size, width);

    let pb:bp.ParsedBody | Object;
    switch(sectionId){ // passing index+width+1 so it skips the section id and the size (size could be between 1 and 4 bytes)
        case 1: pb = bp.parseType(bytes, index+width+1); break;
        case 2: pb = bp.parseImport(bytes, index+width+1); break;
        
        default: pb = {}; break;
    }
    return [new Section(sectionId, size, pb!), width+index+size+1]
}