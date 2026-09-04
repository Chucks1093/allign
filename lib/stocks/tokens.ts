export interface Stock {
  name: string;
  ticker: string;       // e.g. "NVDA"
  tokenTicker: string;  // e.g. "NVDAc"
  contract: `0x${string}`;
  feedAddress: `0x${string}`;
  logo: string;         // emoji fallback for now
}

export const STOCKS: Stock[] = [
  {
    name: "NVIDIA",
    ticker: "NVDA",
    tokenTicker: "NVDAc",
    contract: "0xb20000000000000000000078ee7ce2fE4908108C",
    feedAddress: "0x04689a41629776563E6822F76f2e57D148d28513",
    logo: "🟢",
  },
  {
    name: "Apple",
    ticker: "AAPL",
    tokenTicker: "AAPLc",
    contract: "0xb200000000000000000000C2e324d24d7eEcd1fb",
    feedAddress: "0x787f13dEa48Db0897CbCDD985de77809D837F988",
    logo: "🍎",
  },
  {
    name: "Meta",
    ticker: "META",
    tokenTicker: "METAc",
    contract: "0xb2000000000000000000008bC8786B856E61707C",
    feedAddress: "0x6526aE6797A76123638b863AeE4dD27Ba4E4b27D",
    logo: "🔵",
  },
  {
    name: "Alphabet",
    ticker: "GOOGL",
    tokenTicker: "GOOGLc",
    contract: "0xb2000000000000000000002D0BA3164cc74f58B7",
    feedAddress: "0x5bF49E0ffA937CE2FfF033c739aD7C634c4D34F2",
    logo: "🔴",
  },
  {
    name: "Amazon",
    ticker: "AMZN",
    tokenTicker: "AMZNc",
    contract: "0xb200000000000000000000d9192b6B456483C2E8",
    feedAddress: "0x06A8E4b3aBB3B7543d8396FB2B763d22820cB295",
    logo: "📦",
  },
  {
    name: "Microsoft",
    ticker: "MSFT",
    tokenTicker: "MSFTc",
    contract: "0xB200000000000000000000Ab99cFa739E253872B",
    feedAddress: "0xeB10A6c9aa7E537aEd766C08c35Dae35B321b18c",
    logo: "🪟",
  },
  {
    name: "Tesla",
    ticker: "TSLA",
    tokenTicker: "TSLAc",
    contract: "0xb2000000000000000000001e800a7f5189430cD0",
    feedAddress: "0xFaf869185383a24F8cb00e27BdA6b63B9905DCb4",
    logo: "⚡",
  },
  {
    name: "Coinbase",
    ticker: "COIN",
    tokenTicker: "COINc",
    contract: "0xb200000000000000000000c85a31389D71F3ecfb",
    feedAddress: "0x408e44f504A7371a345F03a73dDC96A4b48e8aa7",
    logo: "🔷",
  },
  {
    name: "MicroStrategy",
    ticker: "MSTR",
    tokenTicker: "MSTRc",
    contract: "0xb2000000000000000000004884b426556b92883d",
    feedAddress: "0xB3cE282CD188b35DA0E38D8Bc7d58e33173D202a",
    logo: "🟠",
  },
  {
    name: "Intel",
    ticker: "INTC",
    tokenTicker: "INTCc",
    contract: "0xB2000000000000000000004AFF16039bA04bdFBc",
    feedAddress: "0xAB657C39bac0D5886250D70849e2E3E008F2EECB",
    logo: "💙",
  },
  {
    name: "SpaceX",
    ticker: "SPCX",
    tokenTicker: "SPCXc",
    contract: "0xb2000000000000000000007b9fcbd005511aCBd5",
    feedAddress: "0x6A634B235903C4ad6376892180d6fF8612e3Fa68",
    logo: "🚀",
  },
  {
    name: "Circle",
    ticker: "CRCL",
    tokenTicker: "CRCLc",
    contract: "0xB20000000000000000000019f6E7C675b73C2e4D",
    feedAddress: "0x0231cF2635D1E17bB5c2462cc7504Ba1fBd61f33",
    logo: "⭕",
  },
  {
    name: "SanDisk",
    ticker: "SNDK",
    tokenTicker: "SNDKc",
    contract: "0xb200000000000000000000397293Cb8cda9a10c5",
    feedAddress: "0x388b0dC46C0Fb05A74BeE0994fa5b02c6Fcca2eA",
    logo: "💾",
  },
];
