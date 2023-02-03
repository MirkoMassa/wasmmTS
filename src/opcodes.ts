import { enumRange, logAsHex } from "./utils";
export enum Opcode {
    // control instructions
    Unreachable = 0x00,
    Nop = 0x01,
    Block = 0x02,
    Loop = 0x03,
    If = 0x04,
    Else = 0x05,
    End = 0x0B,
    Br = 0x0C,
    BrIf = 0x0D,
    BrTable = 0x0E,
    Return = 0x0F,
    Call = 0x10,
    CallIndirect = 0x11,
  
    // Parametric operators
    Drop = 0x1A,
    Select = 0x1B,
  
    // Variable access
    GetLocal = 0x20,
    SetLocal = 0x21,
    TeeLocal = 0x22,
    GetGlobal = 0x23,
    SetGlobal = 0x24,
  
    // memory instructions
    I32Load = 0x28,
    I64Load = 0x29,
    F32Load = 0x2A,
    F64Load = 0x2B,
    I32Load8S = 0x2C,
    I32Load8U = 0x2D,
    I32Load16S = 0x2D,
    I32Load16U = 0x2F,
    I64Load8S = 0x30,
    I64Load8U = 0x31,
    I64Load16S = 0x32,
    I64Load16U = 0x33,
    I64Load32S = 0x34,
    I64Load32U = 0x35,
    I32Store = 0x36,
    I64Store = 0x37,
    F32Store = 0x38,
    F64Store = 0x39,
    I32Store8 = 0x3A,
    I32Store16 = 0x3B,
    I64Store8 = 0x3C,
    I64Store16 = 0x3D,
    I64Store32 = 0x3E,
    memorySize = 0x3F,
    memoryGrow = 0x40,

    // const numeric instructions
    I32Const = 0x41,
    I64Const = 0x42,
    F32Const = 0x43,
    F64Const = 0x44,

    I32Eqz = 0x45,
    I32Eq = 0x46,
    I32Ne = 0x47,
    I32LtS = 0x48,
    I32LtU = 0x49,
    I32GtS = 0x4A,
    I32GtU = 0x4B,
    I32LeS = 0x4C,
    I32LeU = 0x4D,
    I32GeS = 0x4E,
    I32GeU = 0x4F,

    I64Eqz = 0x50,
    I64Eq = 0x51,
    I64Ne = 0x52,
    I64LtS = 0x53,
    I64LtU = 0x54,
    I64GtS = 0x55,
    I64GtU = 0x56,
    I64LeS = 0x57,
    I64LeU = 0x58,
    I64GeS = 0x59,
    I64GeU = 0x5A,

    F32Eq = 0x5B,
    F32Ne = 0x5C,
    F32Lt = 0x5D,
    F32Gt = 0x5E,
    F32Le = 0x5F,
    F32Ge = 0x60,

    F64Eq = 0x61,
    F64Ne = 0x62,
    F64Lt = 0x63,
    F64Gt = 0x64,
    F64Le = 0x65,
    F64Ge = 0x66,

    i32clz = 0x67,
    i32ctz = 0x68,
    i32popcnt = 0x69,
    i32add = 0x6A,
    i32sub = 0x6B,
    i32mul = 0x6C,
    i32divS = 0x6D,
    i32divU = 0x6E,
    i32remS = 0x6F,
    i32remU = 0x70,
    i32and = 0x71,
    i32or = 0x72,
    i32xor = 0x73,
    i32shl = 0x74,
    i32shrS = 0x75,
    i32shrU = 0x76,
    i32rotl = 0x77,
    i32rotr = 0x78,

    i64clz = 0x79,
    i64ctz = 0x7A,
    i64popcnt = 0x7B,
    i64add = 0x7C,
    i64sub = 0x7D,
    i64mul = 0x7E,
    i64divS = 0x7F,
    i64divU = 0x80,
    i64remS = 0x81,
    i64remU = 0x82,
    i64and = 0x83,
    i64or = 0x84,
    i64xor = 0x85,
    i64shl = 0x86,
    i64shrS = 0x87,
    i64shrU = 0x88,
    i64rotl = 0x89,
    i64rotr = 0x8A,

    f32abs = 0x8B,
    f32neg = 0x8C,
    f32ceil = 0x8D,
    f32floor = 0x8E,
    f32trunc = 0x8F,
    f32nearest = 0x90,
    f32sqrt = 0x91,
    f32add = 0x92,
    f32sub = 0x93,
    f32mul = 0x94,
    f32div = 0x95,
    f32min = 0x96,
    f32max = 0x97,
    f32copysign = 0x98,

    f64abs = 0x99,
    f64neg = 0x9A,
    f64ceil = 0x9B,
    f64floor = 0x9C,
    f64trunc = 0x9D,
    f64nearest = 0x9E,
    f64sqrt = 0x9F,
    f64add = 0xA0,
    f64sub = 0xA1,
    f64mul = 0xA2,
    f64div = 0xA3,
    f64min = 0xA4,
    f64max = 0xA5,
    f64copysign = 0xA6,

    i32wrapi64 = 0xA7,
    i32truncf32S = 0xA8,
    i32truncf32U = 0xA9,
    i32truncf64S = 0xAA,
    i32truncf64U = 0xAB,
    i64extendi32S = 0xAC,
    i64extendi32U = 0xAD,
    i64truncf32S = 0xAE,
    i64truncf32U = 0xAF,
    i64truncf64S = 0xB0,
    i64truncf64U = 0xB1,
    f32converti32S = 0xB2,
    f32converti32U = 0xB3,
    f32converti64S = 0xB4,
    f32converti64U = 0xB5,
    f32demotef64  = 0xB6,
    f64converti32S = 0xB7,
    f64converti32U = 0xB8,
    f64converti64S = 0xB9,
    f64converti64U = 0xBA,
    f64promotef32 = 0xBB,
    i32reinterpretf32 = 0xBC,
    i64reinterpretf64 = 0xBD,
    f32reinterpreti32 = 0xBE,
    f64reinterpreti64 = 0xBF,

    i32extend8S = 0xC0,
    i32extend16S = 0xC1,
    i64extend8S = 0xC2,
    i64extend16S = 0xC3,
    i64extend32S = 0xC4,

    prefixedFC = 0xFC, // and prefix
    prefixedFD = 0xFD, // and prefix

}

export enum FCPrefixes{ // 0xFC
    // table prefixes
    tableInit = 12, // two idxes
    elemDrop = 13,
    tableCopy = 14, //two idxes
    tableGrow = 15,
    tableSize = 16,
    tableFill = 17,

    // numeric prefixes
    i32truncSatF32s = 0,
    i32truncSatF32u = 1,
    i32truncSatF64s = 2,
    i32truncSatF64u = 3,
    i64truncSatF32s = 4,
    i64truncSatF32u = 5,
    i64truncSatF64s = 6,
    i64truncSatF64u = 7,
    memoryInst = 8,
    dataDrop = 9,
    memoryCopy = 10,
    memoryFill = 11

}
export enum PrefixesVector{ // vectorInst = 0xFD

}

export const blockInstr = new Set(enumRange(0x02, 0x04, Opcode));

export const singleByteInstr = new Set();
singleByteInstr.add([0x00, 0x01, 0x0F, 0xD1, 0x1A, 0x1B]);
singleByteInstr.add(enumRange(0x45, 0xC4, Opcode));

export const idxInstr = new Set();
idxInstr.add([0x0C, 0x0D, 0x10, 0xD2]);
idxInstr.add(enumRange(0x20, 0x26, Opcode));

export const memoryInstr = new Set(enumRange(0x28, 0x3E, Opcode));
export const numericInstr = new Set([0x41, 0x42, 0x43, 0x44]);
