import { createPublicClient, encodeFunctionData, http, type WalletClient, concat } from "viem";
import { base } from "viem/chains";
import { Attribution } from "ox/erc8021";

const DATA_SUFFIX = Attribution.toDataSuffix({ codes: ["bc_fmbqk5r8"] });

const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_GIFT_ESCROW_ADDRESS as `0x${string}`;

const APPROVE_ABI = [{
  name: "approve", type: "function", stateMutability: "nonpayable",
  inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
  outputs: [{ name: "", type: "bool" }],
}] as const;

const DEPOSIT_ABI = [{
  name: "deposit", type: "function", stateMutability: "nonpayable",
  inputs: [
    { name: "giftId", type: "bytes32" },
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "releaseAt", type: "uint256" },
  ],
  outputs: [],
}] as const;

// UUID (16 bytes) → bytes32 (right-padded with zeros)
export function uuidToBytes32(uuid: string): `0x${string}` {
  const hex = uuid.replace(/-/g, "");
  return `0x${hex.padEnd(64, "0")}` as `0x${string}`;
}

export async function depositGift({
  walletClient,
  address,
  giftId,
  tokenContract,
  amount,
  releaseAt = 0n,
  onStatus,
}: {
  walletClient: WalletClient;
  address: `0x${string}`;
  giftId: string;
  tokenContract: `0x${string}`;
  amount: number;
  releaseAt?: bigint;
  onStatus: (msg: string) => void;
}): Promise<string> {
  const publicClient = createPublicClient({ chain: base, transport: http() });
  const rawAmount = BigInt(Math.round(amount * 1e8));
  const giftIdBytes32 = uuidToBytes32(giftId);

  // Switch to Base if needed
  const chainId = await walletClient.getChainId();
  if (chainId !== base.id) {
    onStatus("Switching to Base…");
    await walletClient.switchChain({ id: base.id });
  }

  // Try atomic batch first (Base Smart Wallet supports EIP-5792)
  // This shows a single popup for both approve + deposit
  const provider = await walletClient.transport.request?.bind(walletClient.transport) as any;

  try {
    onStatus("Approve & deposit in one step…");

    const approveData = encodeFunctionData({
      abi: APPROVE_ABI,
      functionName: "approve",
      args: [ESCROW_ADDRESS, rawAmount],
    });

    const depositData = encodeFunctionData({
      abi: DEPOSIT_ABI,
      functionName: "deposit",
      args: [giftIdBytes32, tokenContract, rawAmount, releaseAt],
    });

    // wallet_sendCalls batches both into one user interaction
    const batchResult = await walletClient.request({
      method: "wallet_sendCalls" as any,
      params: [{
        version: "1.0",
        chainId: `0x${base.id.toString(16)}`,
        from: address,
        calls: [
          { to: tokenContract, data: approveData },
          { to: ESCROW_ADDRESS, data: concat([depositData, DATA_SUFFIX]) },
        ],
      }],
    });

    // wallet_sendCalls returns a batch id — poll for receipt
    onStatus("Confirming…");
    const batchId = batchResult as string;

    // Poll for batch completion
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const status = await walletClient.request({
        method: "wallet_getCallsStatus" as any,
        params: [batchId],
      }) as any;

      if (status?.status === "CONFIRMED") {
        const depositReceipt = status.receipts?.[status.receipts.length - 1];
        return depositReceipt?.transactionHash ?? batchId;
      }
      if (status?.status === "FAILED") throw new Error("Batch transaction failed");
    }
    throw new Error("Batch transaction timed out");

  } catch (batchErr: any) {
    // Fallback: sequential approve + deposit (for wallets that don't support batching)
    if (!batchErr?.message?.includes("timed out") && !batchErr?.message?.includes("failed")) {
      onStatus("Approving token spend…");
      const approveHash = await walletClient.writeContract({
        address: tokenContract,
        abi: APPROVE_ABI,
        functionName: "approve",
        args: [ESCROW_ADDRESS, rawAmount],
        account: address,
        chain: base,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      onStatus("Depositing into escrow…");
      const depositHash = await walletClient.writeContract({
        address: ESCROW_ADDRESS,
        abi: DEPOSIT_ABI,
        functionName: "deposit",
        args: [giftIdBytes32, tokenContract, rawAmount, releaseAt],
        account: address,
        chain: base,
      });
      await publicClient.waitForTransactionReceipt({ hash: depositHash });

      return depositHash;
    }
    throw batchErr;
  }
}
