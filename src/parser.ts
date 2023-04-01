import  * as types from "./types";
import {WASMSectionID} from "./types";
import {decodeUnsignedLeb128 as lebToInt} from "./leb128ToInt"
import * as bp from "./bodyParser";
import * as helperParser from "./helperParser";
// Generic classes
export class WasmModule implements types.WASMModule {
    constructor(public readonly version: number, public sections: types.WASMSection<any>[]){}
}
export class Section<A> implements types.WASMSection<A> {
    constructor(public id: types.WASMSectionID, public size: number, public content: A[] | A | null){}
}

// Section classes
export class CustomSection extends Section<types.custom> {
    constructor(public id: types.WASMSectionID.WACustom, public size: number, public content: types.custom[])
    {
        super(id, size, content);
    }
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
export class FunctionSection extends Section<number> { //number array (vector of type indices)
    constructor(public id: types.WASMSectionID.WAFunction, public size: number, public content: number[])
    {
        super(id, size, content);
    }
}
export class TableSection extends Section<types.tableType> {
    constructor(public id: types.WASMSectionID.WATable, public size: number, public content: types.tableType[])
    {
        super(id, size, content);
    }
}
export class MemorySection extends Section<types.limits> {
    constructor(public id: types.WASMSectionID.WAMemory, public size: number, public content: types.limits[])
    {
        super(id, size, content);
    }
}
export class GlobalSection extends Section<types.global> {
    constructor(public id: types.WASMSectionID.WAGlobal, public size: number, public content: types.global[])
    {
        super(id, size, content);
    }
}
export class ExportSection extends Section<types.exports> {
    constructor(public id: types.WASMSectionID.WAExport, public size: number, public content: types.exports[])
    {
        super(id, size, content);
    }
}
export class StartSection extends Section<number> {
    constructor(public id: types.WASMSectionID.WAStart, public size: number, public content: number | null)
    {
        super(id, size, content);
    }
}
export class ElementSection extends Section<types.elem> {
    constructor(public id: types.WASMSectionID.WAElement, public size: number, public content: types.elem[])
    {
        super(id, size, content);
    }
}
export class CodeSection extends Section<types.code> {
    constructor(public id: types.WASMSectionID.WACode, public size: number, public content: types.code[])
    {
        super(id, size, content);
    }
}
export class DataSection extends Section<types.data> {
    constructor(public id: types.WASMSectionID.WAData, public size: number, public content: types.data[])
    {
        super(id, size, content);
    }
}
export class DataCountSection extends Section<number> {
    constructor(public id: types.WASMSectionID.WADataCount, public size: number, public content: number | null)
    {
        super(id, size, content);
    }
}

// actual parsing functions

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
    index++; // going to section size

    const [secSize, width] = lebToInt(bytes.slice(index, index+4));
    const indexAfterSection = width+index+secSize;
    // console.log("id",sectionId)
    // console.log(`current: ${bytes[index].toString(16)}, ${Array.from(bytes.slice(index-5, index+1)).map(x => x.toString(16))}`)

    switch(sectionId){ // passing index+width so it skips the section id and the size (size can be between 1 and 4 bytes)
        case WASMSectionID.WACustom: return [new CustomSection(sectionId, secSize, bp.parseCustom(bytes, index+width)), indexAfterSection];
        case WASMSectionID.WAType: return [new TypeSection(sectionId, secSize, bp.parseType(bytes, index+width)), indexAfterSection];
        case WASMSectionID.WAImport: return [new ImportSection(sectionId, secSize, bp.parseImport(bytes, index+width)), indexAfterSection];
        case WASMSectionID.WAFunction: return [new FunctionSection(sectionId, secSize, bp.parseFunction(bytes, index+width)), indexAfterSection];
        case WASMSectionID.WATable: return [new TableSection(sectionId, secSize, bp.parseTable(bytes, index+width)), indexAfterSection];
        case WASMSectionID.WAMemory: return [new MemorySection(sectionId, secSize, bp.parseMemory(bytes, index+width)), indexAfterSection];
        case WASMSectionID.WAGlobal: return [new GlobalSection(sectionId, secSize, bp.parseGlobal(bytes, index+width)), indexAfterSection];
        case WASMSectionID.WAExport: return [new ExportSection(sectionId, secSize, bp.parseExport(bytes, index+width)), indexAfterSection];
        case WASMSectionID.WAStart:{
            if(secSize == 0) return [new StartSection(sectionId, secSize, null), width+index]; // no content inside section Start
            const [funcidx, idxwidth] = helperParser.parseidx(bytes, index+width);
            return [new StartSection(sectionId, secSize, funcidx), indexAfterSection];
        }
        case WASMSectionID.WAElement: return [new ElementSection(sectionId, secSize, bp.parseElement(bytes, index+width)), indexAfterSection];
        case WASMSectionID.WACode: return [new CodeSection(sectionId, secSize, bp.parseCode(bytes, index+width)), indexAfterSection];
        case WASMSectionID.WAData: return [new DataSection(sectionId, secSize, bp.parseData(bytes, index+width)), indexAfterSection];
        case WASMSectionID.WADataCount: {
            if(secSize == 0) return [new DataCountSection(sectionId, secSize, null), width+index];
            const [integer, idxwidth] = helperParser.parseidx(bytes, index+width);
            return [new DataCountSection(sectionId, secSize, integer), indexAfterSection];
        }
        default: throw new Error (`Invalid secID "${sectionId}".`);
    }
}