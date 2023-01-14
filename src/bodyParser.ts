import {decodeSignedLeb128 as lebToInt} from "./Leb128ToInt";
import  * as types  from "./types";
import {parseSection} from "./parser";

//parsed body in almost in every section id as almost every section has a vector
export class ParsedBody{

    // count is the size of the vector, elements are the module components described here
    // https://webassembly.github.io/spec/core/syntax/modules.html#syntax-module

    //for now elements has any type because I'm not sure how much types there will be
    constructor (public count:number, public elements:any = []){}
}

export function parseType(bytes: Uint8Array, index: number): ParsedBody{
    //checking the number of function signatures
    const [size, width] = lebToInt(bytes.slice(index, index+4)); //size is the number of functions signatures in the module
    index+= width; //offset after the number of function signatures declaration
    const pb = new ParsedBody(size, []);

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
        pb.elements.push(func);
    }
    return pb; 
}
// console.log(JSON.stringify(parseType(new Uint8Array([0x01, 0x60, 0x02, 0x7F, 0x7F, 0x01, 0x7F]), 0)))

export function parseImport(bytes: Uint8Array, index: number): ParsedBody{

    const [size, width] = lebToInt(bytes.slice(index, index+4));
    index+= width;
    const pb = new ParsedBody(size, []);
    //name parsing
    for (let i = 0; i < size; i++) {
        let [inSize, inWidth] = [0, 0];
        //how many vectors of import modules

        //module name (n (size) bytes)
        [inSize, inWidth] = lebToInt(bytes.slice(index, index+4));
        index+= inWidth;
        let module:types.namesVector = [inSize, ""];
        for (let j = 0; j < inSize; j++){
            module[1] = module[1].concat(String.fromCharCode(bytes[index+j]));
        }
        index += inSize;

        //function name (n (size) bytes)
        [inSize, inWidth] = lebToInt(bytes.slice(index, index+4));
        let name:types.namesVector = [inSize, ""];
        index+= inWidth;
        for (let j = 0; j < inSize; j++){
            name[1] = name[1].concat(String.fromCharCode(bytes[index+j]));
        }

        index += inSize;
        //desc (1 byte long, no encoding, section id)
        
        if(bytes[index] != 0 && bytes[index] != 1 && bytes[index] != 2 && bytes[index] != 3) throw new Error("No description section on the import.");

        const desc = parseSection(bytes, index);
        const parsedImport:types.imports = {module:module, name:name, description:desc[0]}; //desc[0] is just the types.WASMSection
        index = desc[1]; //desc[1] is the new index after the section parsing
        pb.elements.push(parsedImport);
    }

    return pb;
}
