import { BaseError, encodeErrorResult } from "viem";
import { describe, expect, it } from "vitest";
import { explainError } from "./errors";

const errorString = [{ type: "error", name: "Error", inputs: [{ name: "message", type: "string" }] }] as const;

function revertWith(message: string) {
  const data = encodeErrorResult({ abi: errorString, errorName: "Error", args: [message] });
  return new BaseError("Execution reverted.", { cause: Object.assign(new Error("execution reverted"), { data }) });
}

describe("explainError", () => {
  it("maps MUSD's revert strings when they arrive as encoded Error(string) data", () => {
    expect(explainError(revertWith("TroveManager: Unable to redeem any amount"))).toBe("Nothing can be redeemed at this size. Change the amount.");
  });

  it("shows an unknown revert string instead of the bare word Error", () => {
    expect(explainError(revertWith("BorrowerOperations: something new"))).toBe("The contract refused this: BorrowerOperations: something new.");
  });
});
