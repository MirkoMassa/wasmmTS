import { types } from "util";
import { Op } from "../helperParser";
import {
  ExportInst,
  WebAssemblyMtsInstantiatedSource,
  storeProducePatches,
} from "./types";
import WebAssemblyMts from "./wasmm";
import { valType } from "../types";

export function createExports(
  exportInstances: ExportInst[],
  instantiatedSource: WebAssemblyMtsInstantiatedSource,
) {
  exportInstances.forEach((exp) => {
    console.log("exporting...", exp.value.kind);
    if (exp.value.kind == "funcaddr") {
      exportFunctions(exp, instantiatedSource);
      // }else if(exp.value.kind == "memaddr"){
      //     exportMemory(exp, instantiatedSource);
    }
  });
}

function exportFunctions(
  exp: ExportInst,
  instantiatedSource: WebAssemblyMtsInstantiatedSource,
) {
  instantiatedSource.instance.exports[exp.valName] = (...args: any[]) => {
    const funcRes: Op | Op[] = WebAssemblyMts.run(exp, ...args);

    if (funcRes === undefined) {
      return undefined;
    } else if (funcRes instanceof Op) {
      return funcRes.args;
    } else {
      // console.log("func res",funcRes)
      const returns: valType[] = [];
      funcRes.forEach((op) => {
        returns.push(op.args as valType);
      });
      return returns;
    }
  };
  // time travel
  instantiatedSource.instance.exportsTT[exp.valName] = (...args: any[]) => {
    const funcRes: { val: Op | Op[]; stores: storeProducePatches } =
      WebAssemblyMts.runTT(exp, ...args);
    return funcRes;
  };
}

// function exportMemory(exp:ExportInst, instantiatedSource:WebAssemblyMtsInstantiatedSource){
//     const normalExports = instantiatedSource.instance.exports;
//     const timeTravelExports = instantiatedSource.instance.exportsTT;

//     normalExports[exp.valName] = WebAssemblyMts.store.mems[exp.value.val].data;
//     timeTravelExports[exp.valName] = WebAssemblyMts.store.mems[exp.value.val].data;
// }
