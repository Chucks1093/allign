import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { base } from "wagmi/chains";
import { createConnector } from "wagmi";
import { Attribution } from "ox/erc8021";

const DATA_SUFFIX = Attribution.toDataSuffix({ codes: ["bc_fmbqk5r8"] });

const STORAGE_KEY = "allign_wallet_address";

// Pre-create the provider at page load so connect() has zero async work before
// the SDK calls window.open(). iOS Safari expires the user gesture context after
// any non-trivial await — module import + createBaseAccountSDK + getProvider
// would all run at click time otherwise, pushing window.open() outside the
// gesture window and causing keys.coinbase.com to open without window.opener
// (which shows the "Create" screen instead of connecting).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _prewarmedProvider: any = null;
if (typeof window !== "undefined") {
  import("@base-org/account")
    .then(({ createBaseAccountSDK }) => {
      const sdk = createBaseAccountSDK({ appName: "Allign" });
      _prewarmedProvider = sdk.getProvider();
    })
    .catch(() => {});
}

function getCachedAddress(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

const baseAccountConnector = createConnector((config) => ({
  id: "baseAccount",
  name: "Base Account",
  type: "baseAccount",
  icon: "https://www.base.org/favicon.ico",

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async connect(_params?: any): Promise<any> {
    // Cached address (auto-reconnect on page refresh) — restore silently, no popup
    const cached = getCachedAddress();
    if (cached) {
      const accounts = [cached as `0x${string}`] as readonly `0x${string}`[];
      config.emitter.emit("connect", { accounts, chainId: base.id });
      return { accounts, chainId: base.id };
    }

    // Fresh connect — if provider is already pre-created, skip all awaits so
    // the SDK's window.open() fires within the iOS Safari user gesture context.
    // If pre-warm failed for any reason, fall back to the full async path.
    if (!_prewarmedProvider) {
      const { createBaseAccountSDK } = await import("@base-org/account");
      _prewarmedProvider = createBaseAccountSDK({ appName: "Allign" }).getProvider();
    }

    const result = (await _prewarmedProvider.request({
      method: "wallet_connect",
      params: [{ version: "1" }],
    })) as { accounts?: Array<{ address: string }> };

    const address = result?.accounts?.[0]?.address as `0x${string}`;
    if (!address) throw new Error("No address returned");

    localStorage.setItem(STORAGE_KEY, address);
    const accounts = [address] as readonly `0x${string}`[];
    config.emitter.emit("connect", { accounts, chainId: base.id });
    return { accounts, chainId: base.id };
  },

  async disconnect() {
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
    config.emitter.emit("disconnect");
  },

  async getAccounts() {
    const address = getCachedAddress();
    return address ? [address as `0x${string}`] : [];
  },

  async getChainId() {
    return base.id;
  },

  async isAuthorized() {
    return !!getCachedAddress();
  },

  async getProvider() {
    const { createBaseAccountSDK } = await import("@base-org/account");
    const sdk = createBaseAccountSDK({ appName: "Allign" });
    return sdk.getProvider();
  },

  onAccountsChanged() {},
  onChainChanged() {},
  onDisconnect() {
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
    config.emitter.emit("disconnect");
  },
}));

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [baseAccountConnector],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [base.id]: http(),
  },
  dataSuffix: DATA_SUFFIX,
});
