export async function flushPromises() {
  await new Promise(process.nextTick);
}
