import { updateOrganizerProfileInDb } from "./src/app/actions/organizer";
async function run() {
  const res = await updateOrganizerProfileInDb("test-wallet-123", {
    name: "Test",
    category: "Otro",
    bio: "Test bio that is long enough to pass zod",
    supportEmail: "test@test.com",
    internalPhone: "+1234567890"
  });
  console.log(res);
}
run();
