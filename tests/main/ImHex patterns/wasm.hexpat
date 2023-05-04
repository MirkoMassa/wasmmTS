#include <type/leb128.pat>
#include <std/mem.pat>

enum SectionID : u8 {
	SecCustomID = 0,
	SecTypeID = 1,
	SecImportID = 2,
	SecFuncID = 3,
	SecTableID = 4,
	SecMemID = 5,
	SecGlobalID = 6,
	SecExportID = 7,
	SecStartID = 8,
	SecElemID = 9,
	SecCodeID = 10,
	SecDataID = 11,
	SecDataCountID = 12
};

enum ValueType : u8 {
	i32 = 0x7F,
	i64 = 0x7E,
	f32 = 0x7D,
	f64 = 0x7C,
	v128 = 0x7B,
	funcref = 0x70,
	externref = 0x6F,
	
};

struct SizedString<T> {
	T size;
	char value[size];
};



struct FuncType {
	u8 tag;
	
	type::LEB128 paramCount;
	ValueType params[paramCount];
	
	type::LEB128 resultCount;
	ValueType results[resultCount];
};

struct TypeSection {
	type::LEB128 count;
	FuncType types[count];
};

enum DescriptionTag : u8 {
	Function = 0,
	Table = 1,
	Memory = 2,
	Global = 3
};

enum Mutability : u8 {
    Const = 0,
    Var = 1
};

struct Limit {
	bool hasMax;
	type::LEB128 min;
	if (hasMax)
		type::LEB128 max;
};

struct Import {
	SizedString<type::LEB128> module;
	SizedString<type::LEB128> name;
	
	DescriptionTag descriptionTag;
	if (descriptionTag == DescriptionTag::Function)
		type::LEB128 typeidx;
	if (descriptionTag == DescriptionTag::Memory)
		Limit mt;
	if (descriptionTag == DescriptionTag::Table)
	   type::LEB128 tableidx;
	if (descriptionTag == DescriptionTag::Global) {
	   type::LEB128 globalidx;
	   Mutability mut;
	}
};

struct ImportSection {
	type::LEB128 count;
	Import imports[count];
};

struct FunctionSection {
	type::LEB128 count;
	type::LEB128 types[count];
};



struct MemorySection {
	type::LEB128 count;
	Limit memories[count];
};

enum Opcode : u8 {
	// Control Instructions
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
	    // Parametric instructions
    RefNull = 0xD0,
    RefIsNull = 0xD1,
    RefFunc = 0xD2,
	// Reference Instructions
	Drop = 0x1A,
	Select = 0x1B,
	SelectVec = 0x1C,
	
	// Variable Instructions
	LocalGet = 0x20,
	LocalSet = 0x21,
	LocalTee = 0x22,
	GlobalGet = 0x23,
	GlobalSet = 0x24,
	
	// Table Instructions
	TableGet = 0x25,
	TableSet = 0x26,
	
	// Memory Instructions
	I32Load = 0x28,
	I64Load = 0x29,
	F32Load = 0x2A,
	F64Load = 0x2B,
	I32Load8S = 0x2C,
	I32Load8U = 0x2D,
	I32Load16S = 0x2E,
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
	MemorySize = 0x3F,
	MemoryGrow = 0x40,
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
    
	prefixedFC = 0xFC,
	prefixedFD = 0xFD
};

enum FCOpcode : u8 {
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
    memoryCopy = 0xA,
    memoryFill = 0xB,
    tableInit = 0xC, //two idxs
    elemDrop = 0xD,
    tableCopy = 0xE, //two idxes
    tableGrow = 0xF,
    tableSize = 0x10,
    tableFill = 0x11
};

enum FDOpcode : u8 {
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
    i8x16ltU  = 38,
    i8x16gtS  = 39,
    i8x16gtU = 40,
    i8x16leS  = 41,
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
    f64x2promoteLowf32x4 = 95
};

enum EmptyType : u8 {
    Empty = 0x40
};

union BlockType {
    EmptyType empty;
    ValueType type;
    type::LEB128 index;
};

struct MemArg {
    type::LEB128 offset;
    type::LEB128 align;
};

struct Op {
    Opcode op;
    if(op == Opcode::Block || op ==  Opcode::Loop || op == Opcode::If) {
       BlockType bt;
    }
    if(op == Opcode::Br || op == Opcode::BrIf) {
        type::LEB128 labelidx;
    }
    if(op == Opcode::Call  || op == Opcode::RefFunc) {
        type::LEB128 funcidx;
    }

    if(op == Opcode::CallIndirect) {
        type::LEB128 typeidx;
        type::LEB128 tableidx;
    }

    if(op == Opcode::I32Const || op == Opcode::I64Const) {
        type::LEB128 val;
    }
    if(op == Opcode::F32Const) {
        float val;
    }

    if(op == Opcode::F64Const) {
        double val;
    }

    if(op == Opcode::LocalGet || 
    op == Opcode::LocalSet || 
    op == Opcode::LocalTee ||
    op == Opcode::GlobalGet ||
    op == Opcode::GlobalSet ||
    op == Opcode::TableGet ||
    op == Opcode::TableSet) {
        type::LEB128 arg;
    }

    if(op == Opcode::I32Load ||
    op == Opcode::I64Load ||
	op == Opcode::F32Load ||
	op == Opcode::F64Load ||
	op == Opcode::I32Load8S ||
	op == Opcode::I32Load8U ||
	op == Opcode::I32Load16S ||
	op == Opcode::I32Load16U ||
	op == Opcode::I64Load8S ||
	op == Opcode::I64Load8U ||
	op == Opcode::I64Load16S ||
	op == Opcode::I64Load16U ||
	op == Opcode::I64Load32S ||
	op == Opcode::I64Load32U ||
	op == Opcode::I32Store ||
	op == Opcode::I64Store ||
	op == Opcode::F32Store ||
	op == Opcode::F64Store ||
	op == Opcode::I32Store8 ||
	op == Opcode::I32Store16 ||
	op == Opcode::I64Store8 ||
	op == Opcode::I64Store16 ||
	op == Opcode::I64Store32) {
        MemArg memarg [[inline]];
    }

    if (op == Opcode::prefixedFC) {
        FCOpcode fcop;
        if(fcop == FCOpcode::memoryInit ||
        fcop == FCOpcode::dataDrop ||
        fcop == FCOpcode::memoryCopy ||
        fcop == FCOpcode::memoryFill ||
        fcop == FCOpcode::tableInit ||
        fcop == FCOpcode::elemDrop ||
        fcop == FCOpcode::tableCopy ||
        fcop == FCOpcode::tableGrow ||
        fcop == FCOpcode::tableSize ||
        fcop == FCOpcode::tableFill
        ) {
            type::LEB128 idx;
        }
        if(
        fcop == FCOpcode:: tableInit ||
        fcop == FCOpcode:: tableCopy
        ) {
            type::LEB128 idy;
        }
    }
    if (op == Opcode::prefixedFD) {
        FDOpcode fdop;
        if (fdop >= 0x80) {
            u8 fdfinal;
        }
    }
};

struct Instruction {
	Op opcode;
	if (opcode.op == Opcode::End)
		break;
};

struct Global {
	ValueType type;
	bool mutable;
	
	Instruction initCode[while(true)];
};

struct GlobalSection {
	type::LEB128 count;
	Global globals[count];
};

struct Export {
	SizedString<type::LEB128> name;
	DescriptionTag tag;
	type::LEB128 idx;
};

struct ExportSection {
	type::LEB128 count;
	Export exports[count];
};

struct TableType {
    ValueType reftype;
    Limit limits;
};

struct TableSection {
    type::LEB128 count;
    TableType tables[count];
};

struct DataCountSection {
    type::LEB128 count;
};

struct Local {
    type::LEB128 count;
    ValueType types;
};

struct Func {
    type::LEB128 count;
    Local locals[count];
    Instruction expr[while(true)];
};

struct Code {
    type::LEB128 size;
    type::LEB128 localCount;
    Local locals[localCount];
    //Instruction expr[while(true)];
    Op code[while(size-($-addressof(this)) >= 0)] [[inline]];
    //u8 code[size];
    //Func code;
};



struct CodeSection {
    type::LEB128 count;
    Code code[count];
};

struct Section {
	SectionID id;
	type::LEB128 size;
	
	if (id == SectionID::SecTypeID)
		TypeSection typeSection [[inline]];
	else if (id == SectionID::SecImportID)
		ImportSection importSection [[inline]];
	else if (id == SectionID::SecFuncID)
		FunctionSection functionSection [[inline]];
    else if (id == SectionID::SecTableID)
		TableSection tableSection [[inline]];
	else if (id == SectionID::SecMemID)
		MemorySection memorySection [[inline]];
	else if (id == SectionID::SecGlobalID)
		GlobalSection globalSection [[inline]];
	else if (id == SectionID::SecExportID)
		ExportSection exportSection [[inline]];
	else if (id == SectionID::SecDataCountID)
		DataCountSection dataCountSection [[inline]];
	else if (id == SectionID::SecCodeID)
	   CodeSection codeSection [[inline]];
	else
		u8 bytes[size];
};

struct WASM {
	char magic[4];
	u32 version;
	Section section[while(!std::mem::eof())];
};

WASM wasm @ 0x00;








