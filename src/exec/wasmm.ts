import fs from 'fs';
import { Immer } from 'immer';
import  * as types from "./types";
import  * as parserTypes from "../types";
import { ExportSection, parseModule }from "../parser";
import { assert } from 'console';
import { Op, IfElseOp } from '../helperParser';
import { Opcode } from "../opcodes"
import * as execute from "./operations"
import { type } from 'os';
export type WasmType = "i32" | "i64" | "f32" | "f64" | "funcref" | "externref" | "vectype";

export class Label extends Op{
    constructor(public arity:number, public instr: Op[], public instrIndex: number = 0){
        super(Opcode.Label, []);
    }
}
export class Frame extends Op{
    constructor(public locals:parserTypes.localsVal[], public module:types.WebAssemblyMtsModule, public currentFunc: number){
        super(Opcode.Frame, []);
    }
}

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
    toInstantiation() {
        const params:parserTypes.localsVal[] = [];

        for(let i=0; i < this.parameters.length; i++) {
            switch(this.parameters[i]) {
                case "i32": params.push({value:0, type:0x7F}); break;
                case "i64": params.push({value:0n, type:0x7E}); break;
                case "f32": params.push({value:0, type:0x7D}); break;
                case "f64": params.push({value:0, type:0x7C}); break;
                case "funcref": params.push({value:0, type:0x70}); break;
                case "externref": params.push({value:0, type:0x6f}); break;
                case "vectype": params.push({value:0, type:0x7B}); break;
                default: throw new Error("Invalid return type");
            }
        }
        return params;
    }
}
// export class WasmTableType {
//     table: parserTypes.tableType;
//     references: number[];

//     constructor(rawTable:parserTypes.tableType) {
//         this.table = 
//     }
// }

export function isWebAssemblyModule(data: unknown): data is types.WebAssemblyMtsModule {
    //runtime test of the data: if it is true assert something about the type of data to typescript
    return (data as types.WebAssemblyMtsModule).types !== undefined;
}
export function isExportInst(func: unknown): func is types.ExportInst {
    return (func as types.ExportInst).valName !== undefined;
}
export function isFuncAddr(func: unknown): func is types.FuncAddr {
    return (func as types.FuncAddr).val !== undefined;
}
export function isLabel(func: unknown): func is Label {
    return (func as Label).arity !== undefined;
}


//look from the top of the stack til you find a frame
export function lookForFrame(stack:Op[]){
    let frame: Frame;
    for (let i = stack.length; i >= 0; i--) {
        if(stack[i] instanceof Frame) {
            frame = stack[i] as Frame;
        }
    }
    if(frame! == undefined) throw new Error("No frame on stack found")
    return frame;
}

export class WebAssemblyMtsStore implements types.Store {
    public stack: Op[];
    constructor(public funcs: types.FuncInst[]=[], public tables: types.TableInst[]=[], public mems: types.MemInst[]=[], 
        public globals: types.GlobalInst[]=[], public exports: types.ExportInst[]=[]) {
        this.stack = [];
    }
    executeOp(op: Op | IfElseOp):void | Op[] {
        const len = this.stack.length;
        switch(op.id){

            case Opcode.Return:{
                //Find the current Frame
                let frame: Frame;
                for (let i = this.stack.length; i >= 0; i--) {
                    if(this.stack[i] instanceof Frame) {
                        frame = this.stack[i] as Frame;
                    }
                }
                if(frame! == undefined) throw new Error("No frame on stack found");
                //get the number of return values
                let returns = frame.module.types[frame.currentFunc].returns;
                let returnArity = returns.length;
                let results: Op[] = [];
                //turn this into a check for type of the return values from returns (check from top of the stack until Frame)
                if (this.stack.length < returnArity) throw new Error("Missing return values")
               
                //Maybe the following could be replaced with result = this.stack.slice(this.stack.length-returnArity);
                for(let i = 0; i < returnArity; i++) {
                    results.push(this.stack.pop()!);
                }
                do {
                    this.stack.pop();
                } while(!(this.stack[this.stack.length-1] instanceof Frame) || this.stack.length == 0)
                assert(this.stack[this.stack.length-1] instanceof Frame, "No frame found") 
                //pop the frame
                this.stack.pop();
                this.stack.push(...results);
                break;
            }
            case Opcode.End: break;
            // consts
            case Opcode.I32Const:
            case Opcode.I64Const:
            case Opcode.F32Const:
            case Opcode.F64Const:{
                this.stack.push(op)
                break;
            }

            // math
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
            // control instructions
            case Opcode.If:{ // else is handled inside
                
                const frame = lookForFrame(this.stack);
                const moduleTypes = frame.module.types;
                // passing the boolean (constant numtype), the ifop (containing the block), the store and the module types reference
                const blockLabel = execute.ifinstr(this.stack.pop()!, op as IfElseOp, moduleTypes);
                console.log("block",blockLabel)
                break;
            }

            // comparisons
            //EQZ
            case Opcode.I32Eqz:{
                this.stack.push(execute.i32eqz(this.stack.pop()!))
                break;
            }
            case Opcode.I64Eqz:{
                this.stack.push(execute.i64eqz(this.stack.pop()!))
                break;
            }
            //EQ
            case Opcode.I32Eq:{
                this.stack.push(execute.i32eq(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.I64Eq:{
                this.stack.push(execute.i64eq(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.F32Eq:{
                this.stack.push(execute.f32eq(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.F64Eq:{
                this.stack.push(execute.f64eq(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            //NE
            case Opcode.I32Ne:{
                this.stack.push(execute.i32ne(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.I64Ne:{
                this.stack.push(execute.i64ne(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.F32Ne:{
                this.stack.push(execute.f32ne(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.F64Ne:{
                this.stack.push(execute.f64ne(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            //LT
            case Opcode.I32LtS:{
                this.stack.push(execute.i32lts(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.I32LtU:{
                this.stack.push(execute.i32ltu(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.I64LtS:{
                this.stack.push(execute.i64lts(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.I64LtU:{
                this.stack.push(execute.i64ltu(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.F32Lt:{
                this.stack.push(execute.f32lt(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.F64Lt:{
                this.stack.push(execute.f64lt(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            //GT
            case Opcode.I32GtS:{
                this.stack.push(execute.i32gts(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.I32GtU:{
                this.stack.push(execute.i32gtu(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.I64GtS:{
                this.stack.push(execute.i64gts(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.I64GtU:{
                this.stack.push(execute.i64gtu(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.F32Gt:{
                this.stack.push(execute.f32gt(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.F64Gt:{
                this.stack.push(execute.f64gt(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            //LE
            case Opcode.I32LeS:{
                this.stack.push(execute.i32les(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.I32LeU:{
                this.stack.push(execute.i32leu(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.I64LeS:{
                this.stack.push(execute.i64les(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.I64LeU:{
                this.stack.push(execute.i64leu(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.F32Le:{
                this.stack.push(execute.f32le(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.F64Le:{
                this.stack.push(execute.f64le(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            //GE
            case Opcode.I32GeS:{
                this.stack.push(execute.i32ges(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.I32GeU:{
                this.stack.push(execute.i32geu(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.I64GeS:{
                this.stack.push(execute.i64ges(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.I64GeU:{
                this.stack.push(execute.i64geu(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.F32Ge:{
                this.stack.push(execute.f32ge(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            case Opcode.F64Ge:{
                this.stack.push(execute.f64ge(this.stack.pop()!, this.stack.pop()!))
                break;
            }
            //getters and setters
            // local get/set
            case Opcode.SetLocal:{
                const frame = lookForFrame(this.stack);

                const localToSet:parserTypes.localsVal = frame.locals[op.args as number];
                execute.setLocal(localToSet, this.stack.pop()!);
            }
            case Opcode.GetLocal:{
                const frame = lookForFrame(this.stack);

                const localToGet:parserTypes.localsVal = frame.locals[op.args as number];
                this.stack.push(execute.getLocal(localToGet));
            }
            case Opcode.TeeLocal:{ // like set but keeping the const
                const frame = lookForFrame(this.stack);

                const localToSet:parserTypes.localsVal = frame.locals[op.args as number];
                const valToKeep = this.stack.pop();
                this.stack.push(valToKeep!);
                execute.setLocal(localToSet, valToKeep!);
            }

            // global get/set
            // case Opcode.SetGlobal:{
            //     const frame = this.stack[1] as Frame;
            //     const globalFromModule =  [this.stack.pop()?.args as number]; // NEED TO TAKE GLOBALS FROM THE STORE (GLOBAL INST)
            //     const globalToSet:parserTypes.globalsVal = {

            //         value: globalFromModule.val, //wrong
            //         type: globalFromModule.kind //wrong
            //     }
            // }
            // case Opcode.GetGlobal:{
                
            // }

        }
    }
}

export class WebAssemblyMts {
    static store: WebAssemblyMtsStore;
    
    static async compile(bytes:Uint8Array): Promise<types.WebAssemblyMtsModule> {
        //call parser on the bytes
        let [moduleTree, length] = parseModule(bytes);

        assert(length == bytes.byteLength, "Module byte length error.");
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
        let functionSignatures = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAFunction)
        let functionCodes = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WACode)
        let tableSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WATable)
        let memorySection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAMemory)
        let globalSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAGlobal)
        let elemSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAElement)
        let dataSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAData)
        let exportSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAExport)


        for(let type of typesSection!.content) {
            mtsModule.types.push(new WasmFuncType(type));
        }
        // FuncInst
        const funcTypeSignatures = functionSignatures?.content;
        for (let i = 0; i < funcTypeSignatures.length; i++) {
            let func:types.FuncInst= {
                type: mtsModule.types[funcTypeSignatures[i]],
                module: mtsModule,
                code: functionCodes?.content[i].content
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
        // ExportInst

        for(let index in exportSection?.content) {
            // parsing the address type (exportdesc[0] is the desctype)
            let value:types.ExternVal;
            const exportdesc = exportSection?.content[index].exportdesc;
            switch(exportdesc[0]){
                case 0: value = {kind:"funcaddr", val: exportdesc[1]}; break;
                case 1: value = {kind:"tableaddr", val: exportdesc[1]}; break;
                case 2: value = {kind:"memaddr", val: exportdesc[1]}; break;
                case 3: value = {kind:"globaladdr", val: exportdesc[1]}; break;
                default: throw new Error(`Invalid export description type`);
            }
            let exports:types.ExportInst= {
                valName: exportSection?.content[index].name[1],
                value
            }
            WebAssemblyMts.store.exports.push(exports)
            mtsModule.exports.push(exports)
        }
        return mtsModule;
        //returned module is basically the parse tree
        //compile does not run the code at all
        //will add values to the global store
        //will return references/basically the index in the store for each object in the module.
    }
    static async instantiate(moduleMts: types.WebAssemblyMtsModule, importObject?: object): Promise<types.WebAssemblyMtsInstance>;
    static async instantiate(bytes:Uint8Array, importObject?: object): Promise<types.WebAssemblyMtsInstantiatedSource>;

    static async instantiate(moduleOrBytes: unknown, importObject?: object): Promise<types.WebAssemblyMtsInstantiatedSource | types.WebAssemblyMtsInstance> {
        //import object is how many page of memory there are
        if(moduleOrBytes instanceof Uint8Array) {
            const wmodule = await this.compile(moduleOrBytes);
            const instance:types.WebAssemblyMtsInstance = {exports: {}, object: undefined};
            const instantiatedSource: types.WebAssemblyMtsInstantiatedSource = {module: wmodule, instance};
            
            wmodule.exports.forEach(exp => {
                if(exp.value.kind == "funcaddr"){
                    instantiatedSource.instance.exports[exp.valName] = (...args: any[]) => {
                        return WebAssemblyMts.run(exp, ...args);
                    }
                }
            })
            return instantiatedSource;

        }else if(isWebAssemblyModule(moduleOrBytes)) {
            // need to implement importobject    
            const instantiatedSource: types.WebAssemblyMtsInstantiatedSource =
            {module: moduleOrBytes, instance:{exports: {}, object: undefined}};
            moduleOrBytes.exports.forEach(exp => {
                if(exp.value.kind == "funcaddr"){
                    instantiatedSource.instance.exports[exp.valName] = (...args: any) => {
                        return WebAssemblyMts.run(exp, ...args);
                    }
                }
            })
            return instantiatedSource;
        }
        throw new Error("Bad input data");
    }

    static run(func:types.ExportInst, ...args: unknown[]):any;
    static run(func:types.FuncAddr, ...args: unknown[]):any;

    static run(func:unknown, ...args: unknown[]){
        let funcInstance:types.FuncInst;
        let funcAddress: number;
        let label:Label, frame:Frame;
        if(isExportInst(func)){
            funcAddress = func.value.val;
            funcInstance = this.store.funcs[funcAddress];
        }else if(isFuncAddr(func)){
            funcAddress = func.val;
            funcInstance = this.store.funcs[funcAddress];
        // }else if(isLabel(func)){
        }else{
            throw new Error("Bad function reference.")
        }
        // label (arity and code)

        label = new Label(funcInstance!.type.parameters.length, funcInstance!.code.body);
        // activation frame (locals and module)
        const params:parserTypes.localsVal[] = funcInstance!.type.toInstantiation();
        const locals:parserTypes.localsVal[] = funcInstance!.code.locals;
        const allLocals:parserTypes.localsVal[] = params.concat(locals);
        frame = new Frame(allLocals, funcInstance!.module, funcAddress!);
        this.store.stack.push(frame);
        this.store.stack.push(label);
        execute.processParams(label.arity, funcInstance!.type.parameters, args, frame.locals);
        
        //with function calls I'll call the run method passing n args (popping values from the stack)
        label.instr.forEach(op => {
            // take n parameters (arity) from the call
            this.store.executeOp(op)
            label.instrIndex++;
        });
        const returnsArity = funcInstance!.type.returns.length;
        if(returnsArity > 1){
            const returns = [];
            for (let i = 0; i < returnsArity; i++) {
                returns.push(this.store.stack.pop()?.args);
                return returns;
            }
        }else{
            return this.store.stack.pop()?.args;
        }
    }
        
}

//declare is keyword in typescript to assert that a variable/function/object/class exists and is of type X;
// declare let myModule: WebAssemblyMts;
// let myExample = WebAssemblyMts.instantiate(myModule);
// let importedBytes: ArrayBuffer = fs.readFileSync('./tests/wasm/arrays.wasm');
// declare function execution(m: WebAssemblyMtsInstantiatedSource | WebAssemblyMtsInstance): void;




