try {
  const buf = Buffer.from(new Uint8Array([1, 2, 3]), 'base64');
  console.log("Returned:", buf);
} catch (e: any) {
  console.log("Buffer.from error:", e.message);
}
