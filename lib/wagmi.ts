import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { base } from "wagmi/chains";
import { createConnector } from "wagmi";
import { Attribution } from "ox/erc8021";

const DATA_SUFFIX = Attribution.toDataSuffix({ codes: ["bc_fmbqk5r8"] });

const PRIVY_STORAGE_KEY = "allign_privy_address";

// Holds the Privy embedded wallet's EIP-1193 provider, set by AuthSync after login.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _privyProvider: any = null;
let _privyAddress: string | null = null;

export function setPrivyWalletProvider(provider: unknown, address: string) {
  _privyProvider = provider;
  _privyAddress = address;
  if (typeof window !== "undefined") {
    localStorage.setItem(PRIVY_STORAGE_KEY, address);
  }
}

export function clearPrivyWalletProvider() {
  _privyProvider = null;
  _privyAddress = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(PRIVY_STORAGE_KEY);
  }
}

function getCachedPrivyAddress(): string | null {
  if (typeof window === "undefined") return null;
  return _privyAddress ?? localStorage.getItem(PRIVY_STORAGE_KEY);
}

const privyEmbeddedConnector = createConnector((config) => ({
  id: "privyEmbedded",
  name: "Privy",
  type: "privyEmbedded",

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async connect(_params?: any): Promise<any> {
    const address = getCachedPrivyAddress();
    if (!address) throw new Error("No Privy wallet connected");
    const accounts = [address as `0x${string}`] as readonly `0x${string}`[];
    config.emitter.emit("connect", { accounts, chainId: base.id });
    return { accounts, chainId: base.id };
  },

  async disconnect() {
    clearPrivyWalletProvider();
    config.emitter.emit("disconnect");
  },

  async getAccounts() {
    const address = getCachedPrivyAddress();
    return address ? [address as `0x${string}`] : [];
  },

  async getChainId() {
    return base.id;
  },

  async isAuthorized() {
    return !!getCachedPrivyAddress();
  },

  async getProvider() {
    if (!_privyProvider) throw new Error("Privy provider not available");
    return _privyProvider;
  },

  onAccountsChanged() {},
  onChainChanged() {},
  onDisconnect() {
    clearPrivyWalletProvider();
    config.emitter.emit("disconnect");
  },
}));

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [privyEmbeddedConnector],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [base.id]: http(),
  },
  dataSuffix: DATA_SUFFIX,
});
