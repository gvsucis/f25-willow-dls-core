import { expect, beforeAll, describe, test } from "@jest/globals";
import { loadProject, CircuitVerseLoader } from "../../src/index";
import * as path from "path";

let circuit: any;

beforeAll(async () => {
  const cvFile = path.join(__dirname, "Half Adder.cv");
  const project = await loadProject(CircuitVerseLoader, cvFile);
  circuit = project.getCircuitByName("Main");
});

// Generate all binary combinations for N inputs
function generateBinaryCombinations(n: number): string[][] {
  const combos: string[][] = [];
  const max = 1 << n;

  for (let i = 0; i < max; i++) {
    const bits = i.toString(2).padStart(n, "0").split("");
    combos.push(bits);
  }
  return combos;
}

// Expected half-adder behavior 
function halfAdderExpected(a: string, b: string) {
  const A = Number(a);
  const B = Number(b);
  return {
    Sum: (A ^ B).toString(),
    Carry: (A & B).toString(),
  };
}

describe("Half Adder Circuit", () => {
  const inputNames = ["input1", "input2"];
  const allInputs = generateBinaryCombinations(inputNames.length);

  test.each(allInputs)(
    "input1=%s input2=%s",
    (a, b) => {
      const expected = halfAdderExpected(a, b);
      const { outputs } = circuit.run({ input1: a, input2: b });

      expect(outputs.Sum.toString()).toBe(expected.Sum);
      expect(outputs.Carry.toString()).toBe(expected.Carry);
    }
  );
});

