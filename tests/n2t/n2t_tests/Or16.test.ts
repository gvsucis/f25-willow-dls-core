import { beforeAll, test, expect } from "@jest/globals";
import { Circuit, loadCircuit } from "../../../src";
import { Nand2TetrisLoader } from "../../../src/CircuitLoader/Nand2TetrisLoader";

let circuit: Circuit;

beforeAll(async () => {
  circuit = await loadCircuit(
    Nand2TetrisLoader,
    "tests/n2t/nand_up_chips/Or16.hdl",
    "Or16",
  );
});

const truthTable = [
  ["0000000000000000", "0000000000000000", "0000000000000000"],
  ["0000000000000000", "1111111111111111", "1111111111111111"],
  ["1111111111111111", "0000000000000000", "1111111111111111"],
  ["1111111111111111", "1111111111111111", "1111111111111111"],
  ["1010101010101010", "0101010101010101", "1111111111111111"],
  ["1010101010101010", "0000000000000000", "1010101010101010"],
  ["0011110011000011", "0000111111110000", "0011111111110011"],
];

function genTest(inputs: { a: string; b: string }, output: string) {
  return () => {
    const actualOutputs = circuit.run(inputs).outputs;
    expect(actualOutputs.out.toString()).toStrictEqual(output);
  };
}

for (const row of truthTable) {
  const inputs = {
    a: row[0],
    b: row[1],
  };
  const output = row[2];

  test(
    `N2T Or16 [a = ${inputs.a}, b = ${inputs.b}] => [out = ${output}]`,
    genTest(inputs, output),
  );
}
