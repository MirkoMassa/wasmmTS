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
  // trashy debug just to see if it works
// console.log(decodeUnsignedLeb128(new Uint8Array([0x17])))
// console.log(decodeUnsignedLeb128(new Uint8Array([0xE5, 0x8E, 0x26])))
// console.log(0b10011000011101100101);
// console.log(decodeUnsignedLeb128(new Uint8Array([0xE5, 0x8E, 0xE5])))
                                                     // 624485 
// console.log(decodeUnsignedLeb128(new Uint8Array([0x19, 0x04])))
// console.log(decodeUnsignedLeb128(new Uint8Array([0x50, 0x01, 0x4E, 0x00])))