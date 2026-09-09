export interface Strategy {
  id: string;
  name: string;
  tagline: string;
  description: string;
  image?: string;
  returnPct: number;
  holdings: { ticker: string; weight: number }[];
}

export const STRATEGIES: Strategy[] = [
  {
    id: "gpu-dominance",
    name: "GPU DOMINANCE",
    tagline: "The chip that runs the world",
    description: "NVIDIA supplies the GPUs. The hyperscalers buy them. This basket bets on the full GPU supply chain — from silicon to cloud.",
    returnPct: 43.2,
    holdings: [
      { ticker: "NVDAc", weight: 55 },
      { ticker: "AMZNc", weight: 20 },
      { ticker: "MSFTc", weight: 15 },
      { ticker: "GOOGLc", weight: 10 },
    ],
  },
  {
    id: "bitcoin-standard",
    name: "THE BITCOIN STANDARD",
    tagline: "Stack sats through stocks",
    description: "Indirect Bitcoin exposure through MicroStrategy — the company that has turned corporate treasury into a BTC accumulation machine.",
    returnPct: 112.4,
    holdings: [
      { ticker: "MSTRc", weight: 100 },
    ],
  },
  {
    id: "cloud-empire",
    name: "CLOUD EMPIRE",
    tagline: "Own the world's compute",
    description: "AWS, Azure, and Google Cloud control over 65% of global cloud spend. This basket owns all three operators plus Meta's AI infrastructure.",
    returnPct: 27.6,
    holdings: [
      { ticker: "AMZNc", weight: 30 },
      { ticker: "MSFTc", weight: 30 },
      { ticker: "GOOGLc", weight: 25 },
      { ticker: "METAc", weight: 15 },
    ],
  },
  {
    id: "ai-arms-race",
    name: "AI ARMS RACE",
    tagline: "Bet on the trillion-dollar war",
    description: "Four companies racing to dominate AI — the chip maker, the model lab backer, the search giant, and the social AI platform.",
    returnPct: 38.9,
    holdings: [
      { ticker: "NVDAc", weight: 35 },
      { ticker: "MSFTc", weight: 25 },
      { ticker: "GOOGLc", weight: 22 },
      { ticker: "METAc", weight: 18 },
    ],
  },
  {
    id: "frontier-bet",
    name: "FRONTIER BET",
    tagline: "Orbit, autonomy, and Bitcoin",
    description: "Three of the boldest bets in markets — rockets, self-driving cars, and the largest corporate Bitcoin reserve. High risk, high conviction.",
    returnPct: 67.3,
    holdings: [
      { ticker: "SPCXc", weight: 40 },
      { ticker: "TSLAc", weight: 35 },
      { ticker: "MSTRc", weight: 25 },
    ],
  },
  {
    id: "attention-economy",
    name: "ATTENTION ECONOMY",
    tagline: "They own your screen time",
    description: "Apple, Meta, and Alphabet control the devices, social feeds, and search bars through which billions of people experience the internet daily.",
    returnPct: 19.8,
    holdings: [
      { ticker: "AAPLc", weight: 40 },
      { ticker: "METAc", weight: 35 },
      { ticker: "GOOGLc", weight: 25 },
    ],
  },
  {
    id: "silicon-to-orbit",
    name: "SILICON TO ORBIT",
    tagline: "From chips to satellites",
    description: "The hardware layer of the next computing era — flash memory for data storage and rockets for satellite broadband.",
    returnPct: 31.5,
    holdings: [
      { ticker: "NVDAc", weight: 45 },
      { ticker: "SPCXc", weight: 35 },
      { ticker: "SNDKc", weight: 20 },
    ],
  },
  {
    id: "base-five",
    name: "THE BASE FIVE",
    tagline: "Equal weight, maximum coverage",
    description: "An equal-weight position in the five most dominant US companies. Simple diversification across the companies that move global markets.",
    returnPct: 22.1,
    holdings: [
      { ticker: "NVDAc", weight: 20 },
      { ticker: "AAPLc", weight: 20 },
      { ticker: "MSFTc", weight: 20 },
      { ticker: "GOOGLc", weight: 20 },
      { ticker: "AMZNc", weight: 20 },
    ],
  },
];
