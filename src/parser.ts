import  * as types from "./types";
import  {WASMSectionID} from "./types";
import {mimir} from "./debugging/sleep";
import {decodeSignedLeb128 as lebToInt} from "./Leb128ToInt"
import * as bp from "./bodyParser";

export class WasmModule implements types.WASMModule {
    
    constructor(public readonly version: number, public sections: types.WASMSection<any>[]){}
    
}
export class Section<A> implements types.WASMSection<A> {

    constructor(public id: types.WASMSectionID, public size: number, public content: A[]){}
}

export class TypeSection extends Section<types.funcType> {
    constructor(public id: types.WASMSectionID.WAType, public size: number, public content: types.funcType[])
    {
        super(id, size, content);
    }
}
export class ImportSection extends Section<types.imports> {
    constructor(public id: types.WASMSectionID.WAImport, public size: number, public content: types.imports[])
    {
        super(id, size, content);
    }
}
export class FunctionSection extends Section<types.funcType> {
    constructor(public id: types.WASMSectionID.WAFunction, public size: number, public content: types.[])
    {
        super(id, size, content);
    }
}



export function parseModule(bytes: Uint8Array): [module: WasmModule, index: number] {
    //WASM_BINARY_MAGIC && WASM_BINARY_VERSION
    const preamble = [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]

    for (let i = 0; i < 8; i++) {
        if(preamble[i] != bytes[i]) throw new Error("Unexpected module preamble.");
    }
    let sectionIndex = 8;
    let sections: Section<any>[] = [];
    while(sectionIndex < bytes.byteLength){ //looping through sections
        // console.log(sectionIndex)
        let [section, si] = parseSection(bytes, sectionIndex);
        // @ts-ignore for now till I end implementing every section
        sections.push(section);
        sectionIndex = si; // should match the length of the module
    }

    return [new WasmModule(1, sections), sectionIndex];
}

export function parseSection(bytes: Uint8Array, index: number): [section: Section<any> | Object, index: number] {
    const sectionId = bytes[index];
    const [size, width] = lebToInt(bytes.slice(index+1, index+1+4));
    
    //debugging

    // console.log(size, width);
    // mimir(size, width);
    let pb: Section<any> ;
    switch(sectionId){ // passing index+width+1 so it skips the section id and the size (size could be between 1 and 4 bytes)
        case WASMSectionID.WAType: return [new TypeSection(sectionId, size, bp.parseType(bytes, index+width+1)), width+index+size+1];
        case WASMSectionID.WAImport: return [pb, index] = bp.parseImport(bytes, index+width+1);
        // case WASMSectionID.WAFunction: return [new TypeSection(sectionId, size, bp.parseFunction(bytes, index+width+1)), width+index+size+1];
        //...
        default: return [{}, index];6
    }
    // return [pb, width+index+size+1]
}