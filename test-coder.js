const { BorshCoder } = require("@coral-xyz/anchor");
const IDL = {
  version: "0.1.0",
  name: "mintpass_core",
  instructions: [
    {
      name: "perform_checkin",
      discriminator: [120, 48, 197, 249, 18, 126, 237, 107],
      accounts: [],
      args: [{ name: "staff_id", type: "string" }],
    }
  ],
  accounts: [],
  types: []
};
const coder = new BorshCoder(IDL);
try {
  console.log("With staffId:", coder.instruction.encode("perform_checkin", { staffId: "123" }));
} catch (e) { console.log("Failed staffId:", e.message); }
try {
  console.log("With staff_id:", coder.instruction.encode("perform_checkin", { staff_id: "123" }));
} catch (e) { console.log("Failed staff_id:", e.message); }
