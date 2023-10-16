<img src="https://i.imgur.com/DR3bkAe.png"  width="230" height="230" align="right"/>

# wasmmTS - A time travel .wasm interpreter

[![WebAssembly](https://img.shields.io/badge/WebAssembly-654FF0?style=for-the-badge&logo=WebAssembly&logoColor=white)](https://webassembly.org/)
[![Typescript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Nodejs](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Immerjs](https://svgshare.com/i/riM.svg)](https://immerjs.github.io/immer/)
<br/>
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://it.reactjs.org/)
[![Expressjs](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)

## What's the deal?

wasmmTS is just a parser => evaluator => executor of WebAssembly .wasm binary files with a basic interface made in React. The difference between this and other interpreters is that you can see every step of the stack, memory and more. <br>
Definitely the most challenging and complete project I've ever done, I'm planning on doing videos where I explain what I've done step by step.

## How does it work? [Try the demo!](https://www.mirkomassa.com)

![](https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExYjNlMmNlZjRiMDEwMDA3NmMwYWMzZTgzYzI3NGVhNzk0ZWQ5Y2ZjYyZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/RNdSvfzHywJvstk0fy/giphy.gif)
![](https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzkyOWZlMmY3YjdiY2NiYjYyY2E3NjgwNWFlMjJlNDc3NWI3ZDQxYSZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/FUJQ8fxD7vC5zv3Io6/giphy.gif)

## Choose between normal execution and state aware execution!

![](https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExZDY5NDVhNjk4ZTc2MzZiNzU1NTAxMWM0MDk0N2QwZDlkMzY3MDVjYiZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/9464tVcGjC4VieAaE1/giphy.gif)

## Peek at the guide if you don't know what to do!

![](https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzNiMDA4MDFmMDgzN2E4NTM4YTI3Yjg2Zjg3Njc2ODQyOTAzNzYxYyZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/iZlSS0SKtDPJ7VQSZn/giphy.gif)

# How is it structured?

---

As the official documentation says:

> WebAssembly programs are organized into modules, which are the unit of deployment, loading, and compilation.

```ts
export class WasmModule implements types.WASMModule {
  constructor(
    public readonly version: number,
    public sections: types.WASMSection<any>[],
  ) {}
}
export class Section<A> implements types.WASMSection<A> {
  constructor(
    public id: types.WASMSectionID,
    public size: number,
    public content: A[] | A | null,
  ) {}
}
```

Each module contains sections, depending on what it describes, and each section has a defined structure. You can see how I've parsed them on .src/sectionParser.ts and .src/helperParser.ts

## Numeric values

In WebAssembly most of the values, including section sizes and vector sizes, are encoded in LEB128. With the help of the wikipedia page, those are the functions I've made to decode them (signed and unsigned):

```ts
export const decodeUnsignedLeb128 = (input: Uint8Array): [number, number] => {
  let result = 0;
  let shift = 0;
  let index = 0;
  while (true) {
    const byte = input[index++];
    result |= (byte & 0x7f) << shift;
    shift += 7;
    if ((0x80 & byte) === 0) return [result, index];
  }
};

export const decodeSignedLeb128 = (input: Uint8Array): [number, number] => {
  let result = 0;
  let shift = 0;
  let index = 0;
  while (true) {
    const byte = input[index++];
    result |= (byte & 0x7f) << shift;
    shift += 7;
    if ((0x80 & byte) === 0) {
      if (shift < 32 && (byte & 0x40) !== 0) {
        return [result | (~0 << shift), index];
      }
      return [result, index];
    }
  }
};
```

# Module parsing

This is the function that will return the syntax tree. On called functions inside the module I made sure to pass and check everytime the current index (the pointed byte index), it made the debugging easier.

```ts
export function parseModule(
  bytes: Uint8Array,
): [module: WasmModule, index: number] {
  //WASM_BINARY_MAGIC && WASM_BINARY_VERSION
  const preamble = [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00];

  for (let i = 0; i < 8; i++) {
    if (preamble[i] != bytes[i]) throw new Error("Unexpected module preamble.");
  }
  let sectionIndex = 8;
  let sections: Section<any>[] = [];
  while (sectionIndex < bytes.byteLength) {
    //looping through sections
    // console.log(sectionIndex)
    let [section, si] = parseSection(bytes, sectionIndex);
    // @ts-ignore for now till I end implementing every section
    sections.push(section);
    sectionIndex = si; // should match the length of the module
  }

  return [new WasmModule(1, sections), sectionIndex];
}
```

As you could imagine (and also see from the code) like every touring complete language WebAssembly has a bit of complexity on the bottom, so for every section I made sure to take in account every case, thanks to the documentation which is structured pretty well webassembly.github.io

# Validation and execution

I didn't bother on "validating" the code because that's what the wat2wasm compiler already does (every .wat file is compiled in .wasm format). So once I tested the parser I got right away on coding the execution.

This is the method that creates the module instance. The instance is basically a collection of all the exported things from the module and other information I've added, like the parsed custom section (useful for function and local names in the debugging phase).

```ts
  static async instantiate(moduleMts: types.WebAssemblyMtsModule, importObject?: object): Promise<types.WebAssemblyMtsInstance>;
  static async instantiate(bytes:Uint8Array, importObject?: object): Promise<types.WebAssemblyMtsInstantiatedSource>;

  static async instantiate(moduleOrBytes: unknown, importObject?: object): Promise<types.WebAssemblyMtsInstantiatedSource | types.WebAssemblyMtsInstance> {
      //import object is how many page of memory there are
      if(moduleOrBytes instanceof Uint8Array) {
          const [wmodule, custom]  = await this.compile(moduleOrBytes, importObject);
          const instance:types.WebAssemblyMtsInstance = {exports: {}, exportsTT: {}, object: undefined, custom};

          const instantiatedSource: types.WebAssemblyMtsInstantiatedSource = {module: wmodule, instance};
          wmodule.exports.forEach(exp => {
              if(exp.value.kind == "funcaddr"){
                  instantiatedSource.instance.exports[exp.valName] = (...args: any[]) => {
                      const funcRes:Op | Op[] = WebAssemblyMts.run(exp, ...args);

                      // \/ this is to return directly vals, not Op consts \/
                      if(funcRes instanceof Op){
                          return funcRes.args;
                      }else{
                          // console.log("func res",funcRes)
                          const returns:parserTypes.valType[] = [];
                          funcRes.forEach(op=> {
                              returns.push(op.args as parserTypes.valType)
                          });
                          return returns;
                      }

                  }
                  // time travel
                  instantiatedSource.instance.exportsTT[exp.valName] = (...args: any[]) => {
                      const funcRes:{val: Op | Op[], stores: types.storeProducePatches} = WebAssemblyMts.runTT(exp, ...args);
                      return funcRes;
                  }
              }
              else if(exp.value.kind == "memaddr"){
                  instantiatedSource.instance.exports[exp.valName] = WebAssemblyMts.store.mems[exp.value.val].data;
              }
          })
          return instantiatedSource;

      }else if(isWebAssemblyModule(moduleOrBytes)) {
          const instantiatedSource: types.WebAssemblyMtsInstantiatedSource =
          {module: moduleOrBytes, instance:{exports: {}, exportsTT: {}, object: undefined, custom: {}}};
          moduleOrBytes.exports.forEach(exp => {

              if(exp.value.kind == "funcaddr"){
                  instantiatedSource.instance.exports[exp.valName] = (...args: any) => {
                      return WebAssemblyMts.run(exp, ...args);
                  }
                  // time travel
                  instantiatedSource.instance.exportsTT[exp.valName] = (...args: any) => {
                      return WebAssemblyMts.runTT(exp, ...args);
                  }
              }
          })
          return instantiatedSource;
      }
      throw new Error("Bad input data");
  }
```

Here the complexity rises up. We have new classes to introduce: stores, modules, labels and frames.
We can picture the store as the container of the stack and all the instances needed for the execution. Instances contains raw values and other information depending on the section to execute:

```ts
export class WebAssemblyMtsStore implements types.Store {
    [immerable] = true;
    setAutoFreeze = false;
    public stack: Op[];
    constructor(public funcs: types.FuncInst[]=[], public tables: types.TableInst[]=[], public mems: types.MemInst[]=[],
        public globals: types.GlobalInst[]=[], public exports: types.ExportInst[]=[]) {
        this.stack = [];
    }
```

The module is just the collection of the addresses for each element (types, funcs, tables, mems, globals...):

```ts
export type WebAssemblyMtsModule = {
  types: WasmFuncType[];
  funcs: FuncAddr[];
  tables: TableAddr[];
  mems: MemAddr[];
  globals: GlobalAddr[];
  elems: ElemAddr[];
  datas: DataAddr[];
  exports: ExportInst[];
};
```

Labels are what will get pushed on the stack for every function (funcs) and block of code (blocks, loops, ifs, elses...), and will contain the arity & instructions to execute (OPs) inside them:

```ts
export class Label extends Op {
  [immerable] = true;
  setAutoFreeze = false;
  constructor(
    public arity: number,
    public instr: Op[],
    public type: WasmFuncType | parserTypes.valType | undefined,
    public instrIndex: number = 0,
    public isblock: Boolean = false,
    public parameters: Op[] = [],
  ) {
    super(Opcode.Label, []);
  }
}
```

Frames are also pushed in the stack, but will get created for every function or function call. They contain local variables (parameters and locally defined ones) and the entire module reference.

```ts
export class Frame extends Op {
  [immerable] = true;
  setAutoFreeze = false;
  constructor(
    public locals: parserTypes.localsVal[],
    public module: types.WebAssemblyMtsModule,
    public currentFunc: number,
  ) {
    super(Opcode.Frame, []);
  }
}
```

If you are interested to go deeper I suggest you to read the runtime structure https://webassembly.github.io/spec/core/exec/runtime.html and the API documentation https://webassembly.github.io/spec/js-api/index.html#webassembly-namespace

## Time travel debugger

To implement the time travel functionality (saving all the states) I've created two functions similar to run() and executeInstructions(), but using produceWithPatches from the npm package Immer.

```ts
 const produced = produceWithPatches(setupStore(this.store), (state)=>{
```

like that I can save an immutable state copy of the Store object, after the label and frame push on the stack inside runTT(), and then after every instruction execution inside executeInstructionsTT.
setupStore is a function I made to create a deep copy of the store (Immer by default has an autoFreeze functionality):

```ts
let setupStore = (store: WebAssemblyMtsStore) => {
  let result = structuredClone(store);
  Object.setPrototypeOf(result, Object.getPrototypeOf(store));
  result[immerable] = true;
  console.log("store clone", result);
  return result;
};
```

To see the interface I made in React you can check the [front-end repository](https://github.com/MirkoMassa/wasmmts-gui).

![](https://media.tenor.com/P_-HUAtwhLwAAAAC/vegeta-dbz.gif)
