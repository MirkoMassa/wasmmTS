import {decodeSignedLeb128 as lebToInt} from "./Leb128ToInt";
import  * as types  from "./types";

//parsed body in almost in every section id as almost every section has a vector
// export class ParsedBody{

//     // count is the size of the vector, elements are the module components described here
//     // https://webassembly.github.io/spec/core/syntax/modules.html#syntax-module

//     //for now elements has any type because I'm not sure how much types there will be
//     constructor (public count:number, public elements:any = []){}
// }


export function parseType(bytes: Uint8Array, index: number): types.funcType[] {
    //checking the number of function signatures
    const [size, width] = lebToInt(bytes.slice(index, index+4)); //size is the number of functions signatures in the module
    index+= width; //offset after the number of function signatures declaration
    const pb = new Array(size);

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
        pb[i] = func;
    }
    return pb; 
}
// console.log(JSON.stringify(parseType(new Uint8Array([0x01, 0x60, 0x02, 0x7F, 0x7F, 0x01, 0x7F]), 0)))


export function parseImport(bytes: Uint8Array, index: number):types.imports[]{

    const [size, width] = lebToInt(bytes.slice(index, index+4));
    index+= width;
    const pb = new Array(size);
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
        //1 byte long, no encoding, importdesc
        if(bytes[index] != 0 && bytes[index] != 1 && bytes[index] != 2 && bytes[index] != 3) throw new Error("No description section on the import.");
        // let desc:types.WASMSection<types.imports>;
        let desc:types.descTypes;
        
        switch(bytes[index]) {
            case 0: [desc, index] = parseFunctionTypeidx(bytes, index+1); break; // importdesc here is an entire section (equals to function section, id 3)
            //...
            default: {}; break;
        }
        const parsedImport:types.imports = {module:module, name:name, description:desc!};
        pb[i] = parsedImport;
    }

    return pb;
    //pass back the index to verify that we parsed everything and reached the same index
}
console.log(JSON.stringify(parseImport(new Uint8Array([0x01, 0x07, 0x69, 0x6D, 0x70, 0x6F, 0x72, 0x74, 0x73, 0x0B, 0x72, 0x65, 0x64, 0x75, 0x63, 0x65, 
    0x5F, 0x66, 0x75, 0x6E, 0x63, 0x00, 0x04]), 0)))

export function parseFunctionTypeidx(bytes: Uint8Array, index: number): [number, number] {
    const [id, width] = lebToInt(bytes.slice(index, index+4));
    return [id, index+width];
}

