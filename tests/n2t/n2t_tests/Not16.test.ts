import { beforeAll, test, expect } from "@jest/globals";
import { Circuit, loadCircuit } from "../../../src";
import { Nand2TetrisLoader } from "../../../src/CircuitLoader/Nand2TetrisLoader";

let circuit: Circuit;

beforeAll(async () => {
  circuit = await loadCircuit(
    Nand2TetrisLoader,
    "tests/n2t/nand_up_chips/Not16.hdl",
    "Not16",
  );
});

const truthTable = [
  ["0000000000000000", "1111111111111111"],
  ["1111111111111111", "0000000000000000"],
  ["1010101010101010", "0101010101010101"],
  ["0101010101010101", "1010101010101010"],
  ["0011110011000011", "1100001100111100"],
];

function genTest(input: string, output: string) {
  return () => {
    const actualOutputs = circuit.run({ in: input }).outputs;
    if (!actualOutputs.out) {
      throw new Error(`Output 'out' is null. Available outputs: ${Object.keys(actualOutputs).join(', ')}. Values: ${JSON.stringify(actualOutputs)}`);
    }
    expect(actualOutputs.out.toString()).toStrictEqual(output);
  };
}

for (const row of truthTable) {
  const input = row[0];
  const output = row[1];

  test(`N2T Not16 [in = ${input}] => [out = ${output}]`, genTest(input, output));
}
