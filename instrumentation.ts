export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { register: nodeRegister } = await import("./src/lib/instrumentation-node");
      await nodeRegister();
    } catch (error) {
      console.error("[keepsupabasealive] instrumentation failed — app may return 500 for API routes", error);
      throw error;
    }
  }
}
