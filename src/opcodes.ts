import { enumRange, logAsHex } from "./utils";
export enum Opcode {
  // labels and frames
  Frame = 998,
  Label = 999,
  // control instructions
  Unreachable = 0x00,
  Nop = 0x01,
  Block = 0x02,
  Loop = 0x03,
  If = 0x04,
  Else = 0x05,
  End = 0x0b,
  Br = 0x0c,
  BrIf = 0x0d,
  BrTable = 0x0e,
  Return = 0x0f,
  Call = 0x10,
  CallIndirect = 0x11,

  // Reference instructions
  RefNull = 0xd0,
  RefIsNull = 0xd1,
  RefFunc = 0xd2,

  // Parametric operators
  Drop = 0x1a,
  Select = 0x1b,
  SelectArgs = 0x1c,

  // Variable access
  GetLocal = 0x20,
  SetLocal = 0x21,
  TeeLocal = 0x22,
  GetGlobal = 0x23,
  SetGlobal = 0x24,
  TableGet = 0x25,
  TableSet = 0x26,

  // memory instructions
  I32Load = 0x28,
  I64Load = 0x29,
  F32Load = 0x2a,
  F64Load = 0x2b,
  I32Load8S = 0x2c,
  I32Load8U = 0x2d,
  I32Load16S = 0x2d,
  I32Load16U = 0x2f,
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
  I32Store8 = 0x3a,
  I32Store16 = 0x3b,
  I64Store8 = 0x3c,
  I64Store16 = 0x3d,
  I64Store32 = 0x3e,
  memorySize = 0x3f,
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
  I32GtS = 0x4a,
  I32GtU = 0x4b,
  I32LeS = 0x4c,
  I32LeU = 0x4d,
  I32GeS = 0x4e,
  I32GeU = 0x4f,

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
  I64GeU = 0x5a,

  F32Eq = 0x5b,
  F32Ne = 0x5c,
  F32Lt = 0x5d,
  F32Gt = 0x5e,
  F32Le = 0x5f,
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
  i32add = 0x6a,
  i32sub = 0x6b,
  i32mul = 0x6c,
  i32divS = 0x6d,
  i32divU = 0x6e,
  i32remS = 0x6f,
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
  i64ctz = 0x7a,
  i64popcnt = 0x7b,
  i64add = 0x7c,
  i64sub = 0x7d,
  i64mul = 0x7e,
  i64divS = 0x7f,
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
  i64rotr = 0x8a,

  f32abs = 0x8b,
  f32neg = 0x8c,
  f32ceil = 0x8d,
  f32floor = 0x8e,
  f32trunc = 0x8f,
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
  f64neg = 0x9a,
  f64ceil = 0x9b,
  f64floor = 0x9c,
  f64trunc = 0x9d,
  f64nearest = 0x9e,
  f64sqrt = 0x9f,
  f64add = 0xa0,
  f64sub = 0xa1,
  f64mul = 0xa2,
  f64div = 0xa3,
  f64min = 0xa4,
  f64max = 0xa5,
  f64copysign = 0xa6,

  i32wrapi64 = 0xa7,
  i32truncf32S = 0xa8,
  i32truncf32U = 0xa9,
  i32truncf64S = 0xaa,
  i32truncf64U = 0xab,
  i64extendi32S = 0xac,
  i64extendi32U = 0xad,
  i64truncf32S = 0xae,
  i64truncf32U = 0xaf,
  i64truncf64S = 0xb0,
  i64truncf64U = 0xb1,
  f32converti32S = 0xb2,
  f32converti32U = 0xb3,
  f32converti64S = 0xb4,
  f32converti64U = 0xb5,
  f32demotef64 = 0xb6,
  f64converti32S = 0xb7,
  f64converti32U = 0xb8,
  f64converti64S = 0xb9,
  f64converti64U = 0xba,
  f64promotef32 = 0xbb,
  i32reinterpretf32 = 0xbc,
  i64reinterpretf64 = 0xbd,
  f32reinterpreti32 = 0xbe,
  f64reinterpreti64 = 0xbf,

  i32extend8S = 0xc0,
  i32extend16S = 0xc1,
  i64extend8S = 0xc2,
  i64extend16S = 0xc3,
  i64extend32S = 0xc4,

  prefixedFC = 0xfc, // and prefix
  prefixedFD = 0xfd, // and prefix
}

export enum FCPrefixes { // 0xFC
  // table prefixes
  tableInit = 12, // two idxes
  elemDrop = 13,
  tableCopy = 14, //two idxes
  tableGrow = 15,
  tableSize = 16,
  tableFill = 17,

  // numeric prefixes8970
  i32truncSatF32s = 0,
  i32truncSatF32u = 1,
  i32truncSatF64s = 2,
  i32truncSatF64u = 3,
  i64truncSatF32s = 4,
  i64truncSatF32u = 5,
  i64truncSatF64s = 6,
  i64truncSatF64u = 7,
  memoryInit = 8,
  dataDrop = 9,
  memoryCopy = 10,
  memoryFill = 11,
}
export enum PrefixesVectorArgs { // vectorInst = 0xFD
  // memarg
  v128Load = 0,
  v128Load8x8S = 1,
  v128Load8x8U = 2,
  v128Load16x4S = 3,
  v128Load16x4U = 4,
  v128Load32x2S = 5,
  v128Load32x2U = 6,
  v128Load8Splat = 7,
  v128Load16Splat = 8,
  v128Load32Splat = 9,
  v128Load64Splat = 10,
  v128Store = 11,
  v128Load32Zero = 92,
  v128Load64Zero = 93,

  // memarg, laneidx
  v128Load8Lane = 84,
  v128Load16Lane = 85,
  v128Load32Lane = 86,
  v128Load64Lane = 87,
  v128Store8Lane = 88,
  v128Store16Lane = 89,
  v128Store32Lane = 90,
  v128Store64Lane = 91,

  // 16 bytes => converted into a signed integer 128 little endian
  v128Const = 12,
  // 16 bytes (laneidx immediates)
  i8x16Shuffle = 13,

  // laneidx
  i8x16ExtractLaneS = 21,
  i8x16ExtractLaneU = 22,
  i8x16ReplaceLane = 23,
  i16x8ExtractLaneS = 24,
  i16x8ExtractLaneU = 25,
  i16x8ReplaceLane = 26,
  i32x4ExtractLane = 27,
  i32x4ReplaceLane = 28,
  i64x2ExtractLane = 29,
  i64x2ReplaceLane = 30,
  f32x4ExtractLane = 31,
  f32x4ReplaceLane = 32,
  f64x2ExtractLane = 33,
  f64x2ReplaceLane = 34,
}
export enum PrefixesVector { // vectorInst = 0xFD
  // plain opcodes
  i8x16swizzle = 14,
  i8x16splat = 15,
  i16x8splat = 16,
  i32x4splat = 17,
  i64x2splat = 18,
  f32x4splat = 19,
  f64x2splat = 20,

  i8x16eq = 35,
  i8x16ne = 36,
  i8x16ltS = 37,
  i8x16ltU = 38,
  i8x16gtS = 39,
  i8x16gtU = 40,
  i8x16leS = 41,
  i8x16leU = 42,
  i8x16geS = 43,
  i8x16geU = 44,

  i16x8eq = 45,
  i16x8ne = 46,
  i16x8ltS = 47,
  i16x8ltU = 48,
  i16x8gtS = 49,
  i16x8gtU = 50,
  i16x8leS = 51,
  i16x8leU = 52,
  i16x8geS = 53,
  i16x8geU = 54,

  i32x4eq = 55,
  i32x4ne = 56,
  i32x4ltS = 57,
  i32x4ltU = 58,
  i32x4gtS = 59,
  i32x4gtU = 60,
  i32x4leS = 61,
  i32x4leU = 62,
  i32x4geS = 63,
  i32x4geU = 64,

  i64x2eq = 214,
  i64x2ne = 215,
  i64x2ltS = 216,
  i64x2gtS = 217,
  i64x2leS = 218,
  i64x2geS = 219,

  f32x4eq = 65,
  f32x4ne = 66,
  f32x4lt = 67,
  f32x4gt = 68,
  f32x4le = 69,
  f32x4ge = 70,

  f64x2eq = 71,
  f64x2ne = 72,
  f64x2lt = 73,
  f64x2gt = 74,
  f64x2le = 75,
  f64x2ge = 76,

  v128not = 77,
  v128and = 78,
  v128andnot = 79,
  v128or = 80,
  v128xor = 81,
  v128bitselect = 82,
  v128anyTrue = 83,

  i8x16abs = 96,
  i8x16neg = 97,
  i8x16popcnt = 98,
  i8x16allTrue = 99,
  i8x16bitmask = 100,
  i8x16narrowi16x8S = 101,
  i8x16narrowi16x8U = 102,
  i8x16shl = 107,
  i8x16shrS = 108,
  i8x16shrU = 109,
  i8x16add = 110,
  i8x16addSatS = 111,
  i8x16addSatU = 112,
  i8x16sub = 113,
  i8x16subSatS = 114,
  i8x16subSatU = 115,
  i8x16minS = 118,
  i8x16minU = 119,
  i8x16maxS = 120,
  i8x16maxU = 121,
  i8x16avgrU = 123,

  i16x8extaddPairwisei8x16S = 124,
  i16x8extaddPairwisei8x16U = 125,
  i16x8abs = 128,
  i16x8neg = 129,
  i16x8q15mulrSatS = 130,
  i16x8allTrue = 131,
  i16x8bitmask = 132,
  i16x8narrowi32x4S = 133,
  i16x8narrowi32x4U = 134,
  i16x8extendLowi8x16S = 135,
  i16x8extendHighi8x16S = 136,
  i16x8extendLowi8x16U = 137,
  i16x8extendHighi8x16U = 138,
  i16x8shl = 139,
  i16x8shrS = 140,
  i16x8shrU = 141,
  i16x8add = 142,
  i16x8addSatS = 143,
  i16x8addSatU = 144,
  i16x8sub = 145,
  i16x8subSayS = 146,
  i16x8subSatU = 147,
  i16x8mul = 149,
  i16x8minS = 150,
  i16x8minU = 151,
  i16x8maxS = 152,
  i16x8maxU = 153,
  i16x8avgrU = 155,
  i16x8extmulLowi8x16S = 156,
  i16x8extmulHighi8x16S = 157,
  i16x8extmulLowi8x16U = 158,
  i16x8extmulHighi8x16U = 159,

  i32x4extaddPairwisei16x8S = 126,
  i32x4extaddPairwisei16x8U = 127,
  i32x4abs = 160,
  i32x4neg = 161,
  i32x4allTrue = 163,
  i32x4bitmask = 164,
  i32x4extendLowi16x8S = 167,
  i32x4extendHighi16x8S = 168,
  i32x4extendLowi16x8U = 169,
  i32x4extendHighi16x8U = 170,
  i32x4shl = 171,
  i32x4shrS = 172,
  i32x4shrU = 173,
  i32x4add = 174,
  i32x4sub = 177,
  i32x4mul = 181,
  i32x4minS = 182,
  i32x4minU = 183,
  i32x4maxS = 184,
  i32x4maxU = 185,
  i32x4doti16x8S = 186,
  i32x4extmulLowi16x8S = 188,
  i32x4extmulHighi16x8S = 189,
  i32x4extmulLowi16x8U = 190,
  i32x4extmulHighi16x8U = 191,

  i64x2abs = 192,
  i64x2neg = 193,
  i64x2allTrue = 195,
  i64x2bitmask = 196,
  i64x2extendLowi32x4S = 199,
  i64x2extendHighi32x4S = 200,
  i64x2extendLowi32x4U = 201,
  i64x2extendHighi32x4U = 202,
  i64x2shl = 203,
  i64x2shrS = 204,
  i64x2shrU = 205,
  i64x2add = 206,
  i64x2sub = 209,
  i64x2mul = 213,
  i64x2extmulLowi32x4S = 220,
  i64x2extmulHighi32x4S = 221,
  i64x2extmulLowi32x4U = 222,
  i64x2extmulHighi32x4U = 223,

  f32x4ceil = 103,
  f32x4floor = 104,
  f32x4trunc = 105,
  f32x4nearest = 106,
  f32x4abs = 224,
  f32x4neg = 225,
  f32x4sqrt = 227,
  f32x4add = 228,
  f32x4sub = 229,
  f32x4mul = 230,
  f32x4div = 231,
  f32x4min = 232,
  f32x4max = 233,
  f32x4pmin = 234,
  f32x4pmax = 235,

  f64x2ceil = 116,
  f64x2floor = 117,
  f64x2trunc = 122,
  f64x2nearest = 148,
  f64x2abs = 236,
  f64x2neg = 237,
  f64x2sqrt = 239,
  f64x2add = 240,
  f64x2sub = 241,
  f64x2mul = 242,
  f64x2div = 243,
  f64x2min = 244,
  f64x2max = 245,
  f64x2pmin = 246,
  f64x2pmax = 247,

  i32x4truncSatf32x4S = 248,
  i32x4truncSatf32x4U = 249,
  f32x4converti32x4S = 250,
  f32x4converti32x4U = 251,
  i32x4truncSatf64x2SZero = 252,
  i32x4truncSatf64x2UZero = 253,
  f64x2convertLowi32x4S = 254,
  f64x2convertLowi32x4U = 255,
  f32x4demotef64x2Zero = 94,
  f64x2promoteLowf32x4 = 95,
}

export const singleByteInstr = new Set([0x00, 0x01, 0x0f, 0xd1, 0x1a, 0x1b]);
enumRange(0x45, 0xc4, Opcode).forEach((hex) => singleByteInstr.add(hex));

export const idxInstr = new Set([0x0c, 0x0d, 0x10, 0xd2]);
enumRange(0x20, 0x26, Opcode).forEach((hex) => idxInstr.add(hex));

export const memoryInstr = new Set(enumRange(0x28, 0x3e, Opcode));

export const numericInstr = new Set([0x41, 0x42, 0x43, 0x44]);

// Vector Instructions 0xFD
// no args
export const vectorInstrNoArgs = new Set(enumRange(14, 255, PrefixesVector));
// memarg and/or laneidx (load and store)
// memArg
export const vectorInstrMemarg = new Set(enumRange(0, 11, PrefixesVectorArgs));
vectorInstrMemarg.add(92);
vectorInstrMemarg.add(93);
// memArg and laneidx
export const vectorInstrTwoArgs = new Set(
  enumRange(84, 91, PrefixesVectorArgs),
);
// laneidx (extractlane and replacelane)
export const vectorInstrLaneidx = new Set(
  enumRange(21, 34, PrefixesVectorArgs),
);
