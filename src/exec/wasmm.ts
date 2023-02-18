import fs from 'fs';
import { Immer } from 'immer';
import  * as types from "./types";
import  * as parserTypes from "../types";
import { parseModule }from "../parser";
import { assert } from 'console';
import { Op } from '../helperParser';
import { Opcode } from "../opcodes"
import * as execute from "./operations"
export type WasmType = "i32" | "i64" | "f32" | "f64" | "funcref" | "externref" | "vectype";
export class WasmFuncType {
    parameters: WasmType[];
    returns: WasmType[];
    constructor(rawType: parserTypes.funcType) {
        this.parameters = [];
        if(rawType.parameters != undefined){
            for(let i=0; i < rawType.parameters[0]; i++) {
                switch(rawType.parameters[1][i]) {
                    case 0x7F: this.parameters.push("i32"); break;
                    case 0x7E: this.parameters.push("i64"); break;
                    case 0x7D: this.parameters.push("f32"); break;
                    case 0x7C: this.parameters.push("f64"); break;
                    case 0x70: this.parameters.push("funcref"); break;
                    case 0x6f: this.parameters.push("externref"); break;
                    case 0x7B: this.parameters.push("vectype"); break;
                    default: throw new Error("Invalid parameter type");
                }
            }
        }
        this.returns = [];
        if(rawType.returns != undefined){
            for(let i=0; i < rawType.returns[0]; i++) {
                switch(rawType.returns[1][i]) {
                    case 0x7F: this.returns.push("i32"); break;
                    case 0x7E: this.returns.push("i64"); break;
                    case 0x7D: this.returns.push("f32"); break;
                    case 0x7C: this.returns.push("f64"); break;
                    case 0x70: this.returns.push("funcref"); break;
                    case 0x6f: this.returns.push("externref"); break;
                    case 0x7B: this.returns.push("vectype"); break;
                    default: throw new Error("Invalid return type");
                }
            }
        }
    }
    toString() {
        return `(${this.parameters.join(",")}) => ${this.returns.join(",")}`;
    }
}
// export class WasmTableType {
//     table: parserTypes.tableType;
//     references: number[];

//     constructor(rawTable:parserTypes.tableType) {
//         this.table = 
//     }
// }
//just basic objects built with raw objects rather than using classes
function isWebAssemblyModule(data: unknown): data is types.WebAssemblyMtsModule {
    //runtime test of the data// if it is true assert something about the type of data to typescript
    return (data as any).x == true;
}
export class WebAssemblyMtsStore implements types.Store {
    public stack:Op[];
    constructor(public funcs: types.FuncInst[]=[], public tables: types.TableInst[]=[], public mems: types.MemInst[]=[], 
        public globals: types.GlobalInst[]=[]) {

        this.stack = [];
        //funcs:  Array<functionCodes>
        //all the other store data members
    }
    executeOp(op: Op) {
        const len = this.stack.length;
        switch(op.id){
            // local getters and setters
            case Opcode.SetLocal:{
                // local idx reference -> access current function code sec -> looking for the current function's vector of locals - > matching idx

            }
            case Opcode.GetLocal:{

            }
            // consts
            case Opcode.I32Const:
            case Opcode.I64Const:
            case Opcode.F32Const:
            case Opcode.F64Const:{
                this.stack.push(op)
            }
            // simple math
            case Opcode.i32add:{
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.i32add(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.i32sub:{
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.i32sub(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.i32mul:{
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.i32mul(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.i32divU:
            case Opcode.i32divS:{
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.i32div(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.i64add:{
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.i64add(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.i64sub:{
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.i64sub(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.i64mul:{
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.i64mul(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.i64divU:
            case Opcode.i64divS:{
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.i64div(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.f32add:{
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.f32add(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.f32sub:{
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.f32sub(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.f32mul:{
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.f32mul(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.f32div:{
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.f32div(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.f64add:{
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.f64add(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.f64sub:{
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.f64sub(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.f64mul:{
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.f64mul(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.f64div:{
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.f64div(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            //local get/set
            
        }
        
        //global get/set
        
        //control instruction
        //call
    }
}

export class WebAssemblyMts {
    static store: WebAssemblyMtsStore;
    
    static async compile(bytes:ArrayBuffer): Promise<types.WebAssemblyMtsModule> {
        //call parser on the bytes
        let [moduleTree, length] = parseModule(new Uint8Array(bytes));
        assert(length == bytes.byteLength)
        if(WebAssemblyMts.store == undefined) WebAssemblyMts.store = new WebAssemblyMtsStore();
        let mtsModule: types.WebAssemblyMtsModule = {
            types: [],
            funcs: [],
            tables: [],
            mems: [],
            globals: [],
            elems: [],
            datas: [],
            exports: []
        }
        let typesSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAType)
        console.log(typesSection)
        let functionSignatures = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAFunction)
        let functionCodes = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WACode)
        let tableSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WATable)
        let memorySection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAMemory)
        let globalSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAGlobal)
        let elemSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAElement)
        let dataSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAData)

        // TableTypes
        for(let type of typesSection!.content) {
            mtsModule.types.push(new WasmFuncType(type));
        }
        // FuncInst
        for(let index in functionSignatures?.content) {
            let func:types.FuncInst= {
                type: mtsModule.types[Number(index)],
                module: mtsModule,
                code: functionCodes?.content[index]
            }
            let length = WebAssemblyMts.store.funcs.push(func)
            //every instance reference addrs is with respect to the store indices
            mtsModule.funcs.push(
                {kind: "funcaddr", val: length-1}
            )
        }
        // TableInst
        
        //tables seems to be arrays of function references/functions
        // for(let index in tableSection?.content) {
            
        //     let table:types.TableInst= {
        //         type: tableSection?.content[index],
        //         elem: 
        //     }
        //     let length = WebAssemblyMts.store.funcs.push(table)
        //     mtsModule.tables.push(
        //         {kind: "tableaddr", val: length-1}
        //     )
        // }

        // MemInst
        for(let index in memorySection?.content) {
            
            const vecLength = 65536 * memorySection?.content[index].min;
            const data = new Array(vecLength);
            let mem:types.MemInst= {
                type: memorySection?.content[index],
                data
            }
            let length = WebAssemblyMts.store.mems.push(mem)
            mtsModule.mems.push(
                {kind: "memaddr", val: length-1}
            )
        }
        // GlobalInst
        for(let index in globalSection?.content) {
            let global:types.GlobalInst= {
                mut: globalSection?.content[index].gt.mutability == 0 ? "const" : "mut",
                type: globalSection?.content[index].gt,
                value: 0, //concrete value
                init: globalSection?.content[index].expr //op
            }
            let length = WebAssemblyMts.store.globals.push(global)
            mtsModule.globals.push(
                {kind: "globaladdr", val: length-1}
            )
        }
        // ElemInst

        // for(let index in elemSection?.content) {
        //     let elem:types.ElemInst= {
        //         type: elemSection?.content[index].type
        //         data: // vector of ref
        //     }
        // }

        return mtsModule;
        //returned module is basically the parse tree
        //compile does not run the code at all
        //will add values to the global store
        //will return references/basically the index in the store for each object in the module.
    }
    static async instantiate(moduleMts: types.WebAssemblyMtsModule, importObject?: object): Promise<types.WebAssemblyMtsModule>;
    static async instantiate(bytes:ArrayBuffer, importObject?: object): Promise<types.WebAssemblyMtsInstantiatedSource>;
    static async instantiate(moduleOrBytes: unknown, importObject?: object): Promise<types.WebAssemblyMtsInstantiatedSource | types.WebAssemblyMtsModule> {
        //create store if it doesn't exist
        //create module which refers to
        //instantiate will run the start section of the wasm module 
        //import object is how many page of memory

        if(moduleOrBytes instanceof ArrayBuffer) {
            let something: types.WebAssemblyMtsInstantiatedSource = {
                // @ts-ignore
                module: await this.compile(moduleOrBytes),
                // @ts-ignore
                instance: {}
            };
            return something;
        }else if(isWebAssemblyModule(moduleOrBytes)) {
            // @ts-ignore
            let instance: WebAssemblyMtsInstance = this.instantiate(module);
            
            return instance;
        }
        throw new Error("Bad input data");
    }
}


//declare is keyword in typescript to assert that a variable/function/object/class exists and is of type X;
// declare let myModule: WebAssemblyMts;
// let myExample = WebAssemblyMts.instantiate(myModule);
// let importedBytes: ArrayBuffer = fs.readFileSync('./tests/wasm/arrays.wasm');
// declare function execution(m: WebAssemblyMtsInstantiatedSource | WebAssemblyMtsInstance): void;




