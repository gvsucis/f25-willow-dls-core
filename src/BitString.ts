/*
 * Copyright (c) 2025 Jordan Bancino <jordan@bancino.net>
 * Copyright (c) 2025 Austin Hargis <hargisa@mail.gvsu.edu>
 * Copyright (c) 2025 Aaron MacDougall <macdouaa@mail.gvsu.edu>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

type Bit = "0" | "1";
type BinaryString = string & { __binaryString: true };

function isBinaryString(str: string): str is BinaryString {
  return /^[01]+$/.test(str);
}

function isHexString(str: string): boolean {
  return /^0x[abcdef0123456789]+$/.test(str.toLowerCase());
}

function hexToBinary(str: string): BinaryString {
  const hexMap: Record<string, string> = {
    "0": "0000",
    "1": "0001",
    "2": "0010",
    "3": "0011",
    "4": "0100",
    "5": "0101",
    "6": "0110",
    "7": "0111",
    "8": "1000",
    "9": "1001",
    a: "1010",
    b: "1011",
    c: "1100",
    d: "1101",
    e: "1110",
    f: "1111",
  };

  let result = str
    .slice(2)
    .toLowerCase()
    .split("")
    .map((c) => hexMap[c])
    .join("")
    .replace(/^0+/, "");

  if (result == "") {
    result = "0";
  }

  return result as BinaryString;
}

function forBit(
  str: string,
  func: (b: string, i: number) => string
): BinaryString {
  const result = str.split("").map(func).join("");

  if (isBinaryString(result)) {
    return result;
  } else {
    throw new Error(`Not a binary string: '${str}'`);
  }
}

/**
 * This class stores an arbitrary yet fixed-width collection of bits which
 * are sent to {@link CircuitElement}s via {@link CircuitBus}es. Bit strings
 * are immutable, but this class provides a number of useful functions for
 * performing operations with bit strings. Indeed, most of the functionality
 * of an ALU is actually implemented here, not in a dedicate ALU circuit
 * element, making it easy to implement other types of ALUs with ease.
 *
 * The reason this class exists is to bypass entirely the JavaScript `number`
 * data type for sending bits through the circuit simulation, because `number`
 * imposes restrictions on how values can be interpreted, as well as the size
 * of values. `BitString` imposes no such limitations; there is no practical
 * size limit of a bit string.
 *
 * Additionally, bit strings are useful for interpreting a collection of bits
 * as either a signed or an unsigned number. Since JavaScript has no concept of
 * an unsigned number, it can be difficult to interpret results. This class
 * takes care of translating the bits in the string into either a positive or
 * a potentially negative JavaScript `number` automatically, subject, of course,
 * to the aforementioned limitations of `number`.
 */
export class BitString {
  /**
   * Create a bit string that is composed entirely of `1`s and is the given width.
   * @param width The width of the bit string which should have all bits set high.
   */
  static high(width: number = 1): BitString {
    return new BitString("1".repeat(width));
  }

  /**
   * Create a bit string that is composed entirely of `0`s and is the given width.
   * @param width The width of the bit string which should have all bits set low.
   */
  static low(width: number = 1): BitString {
    return new BitString("0".repeat(width));
  }

  /**
   * Create a bit string from an integer
   * @param value: the integer
   * @param width: the desired width of the bit string. (See the constructor for details
   * of how width is used.) Width is required for negative values.
   */
  static make(value: number, width: number = 0) {
    if (value >= 0) {
      return new BitString(value.toString(2), width);
    } else {
      if (width == 0) { 
          throw new Error(`Width is required when creating a BitString for a negative value.`);
      }
      const bs = new BitString((-1 * value).toString(2), width);
      return bs.twosCompliment();
    }
  }

  /**
   * Create a random bit string of the specified width, where bits are toggled
   * randomly using `Math.random()`.
   *
   * > [!WARNING]
   * > `Math.random()` is not cryptographically secure. I can't imagine a
   * > scenario in which that would matter to a circuit simulation engine, because
   * > surely you aren't doing cryptography in an educational digital logic simulator,
   * > right? Nonetheless, keep in mind that the random numbers produced by this
   * > function have all of the same flaws as (or perhaps more flaws than)
   * > `Math.random()`.
   * @param width
   * @returns
   */
  static rand(width: number = 1): BitString {
    return new BitString(
      "0"
        .repeat(width)
        .split("")
        .map((c) => (Math.random() < 0.5 ? "1" : "0"))
        .join("")
    );
  }

  #str: BinaryString;

  /**
   * Construct a new bit string from a native JavaScript string, optionally fixing the
   * width of the string without having to specify all of the bits.
   * @param str A bit string, which can be specified in one of two ways:
   * - As a binary string consisting of only `0`s and `1`s. This is most useful for
   * creating bit strings with short lengths.
   * - As a hexadecimal string consisting of the prefix `0x` and then hexadecimal
   * characters. This is most useful for creating bit strings with longer lengths.
   * @param width An optional width specifier that fixes the width of the bit string
   * to this value. If it is not provided, the width is determine automatically based
   * on how many bits were provided in `str`. If it _is_ specified, one of three things
   * can happen:
   * - The width exactly matches that of `str`: it is simply redundant,
   * but still helpful for the sake of clarity.
   * - The width is greater than that of `str`: `str` will be padded with zero bits
   * to match the specified width.
   * - The width is less than that of `str`: `str` will be truncated to only `width` least
   * significant bits, discarding the upper bits.
   */
  constructor(str: string, width: number = 0) {

    if (width < 0) {
      throw new Error("BitString width may not be negative");
    }

    if (isBinaryString(str)) {
      this.#str = str;
    } else if (isHexString(str)) {
      this.#str = hexToBinary(str);
    } else {
      throw new Error(`Not a hex or binary string: '${str}'`);
    }

    // If a fixed width was provided, we ensure that the bit width
    // is exactly that wide  by padding or truncating the bit
    // string.
    if (width) {
      if (this.getWidth() > width) {
        this.#str = this.truncate(width).#str;
      } else if (this.getWidth() < width) {
        this.#str = this.pad(width).#str;
      }
    }
  }

  /**
   * Negate all of the bits in this bit string, performing the operation `~A`
   * where `A` is the bit string this method is called on.
   * @returns A new bit string which is the the bitwise negation of this one.
   */
  not(): BitString {
    return new BitString(forBit(this.#str, (c) => (c === "0" ? "1" : "0")));
  }

  /**
   * Add two bit strings together, performing the operationg `A + B` where `A` is
   * the bit string this method is called on, and `B` is the passed parameter.
   * @param str The bit string to add to this one.
   * @returns A new bit string which is the sum of the two operands.
   */
  add(str: BitString | string): BitString {
    if (typeof str === "string") {
      str = new BitString(str);
    }

    if (str.getWidth() != this.getWidth()) {
      throw new Error(
        `Cannot ADD bit strings: width mismatch: ${str.getWidth()} != ${this.getWidth()}`
      );
    }

    let carry: Bit = "0";
    let result = [...this.#str];

    const map: Record<string, Bit[]> = {
      // Add: [result, carry]
      "000": ["0", "0"],
      "001": ["1", "0"],
      "010": ["1", "0"],
      "011": ["0", "1"],
      "100": ["1", "0"],
      "101": ["0", "1"],
      "110": ["0", "1"],
      "111": ["1", "1"],
    };

    for (let i = result.length - 1; i >= 0; i--) {
      const key: string = `${this.#str[i]}${str.#str[i]}${carry}`;
      const r: Bit[] = map[key];

      result[i] = r[0];
      carry = r[1];
    }

    return new BitString(result.join(""));
  }

  /**
   * Bitwise AND two bit strings together, performing the operationg `A & B` where `A` is
   * the bit string this method is called on, and `B` is the passed parameter.
   * @param str The bit string to AND with this one.
   * @returns A new bit string which is the bitwise AND of the two operands.
   */
  and(str: BitString | string): BitString {
    if (typeof str === "string") {
      str = new BitString(str);
    }

    if (str.getWidth() != this.getWidth()) {
      throw new Error(
        `Cannot AND bit strings: width mismatch: ${str.getWidth()} != ${this.getWidth()}`
      );
    }

    return new BitString(
      forBit(str.toString(), (_, i) =>
        str.#str[i] == "1" && this.#str[i] == "1" ? "1" : "0"
      )
    );
  }

  /**
   * Bitwise OR two bit strings together, performing the operationg `A | B` where `A` is
   * the bit string this method is called on, and `B` is the passed parameter.
   * @param str The bit string to OR with this one.
   * @returns A new bit string which is the bitwise OR of the two operands.
   */
  or(str: BitString | string): BitString {
    if (typeof str === "string") {
      str = new BitString(str);
    }

    if (str.getWidth() != this.getWidth()) {
      throw new Error(
        `Cannot OR bit strings: width mismatch: ${str.getWidth()} != ${this.getWidth()}`
      );
    }

    return new BitString(
      forBit(str.toString(), (_, i) =>
        str.#str[i] == "1" || this.#str[i] == "1" ? "1" : "0"
      )
    );
  }

  /**
   * Compute the two's compliment of the given bit string.
   *
   * > [!NOTE]
   * > The naive algorithm for
   * > implementing two's compliment is to invert all of the bits and then add one.
   * > In other words, perform the operation `~A + 1`. This method implements
   * > the two's compliment in this manner by using {@link not} and {@link add}.
   * > This may not be the most computationally efficient way to implement
   * > this functionality.
   *
   * @returns A new bit string which is the two's compliment of this bit
   * string.
   */
  twosCompliment(): BitString {
    // Twos compliment is implemented by flipping all the bits
    // then adding one.
    return this.not().add(new BitString("1", this.getWidth()));
  }

  /**
   * Subtract two bit strings, performing the operationg `A - B` where `A` is
   * the bit string this method is called on, and `B` is the passed parameter.
   *
   * > [!NOTE]
   * > The naive algorithm for implementing subtraction in digital logic is to
   * > add the two's compliment of the second operand. This method implements
   * > subtraction in this manner by using {@link twosCompliment} and {@link add},
   * > which may not be the most computationally efficient way to implement
   * > this functionality.
   *
   * @param str The bit string to subtract from this one.
   * @returns A new bit string which is the difference between the two operands.
   */
  sub(str: BitString | string): BitString {
    if (typeof str === "string") {
      str = new BitString(str);
    }

    return this.add(str.twosCompliment());
  }

  /**
   * All bit strings have a fixed width. This method returns the fixed width
   * of the bit string.
   * @returns The number of bits which make up this bit string.
   */
  getWidth(): number {
    return this.#str.length;
  }

  /**
   * Convert this bit string to a native JavaScript string.
   * @param radix The radix to use to convert the bit string to a native string.
   * Bit strings are stored internally as binary, regardless of whether they were
   * instantiated with binary or hexadecimal. By default, the `radix` is `2`, so
   * the internal binary representation can be returned immediately. However,
   * if you specify `16` as the `radix`, you can get a hexadecimal string back.
   * > [!NOTE] Only radices `2` and `16` are supported. All other values for the
   * > `radix` will throw an exception.
   * @returns A JavaScript string.
   */
  toString(radix: number = 2): string {
    if (radix == 2) {
      return this.#str;
    } else if (radix == 16) {
      let result = "";
      // Make the length of the binary string a multiple of 4 by padding at the start
      let paddedStr = this.#str as string;
      const paddingLength = 4 - (this.#str.length % 4);
      if (paddingLength !== 4) {
        paddedStr = "0".repeat(paddingLength) + this.#str;
      }

      // Process every 4 bits and convert to hexadecimal
      for (let i = 0; i < paddedStr.length; i += 4) {
        let slice = paddedStr.slice(i, i + 4);
        result += parseInt(slice, 2).toString(16).toUpperCase();
      }

      return "0x" + result;
    } else {
      // TODO: Support arbitrary radices.
      throw new Error(
        `Unsupported radix: ${radix}. Only 2 and 16 are supported.`
      );
    }
  }

  /**
   * The same as calling {@link toString} with no parameters. This is simply to make
   * JavaScript happy when it wants to serialize objects as JSON.
   * @returns The result of {@link toString}().
   */
  toJSON(): string {
    return this.toString();
  }

  /**
   * Interpret this bit string as a signed number, assuming it is stored in
   * two's compliment form.
   *
   * > [!WARNING]
   * > The behavior of this function depends on that of JavaScript's `parseInt()`
   * > and on the maximum size of `number`s in JavaScript.
   * > If the bit string is too large to be properly processed by `parseInt()`,
   * > undefined behavior will result. Consult the `parseInt()` documentation for
   * > its failure modes.
   * @returns A signed JavaScript number.
   */
  toSigned(): number {
    const negative = this.#str[0] === "1";

    if (negative) {
      return -this.twosCompliment().toUnsigned();
    } else {
      return this.toUnsigned();
    }
  }

  /**
   * Interpret this bit string as an unsigned number.
   *
   * > [!WARNING]
   * > The behavior of this function depends on that of JavaScript's `parseInt()`
   * > and on the maximum size of `number`s in JavaScript.
   * > If the bit string is too large to be properly processed by `parseInt()`,
   * > undefined behavior will result. Consult the `parseInt()` documentation for
   * > its failure modes.
   * @returns An unsigned JavaScript number.
   */
  toUnsigned(): number {
    return parseInt(this.#str, 2);
  }

  /**
   * Determine if two bit strings are equal in value and in length.
   * Bit strings are only equal if their lengths are identical and all of
   * their bits match.
   * @param str The bit string to compare to. If `null` is provided, the result
   * is always `false`.
   * @returns Whether or not the two bit strings are equal.
   */
  equals(str: BitString | string | null): boolean {
    if (!str) {
      return false;
    }

    if (typeof str === "string") {
      str = new BitString(str);
    }
    return str.#str == this.#str;
  }

  /**
   * Determine if this bit string is greater than another one, performing the
   * operation `A > B` where `A` is
   * the bit string this method is called on, and `B` is the passed parameter.
   *
   * > [!NOTE]
   * > The naive method for determining `A > B` in two's compliment is to
   * > perform `A - B` and then
   * > check that the most significant bit is 0. If it is, then `A > B`.
   * > This method implements this functionality in this manner, using
   * > {@link sub}, {@link msb}, and {@link equals}, which may not be the
   * > most computationally efficient implementation.
   *
   * @param str The bit string to compare to this one.
   * @returns Whether or not this bit string is greater than the given one.
   */
  greaterThan(str: BitString | string | null): boolean {
    if (!str) {
      return false;
    }

    if (typeof str === "string") {
      str = new BitString(str);
    }

    return this.sub(str).msb(1).equals("0");
  }

  /**
   * Determine if this bit string is less than another one, performing the
   * operation `A < B` where `A` is
   * the bit string this method is called on, and `B` is the passed parameter.
   *
   * > [!NOTE]
   * > The naive method for determining `A < B` in two's compliment is to
   * > perform `A - B` and then
   * > check that the most significant bit is 1. If it is, then `A < B`.
   * > This method implements this functionality in this manner, using
   * > {@link sub}, {@link msb}, and {@link equals}, which may not be the
   * > most computationally efficient implementation.
   *
   * @param str The bit string to compare to this one.
   * @returns Whether or not this bit string is less than the given one.
   */
  lessThan(str: BitString | string | null): boolean {
    if (!str) {
      return false;
    }

    if (typeof str === "string") {
      str = new BitString(str);
    }

    return this.sub(str).msb(1).equals("1");
  }

  /**
   * Truncate this bit string, taking either the most significant `length` bits
   * or the least significant `length` bits.
   * @param length How many bits to truncate this bit string to. If this is greater
   * than or equal to the length of this bit string, then the whole string is returned.
   * @param upper Whether or not the upper bits should be grabbed or the lower bits
   * should be grabbed.
   * @returns A new bit string which is the truncation of this one.
   */
  truncate(length: number, upper: boolean = false): BitString {
    if (length >= this.getWidth()) {
      return this;
    }

    let slice: string;
    if (upper) {
      slice = this.#str.substring(0, length);
    } else {
      slice = this.#str.substring(this.getWidth() - length);
    }

    return new BitString(slice);
  }

  /**
   * Pad this bit string, adding significant bits which are `0` (low) until
   * the string is the given length.
   * @param width How many bits to truncate this bit string to. If this is less than or
   * equal to the length of this bit string, then the whole string is returned.
   * @returns A bit string which has been padded with leading zero bits until it is
   * the specified width.
   */
  pad(width: number): BitString {
    if (width <= this.getWidth()) {
      return this;
    }

    return new BitString(this.#str.toString().padStart(width, "0"));
  }

  /**
   * Extract a portion of the bit string, exactly like JavaScript's `String.substring()`.
   * In fact, this method uses `String.substring()` to implement this functionality.
   * @param start The starting index of the bits to extract.
   * @param end The ending index of the bits to extract.
   * @returns A new bit string representing the specified subset of this one.
   */
  substring(start: number, end?: number): BitString {
    return new BitString(this.#str.substring(start, end));
  }

  /**
   * Return a slice of a bit string using logical positions as opposed to string indexes.
   * (Notice that the most significant bit is stored at string index 0, rather than the
   * least significant bit.)
   * @param start starting logical bit position (position 0 is the least significant bit)
   * @param end  ending logical bit position (exclusive)
   * @returns a new BitString representing the requested slice of this one.
   */
  bitSlice(start: number, end?: number): BitString {
    const len = this.#str.length;

    // Default end to full length (like substring)
    const e = end ?? len;

    // Convert logical bit positions (LSB = 0) to actual string indices (MSB = 0).
    const actualStart = len - e; // corresponds to logical 'end'
    const actualEnd = len - start; // corresponds to logical 'start'

    const slice = this.#str.substring(actualStart, actualEnd);
    return new BitString(slice);
  }

  /**
   * A shortcut for {@link truncate} that extracts the `n` most significant bits from
   * the bit string.
   * @param n How many most significant bits to grab.
   * @returns A new bit string which represents the most significant `n` bits of this
   * bit string.
   */
  msb(n: number): BitString {
    return this.truncate(n, true);
  }

  /**
   * A shortcut for {@link truncate} that extracts the `n` least significant bits from
   * the bit string.
   * @param n How many least significant bits to grab.
   * @returns A new bit string which represents the least sigificant `n` bits of this
   * bit string.
   */
  lsb(n: number): BitString {
    return this.truncate(n, false);
  }
}
