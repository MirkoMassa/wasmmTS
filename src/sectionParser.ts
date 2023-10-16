import { decodeUnsignedLeb128 as lebToInt } from "./leb128ToInt";
import { decodeSignedLeb128 as slebToInt } from "./leb128ToInt";
import * as types from "./types";
import * as helperParser from "./helperParser";
import { Opcode } from "./opcodes";
import { logAsHex } from "./utils";
// export class ParsedBody{ //I guess I don't need that

//     // count is the size of the vector, elements are the module components described here
//     // https://webassembly.github.io/spec/core/syntax/modules.html#syntax-module

//     //for now elements has any type because I'm not sure how much types there will be
//     constructor (public count:number, public elements:any = []){}
// }
export function parseCustom(bytes: Uint8Array, index: number): types.custom[] {
  // name (for now it's the only custom section type in existence)
  let customType;
  const customs: types.custom[] = [];
  [customType, index] = helperParser.parseName(bytes, index);

  if (customType[1] === "name") {
    while (index < bytes.byteLength) {
      // console.log("before",index)
      let subSectionRes: types.custom | null;
      [subSectionRes, index] = helperParser.parseCustomNameSection(
        bytes,
        index,
      );
      customs.push(subSectionRes);
      // console.log("after",index)
    }
  } else if (customType[1] === "sourceMappingURL") {
    // do something I guess
    // }else throw new Error (`Unrecognized custom section type "${customType[1]}"`);
  } else {
  }

  return customs;
}

export function parseType(bytes: Uint8Array, index: number): types.funcType[] {
  //checking the number of function signatures
  const [size, width] = lebToInt(bytes.slice(index, index + 4)); //size is the number of functions signatures in the module
  index += width; //offset after the number of function signatures declaration
  const functypeVec = new Array(size);

  for (let i = 0; i < size; i++) {
    if (bytes[index] != 0x60)
      throw new Error("No vector of function signatures.");
    index++; //offset at the start of the first function signature

    let [inSize, inWidth] = [0, 0];
    let params: types.bytesVector;
    let returns: types.bytesVector;
    if (bytes[index] == 0) index++; //checking if there are any parameters
    else {
      // parameter (number and types)
      [inSize, inWidth] = lebToInt(bytes.slice(index, index + 4));
      index += inWidth;
      params = [inSize, bytes.slice(index, index + inSize)];
      index += inSize;
    }
    if (bytes[index] == 0) index++; //checking if there are any parameters
    else {
      // return values (number and types)
      [inSize, inWidth] = lebToInt(bytes.slice(index, index + 4));
      index += inWidth;
      returns = [inSize, bytes.slice(index, index + inSize)];
      index += inSize;
    }
    // function
    const func: types.funcType = { parameters: params!, returns: returns! };
    functypeVec[i] = func;
  }
  return functypeVec;
}
// console.log(JSON.stringify(parseType(new Uint8Array([0x01, 0x60, 0x02, 0x7F, 0x7F, 0x01, 0x7F]), 0)))

export function parseImport(bytes: Uint8Array, index: number): types.imports[] {
  const [size, width] = lebToInt(bytes.slice(index, index + 4));
  index += width;
  const importVec = new Array(size);
  //name parsing
  for (let i = 0; i < size; i++) {
    //module name (n (inSize) bytes)
    let module: types.namesVector;
    [module, index] = helperParser.parseName(bytes, index);
    //function name (n (inSize) bytes)
    let name: types.namesVector;
    [name, index] = helperParser.parseName(bytes, index);
    //1 byte long, no encoding, importdesc
    if (
      bytes[index] != 0 &&
      bytes[index] != 1 &&
      bytes[index] != 2 &&
      bytes[index] != 3
    )
      throw new Error("No description section on the import.");
    // let desc:types.WASMSection<types.imports>;
    let desc: types.descTypes;
    switch (bytes[index]) {
      case 0:
        [desc, index] = helperParser.parseidx(bytes, index + 1);
        break;
      case 1:
        [desc, index] = helperParser.parseTableType(bytes, index + 1);
        break;
      case 2:
        [desc, index] = helperParser.parseLimits(bytes, index + 1);
        break;
      case 3:
        [desc, index] = helperParser.parseGlobalType(bytes, index + 1);
        break;
      default:
        throw new Error("Invalid description value.");
    }
    const parsedImport: types.imports = {
      module: module,
      name: name,
      description: desc,
    };
    importVec[i] = parsedImport;
  }
  return importVec;
}
// console.log(JSON.stringify(parseImport(new Uint8Array([0x01, 0x07, 0x69, 0x6D, 0x70, 0x6F, 0x72, 0x74, 0x73, 0x0B, 0x72, 0x65, 0x64, 0x75, 0x63, 0x65,
// 0x5F, 0x66, 0x75, 0x6E, 0x63, 0x00, 0x04]), 0)))

export function parseFunction(bytes: Uint8Array, index: number): number[] {
  const [size, width] = lebToInt(bytes.slice(index, index + 4));
  let typeidxVec = new Array(size);
  index += width;
  for (let i = 0; i < size; i++) {
    const [inSize, inWidth] = lebToInt(bytes.slice(index, index + 4));
    typeidxVec[i] = inSize;
    index += inWidth;
  }
  return typeidxVec;
}

export function parseTable(
  bytes: Uint8Array,
  index: number,
): types.tableType[] {
  const [size, width] = lebToInt(bytes.slice(index, index + 4));
  let tabletypeVec = new Array(size);
  index += width;
  for (let i = 0; i < size; i++) {
    [tabletypeVec[i], index] = helperParser.parseTableType(bytes, index);
  }
  return tabletypeVec;
}

export function parseMemory(bytes: Uint8Array, index: number): types.limits[] {
  const [size, width] = lebToInt(bytes.slice(index, index + 4));
  let memVec = new Array(size);
  index += width;
  for (let i = 0; i < size; i++) {
    [memVec[i], index] = helperParser.parseLimits(bytes, index);
  }
  return memVec;
}

export function parseGlobal(bytes: Uint8Array, index: number): types.global[] {
  const [size, width] = lebToInt(bytes.slice(index, index + 4));
  let globalVec: types.global[] = new Array(size);
  index += width;
  for (let i = 0; i < size; i++) {
    let gt: types.globalType;
    [gt, index] = helperParser.parseGlobalType(bytes, index);
    let expr: helperParser.Op[];
    [expr, index] = helperParser.parseExpr(bytes, index);
    globalVec[i] = { gt, expr };
  }
  return globalVec;
}

export function parseExport(bytes: Uint8Array, index: number): types.exports[] {
  const [size, width] = lebToInt(bytes.slice(index, index + 4));
  index += width;
  const exportVec = new Array(size);
  for (let i = 0; i < size; i++) {
    const [inSize, inWidth] = lebToInt(bytes.slice(index, index + 4));
    let name: types.namesVector = [inSize, ""];
    index += inWidth;
    for (let j = 0; j < inSize; j++) {
      name[1] = name[1].concat(String.fromCharCode(bytes[index + j]));
    }
    index += inSize;

    if (
      bytes[index] != 0 &&
      bytes[index] != 1 &&
      bytes[index] != 2 &&
      bytes[index] != 3
    )
      throw new Error("No description section on the import.");
    // exportdesc is a tuple containing the desc prefix and the idx
    const desctype = bytes[index];
    let idx: number; // actual idx
    [idx, index] = helperParser.parseidx(bytes, index + 1); //they are all indices
    const exportdesc = [desctype, idx];
    exportVec[i] = { name: name, exportdesc };
  }
  return exportVec;
}
export function parseElement(bytes: Uint8Array, index: number): types.elem[] {
  const [size, width] = lebToInt(bytes.slice(index, index + 4));
  index += width;
  const elemVec = new Array(size);

  for (let i = 0; i < size; i++) {
    const [format, width] = lebToInt(bytes.slice(index, index + 4));
    index += width;
    switch (format) {
      default:
        throw new Error("Invalid element format identifier.");
      case 0: {
        // offset
        let offset: helperParser.Op[];
        [offset, index] = helperParser.parseExpr(bytes, index);
        // vector of funcidx
        const [size, width] = lebToInt(bytes.slice(index, index + 4));
        index += width;
        const funcidxVec = new Array(size + 1);
        for (let j = 0; j < size; j++) {
          const [funcidx, width] = lebToInt(bytes.slice(index, index + 4));
          index += width;
          funcidxVec[j] = funcidx;
        }
        funcidxVec[size] = 0x0b;

        elemVec[i] = {
          type: 0x70,
          init: funcidxVec,
          mode: 0x01,
          activemode: { table: 0, offset },
        };
        break;
      }

      case 1: {
        // elemkind
        if (bytes[index] != 0x00) throw new Error("Invalid elemkind case 1.");
        index++;
        //vector of funcidx
        const [size, width] = lebToInt(bytes.slice(index, index + 4));
        index += width;
        const funcidxVec = new Array(size + 1);
        for (let j = 0; j < size; j++) {
          const [funcidx, width] = lebToInt(bytes.slice(index, index + 4));
          index += width;
          funcidxVec[j] = funcidx;
        }
        funcidxVec[size] = 0x0b;

        elemVec[i] = { type: 0x00, init: funcidxVec, mode: 0x00 };
        break;
      }
      case 2: {
        // tableidx
        let [tableidx, width] = lebToInt(bytes.slice(index, index + 4));
        index += width;
        // offset (expression)
        let offset: helperParser.Op[];
        [offset, index] = helperParser.parseExpr(bytes, index);
        // elemkind
        if (bytes[index] != 0x00) throw new Error("Invalid elemkind case 2.");
        // vector of funcidx
        index++;
        let size;
        [size, width] = lebToInt(bytes.slice(index, index + 4));
        index += width;
        const funcidxVec = new Array(size + 1);
        for (let j = 0; j < size; j++) {
          const [funcidx, width] = lebToInt(bytes.slice(index, index + 4));
          index += width;
          funcidxVec[j] = funcidx;
        }
        funcidxVec[size] = 0x0b;

        elemVec[i] = {
          type: 0x00,
          init: funcidxVec,
          mode: 0x01,
          activemode: { table: tableidx, offset },
        };
        break;
      }
      case 3: {
        // elemkind
        if (bytes[index] != 0x00) throw new Error("Invalid elemkind case 3.");
        index++;
        //vector of funcidx
        const [size, width] = lebToInt(bytes.slice(index, index + 4));
        index += width;
        const funcidxVec = new Array(size + 1);
        for (let j = 0; j < size; j++) {
          const [funcidx, width] = lebToInt(bytes.slice(index, index + 4));
          index += width;
          funcidxVec[j] = funcidx;
        }
        funcidxVec[size] = 0x0b;
        elemVec[i] = { type: 0x00, init: funcidxVec, mode: 0x02 };
        break;
      }
      case 4: {
        // offset (expression)
        let offset: helperParser.Op[];
        [offset, index] = helperParser.parseExpr(bytes, index);
        // vector of expressions
        const [size, width] = lebToInt(bytes.slice(index, index + 4));
        index += width;
        const exprVec = new Array(size);
        for (let j = 0; j < size; j++) {
          [exprVec[j], index] = helperParser.parseExpr(bytes, index);
        }
        elemVec[i] = {
          type: 0x70,
          init: exprVec,
          mode: 0x01,
          activemode: { table: 0, offset },
        };
        break;
      }
      case 5: {
        // reftype
        if (bytes[index] != 0x70 && bytes[index] != 0x6f)
          throw new Error("invalid reftype case 5.");
        const reftype = bytes[index];
        index++;
        // vector of expressions
        const [size, width] = lebToInt(bytes.slice(index, index + 4));
        index += width;
        const exprVec = new Array(size);
        for (let j = 0; j < size; j++) {
          [exprVec[j], index] = helperParser.parseExpr(bytes, index);
        }
        elemVec[i] = { type: reftype, init: exprVec, mode: 0x00 };
        break;
      }
      case 6: {
        // tableidx
        let [tableidx, width] = lebToInt(bytes.slice(index, index + 4));
        index += width;
        // offset (expression)
        let offset: helperParser.Op[];
        [offset, index] = helperParser.parseExpr(bytes, index);
        // reftype
        if (bytes[index] != 0x70 && bytes[index] != 0x6f)
          throw new Error("invalid reftype case 6.");
        const reftype = bytes[index];
        index++;
        // vector of expressions
        let size;
        [size, width] = lebToInt(bytes.slice(index, index + 4));
        index += width;
        const exprVec = new Array(size);
        for (let j = 0; j < size; j++) {
          [exprVec[j], index] = helperParser.parseExpr(bytes, index);
        }

        elemVec[i] = {
          type: reftype,
          init: exprVec,
          mode: 0x01,
          activemode: { table: tableidx, offset },
        };
        break;
      }
      case 7: {
        // reftype
        if (bytes[index] != 0x70 && bytes[index] != 0x6f)
          throw new Error("invalid reftype case 7.");
        const reftype = bytes[index];
        index++;
        // vector of expressions
        const [size, width] = lebToInt(bytes.slice(index, index + 4));
        index += width;
        const exprVec = new Array(size);
        for (let j = 0; j < size; j++) {
          [exprVec[j], index] = helperParser.parseExpr(bytes, index);
        }

        elemVec[i] = { type: reftype, init: exprVec, mode: 0x02 };
        break;
      }
    }
  }
  return elemVec;
}

export function parseCode(bytes: Uint8Array, index: number): types.code[] {
  const [functionCount, width] = lebToInt(bytes.slice(index, index + 4));
  index += width;
  const codeVec: types.code[] = new Array(functionCount);

  for (let i = 0; i < functionCount; i++) {
    //size of the code
    let [codeSize, inWidth] = lebToInt(bytes.slice(index, index + 4));
    // console.log("codeSize",codeSize);
    index += inWidth;
    let oldIndex = index;
    //locals vec
    let localCount;
    [localCount, inWidth] = lebToInt(bytes.slice(index, index + 4));
    // console.log("localcount", localCount)
    index += inWidth;

    let locals: types.valType[] = [];

    if (localCount != 0) {
      for (let j = 0; j < localCount; j++) {
        let localTuple;
        [localTuple, index] = helperParser.parseLocals(bytes, index);
        locals = locals.concat(localTuple);
      }
    }
    //expression (function body)
    let body: helperParser.Op[];
    [body, index] = helperParser.parseExpr(
      bytes,
      index,
      codeSize - (index - oldIndex),
    );
    if (body[body.length - 2].id != Opcode.Return) {
      body.pop();
      body.push(new helperParser.Op(Opcode.Return, []));
      body.push(new helperParser.Op(Opcode.End, []));
    }
    codeVec[i] = { codeSize, content: { locals, body } };
  }
  return codeVec;
}

export function parseData(bytes: Uint8Array, index: number): types.data[] {
  const [dataCount, width] = lebToInt(bytes.slice(index, index + 4));
  index += width;
  const dataVec = new Array(dataCount);
  for (let i = 0; i < dataCount; i++) {
    const [format, width] = lebToInt(bytes.slice(index, index + 4));
    index += width;
    switch (format) {
      default:
        throw new Error("Invalid element format identifier.");
      case 0: {
        // offset (expression)
        let offset: helperParser.Op[];
        [offset, index] = helperParser.parseExpr(bytes, index);
        // bytes vec
        let [size, width] = lebToInt(bytes.slice(index, index + 4));
        index += width;
        const bytesVec = new Array(size);
        for (let j = 0; j < size; j++) {
          bytesVec[j] = bytes[index];
          index++;
        }
        dataVec[i] = {
          init: bytesVec,
          mode: 0x01,
          activemode: { memory: 0, offset },
        };
        break;
      }
      case 1: {
        // bytes vec
        let [size, width] = lebToInt(bytes.slice(index, index + 4));
        index += width;
        const bytesVec = new Array(size);
        for (let j = 0; j < size; j++) {
          bytesVec[j] = bytes[index];
          index++;
        }
        dataVec[i] = { init: bytesVec, mode: 0x00 };
        break;
      }
      case 2: {
        // memidx
        let [memidx, width] = lebToInt(bytes.slice(index, index + 4));
        index += width;
        // offset (expression)
        let offset: helperParser.Op[];
        [offset, index] = helperParser.parseExpr(bytes, index);
        // bytes vec
        let size;
        [size, width] = lebToInt(bytes.slice(index, index + 4));
        const bytesVec = new Array(size);
        for (let j = 0; j < size; j++) {
          bytesVec[j] = bytes[index];
          index++;
        }
        dataVec[i] = {
          init: bytesVec,
          mode: 0x01,
          activemode: { memory: memidx, offset },
        };
        break;
      }
    }
  }
  return dataVec;
}
