import {decodeSignedLeb128 as lebToInt} from "./Leb128ToInt";
import  * as types from "./types";
import * as descParser from "./helperParser";
// export class ParsedBody{ //I guess I don't need that

//     // count is the size of the vector, elements are the module components described here
//     // https://webassembly.github.io/spec/core/syntax/modules.html#syntax-module

//     //for now elements has any type because I'm not sure how much types there will be
//     constructor (public count:number, public elements:any = []){}
// }

export function parseType(bytes: Uint8Array, index: number): types.funcType[] {
    //checking the number of function signatures
    const [size, width] = lebToInt(bytes.slice(index, index+4)); //size is the number of functions signatures in the module
    index+= width; //offset after the number of function signatures declaration
    const functypeVec = new Array(size);

    for (let i = 0; i < size; i++) {
        if(bytes[index] != 0x60) throw new Error("No vector of function signatures.")
        index++; //offset at the start of the first function signature

        let [inSize, inWidth] = [0, 0];
        let params:types.bytesVector;
        let returns:types.bytesVector;
        if(bytes[index] == 0) index++; //checking if there are any parameters
        else{
            // parameter (number and types)
            [inSize, inWidth] = lebToInt(bytes.slice(index, index+4));
            index+=inWidth;
            params = [inSize, bytes.slice(index, index+inSize)];
            index+=inSize;
        }
        if(bytes[index] == 0) index++; //checking if there are any parameters
        else{
            // return values (number and types)
            [inSize, inWidth] = lebToInt(bytes.slice(index, index+4));
            index+=inWidth;
            returns = [inSize, bytes.slice(index, index+inSize)];
            index+=inSize;
        }
        // function
        const func:types.funcType = {parameters:params!, returns:returns!}
        functypeVec[i] = func;
    }
    return functypeVec; 
}
// console.log(JSON.stringify(parseType(new Uint8Array([0x01, 0x60, 0x02, 0x7F, 0x7F, 0x01, 0x7F]), 0)))

export function parseImport(bytes: Uint8Array, index: number):types.imports[]{
    
    const [size, width] = lebToInt(bytes.slice(index, index+4));
    index+= width;
    const importVec = new Array(size);
    //name parsing
    for (let i = 0; i < size; i++) {
        //module name (n (inSize) bytes)
        let [inSize, inWidth] = lebToInt(bytes.slice(index, index+4));
        index+= inWidth;
        let module:types.namesVector = [inSize, ""];
        for (let j = 0; j < inSize; j++){
            module[1] = module[1].concat(String.fromCharCode(bytes[index+j]));
        }
        index += inSize;
        //function name (n (inSize) bytes)
        [inSize, inWidth] = lebToInt(bytes.slice(index, index+4));
        let name:types.namesVector = [inSize, ""];
        index+= inWidth;
        for (let j = 0; j < inSize; j++){
            name[1] = name[1].concat(String.fromCharCode(bytes[index+j]));
        }
        index += inSize;
        //1 byte long, no encoding, importdesc
        if(bytes[index] != 0 && bytes[index] != 1 && bytes[index] != 2 && bytes[index] != 3) throw new Error("No description section on the import.");
        // let desc:types.WASMSection<types.imports>;
        let desc:types.descTypes;
        switch(bytes[index]) {
            case 0: [desc, index] = descParser.parseidx(bytes, index+1); break;
            case 1: [desc, index] = descParser.parseTableType(bytes, index+1); break;
            case 2: [desc, index] = descParser.parseLimits(bytes, index+1); break;
            case 3: [desc, index] = descParser.parseGlobalType(bytes, index+1); break;
            default: throw new Error("Invalid description value.");
        }
        const parsedImport:types.imports = {module:module, name:name, description:desc};
        importVec[i] = parsedImport;
    }
    return importVec;
}
// console.log(JSON.stringify(parseImport(new Uint8Array([0x01, 0x07, 0x69, 0x6D, 0x70, 0x6F, 0x72, 0x74, 0x73, 0x0B, 0x72, 0x65, 0x64, 0x75, 0x63, 0x65, 
// 0x5F, 0x66, 0x75, 0x6E, 0x63, 0x00, 0x04]), 0)))

export function parseFunction(bytes: Uint8Array, index: number):number[]{
    const [size, width] = lebToInt(bytes.slice(index, index+4));
    let typeidxVec = new Array(size);
    index+=width;
    for (let i = 0; i < size; i++) {
        const [inSize, inWidth] = lebToInt(bytes.slice(index, index+4));
        typeidxVec[i] = inSize;
        index+=inWidth;
    }
    return typeidxVec;
}

export function parseTable(bytes: Uint8Array, index: number):types.tableType[]{
    const [size, width] = lebToInt(bytes.slice(index, index+4));
    let tabletypeVec = new Array(size);
    index+=width;
    for (let i = 0; i < size; i++) {
        let table:types.tableType;
        [table, index] = descParser.parseTableType(bytes, index);
        tabletypeVec[i] = table;
    }
    return tabletypeVec;
}

export function parseMemory(bytes: Uint8Array, index: number):types.limits[]{
    const [size, width] = lebToInt(bytes.slice(index, index+4));
    let memVec = new Array(size);
    index+=width;
    for (let i = 0; i < size; i++) {
        let mem:types.limits;
        [mem, index] = descParser.parseLimits(bytes, index);
        memVec[i] = mem;
    }
    return memVec;
}

export function parseGlobal(bytes: Uint8Array, index: number):types.global[]{
    const [size, width] = lebToInt(bytes.slice(index, index+4));
    let globalVec = new Array(size);
    index+=width;
    for (let i = 0; i < size; i++) {
        let gt:types.globalType;
        [gt, index] = descParser.parseGlobalType(bytes, index);
        let expr:Uint8Array;
        [expr, index] = descParser.parseExpr(bytes, index);
        globalVec[i] = {gt, expr};
    }
    return globalVec;
}

export function parseExport(bytes: Uint8Array, index: number):types.exports[]{
    
    const [size, width] = lebToInt(bytes.slice(index, index+4));
    index+= width;
    const exportVec = new Array(size);
    for (let i = 0; i < size; i++) {
        const [inSize, inWidth] = lebToInt(bytes.slice(index, index+4));
        let name:types.namesVector = [inSize, ""];
        index+= inWidth;
        for (let j = 0; j < inSize; j++){
            name[1] = name[1].concat(String.fromCharCode(bytes[index+j]));
        }
        index += inSize;

        if(bytes[index] != 0 && bytes[index] != 1 && bytes[index] != 2 && bytes[index] != 3) throw new Error("No description section on the import.");
        let desc:types.descTypes;
        switch(bytes[index]) {
            case 0: [desc, index] = descParser.parseidx(bytes, index+1); break;
            case 1: [desc, index] = descParser.parseTableType(bytes, index+1); break;
            case 2: [desc, index] = descParser.parseLimits(bytes, index+1); break;
            case 3: [desc, index] = descParser.parseGlobalType(bytes, index+1); break;
            default: throw new Error("Invalid description value.");
        }
        const parsedImport:types.exports = {name:name, description:desc};
        exportVec[i] = parsedImport;
    }
    return exportVec;
}
