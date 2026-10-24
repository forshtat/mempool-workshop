import { StepError } from "./output.js";

export async function rpc(url: string, method: string, params: unknown[] = []): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
  } catch (e) {
    throw new StepError("RPC_UNREACHABLE", `Cannot reach ${url}: ${(e as Error).message}`, {
      hint: "check your network, or whether the devnet was reset or is down (see README)",
    });
  }
  let body: any;
  try {
    body = await res.json();
  } catch {
    throw new StepError("RPC_BAD_RESPONSE", `${url} answered HTTP ${res.status} without JSON`, { hint: "the devnet may be restarting" });
  }
  if (body.error) {
    const hint = body.error.code === -32601 ? `${url} does not implement ${method}; check gatewayUrl in workshop.config.json5` : undefined;
    throw new StepError(`RPC_${body.error.code}`, body.error.message, { hint });
  }
  return body.result;
}
