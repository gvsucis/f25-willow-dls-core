import { beforeAll, test, expect } from "@jest/globals";
import { Circuit, loadCircuit } from "../../../src";
import { Nand2TetrisLoader } from "../../../src/CircuitLoader/Nand2TetrisLoader";

let circuit: Circuit;

beforeAll(async () => {
  circuit = await loadCircuit(
    Nand2TetrisLoader,
    "tests/n2t/nand_up_chips/Mux16.hdl",
    "Mux16",
  );
});

const truthTable = [
  ["0000000000000000", "0000000000000000", "0", "0000000000000000"],
  ["0000000000000000", "1111111111111111", "0", "0000000000000000"],
  ["1111111111111111", "0000000000000000", "0", "1111111111111111"],
  ["1111111111111111", "1111111111111111", "0", "1111111111111111"],
  ["0000000000000000", "0000000000000000", "1", "0000000000000000"],
  ["0000000000000000", "1111111111111111", "1", "1111111111111111"],
  ["1111111111111111", "0000000000000000", "1", "0000000000000000"],
  ["1111111111111111", "1111111111111111", "1", "1111111111111111"],
  ["1010101010101010", "0101010101010101", "0", "1010101010101010"],
  ["1010101010101010", "0101010101010101", "1", "0101010101010101"],
];

function genTest(inputs: { a: string; b: string; sel: string }, output: string) {
  return () => {
    const actualOutputs = circuit.run(inputs).outputs;
    expect(actualOutputs.out.toString()).toStrictEqual(output);
  };
}

for (const row of truthTable) {
  const inputs = {
    a: row[0],
    b: row[1],
    sel: row[2],
  };
  const output = row[3];

  test(
    `N2T Mux16 [a = ${inputs.a}, b = ${inputs.b}, sel = ${inputs.sel}] => [out = ${output}]`,
    genTest(inputs, output),
  );
}
