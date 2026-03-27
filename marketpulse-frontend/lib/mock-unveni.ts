export type HorizonBrief = {
  horizon: string;
  bias: string;
  conviction: string;
  summary: string;
};

export type SymbolCatalyst = {
  date: string;
  title: string;
  type: string;
  impact: string;
  summary: string;
};

export type SymbolNewsItem = {
  source: string;
  time: string;
  title: string;
  summary: string;
};

export type SymbolLevel = {
  label: string;
  value: string;
  note: string;
};

export type SentimentMetric = {
  label: string;
  value: string;
  note: string;
};

export type SymbolRecord = {
  symbol: string;
  name: string;
  sector: string;
  exchange: string;
  price: number;
  changePercent: number;
  marketCap: string;
  liquidity: string;
  thesisHeadline: string;
  thesisSummary: string;
  thesisBody: string[];
  riskSummary: string;
  riskItems: string[];
  keyLevels: SymbolLevel[];
  sentiment: SentimentMetric[];
  horizons: HorizonBrief[];
  catalysts: SymbolCatalyst[];
  relatedNews: SymbolNewsItem[];
  relatedResearch: string[];
  chartSeries: number[];
};

export type ResearchMemo = {
  slug: string;
  symbol: string;
  title: string;
  subtitle: string;
  author: string;
  publishedAt: string;
  readingTime: string;
  status: string;
  executiveSummary: string;
  setup: string;
  keyLevels: SymbolLevel[];
  risks: string[];
  sections: Array<{
    label: string;
    title: string;
    paragraphs: string[];
  }>;
};

export type SettingsSection = {
  title: string;
  description: string;
  fields: Array<{
    label: string;
    value: string;
    helper: string;
  }>;
};

export const deskDate = "2026-03-26T14:30:00-05:00";

export const symbols: SymbolRecord[] = [
  {
    symbol: "NVDA",
    name: "NVIDIA",
    sector: "Semiconductors",
    exchange: "NASDAQ",
    price: 1088.46,
    changePercent: 1.42,
    marketCap: "$2.68T",
    liquidity: "Very high",
    thesisHeadline: "AI spend remains crowded, but sponsorship still pays for upside above prior highs.",
    thesisSummary:
      "Institutional demand is still rewarding leadership semis, though the tape is forcing cleaner entries instead of chase behavior.",
    thesisBody: [
      "Leadership is intact as long as pullbacks continue to find buyers above the prior balance shelf. The tape is extended, but not obviously exhausted.",
      "Catalysts remain supportive because capex language from hyperscalers is still framing compute as a spending priority rather than a discretionary line item.",
      "The key question is not whether the long-term narrative is alive. It is whether price can keep absorbing premium expectations without losing breadth support.",
    ],
    riskSummary: "High expectation risk if results are merely good instead of decisively better.",
    riskItems: [
      "Any softening in hyperscaler spend commentary can compress multiple support quickly.",
      "Crowded positioning means downside can gap through first support if momentum stalls.",
      "If breadth narrows again, leadership may be forced to carry too much index weight on its own.",
    ],
    keyLevels: [
      {
        label: "Tactical support",
        value: "1062.00",
        note: "Recent breakout shelf and first meaningful demand zone.",
      },
      {
        label: "Pivot",
        value: "1094.00",
        note: "Current decision level for continuation versus digestion.",
      },
      {
        label: "Upside path",
        value: "1128.00",
        note: "Extension target if buyers hold the current shelf.",
      },
      {
        label: "Invalidation",
        value: "1038.00",
        note: "Loss of structure would shift the read from trend continuation to repair mode.",
      },
    ],
    sentiment: [
      {
        label: "Street tone",
        value: "Constructive",
        note: "Estimate revisions remain positive and thematic sponsorship is intact.",
      },
      {
        label: "Crowding",
        value: "Elevated",
        note: "The trade still works, but entry quality matters more than narrative enthusiasm.",
      },
      {
        label: "Risk band",
        value: "Medium-high",
        note: "The setup is positive, though expectation risk prevents a fully calm tape.",
      },
    ],
    horizons: [
      {
        horizon: "Intraday",
        bias: "Constructive",
        conviction: "74 / 100",
        summary: "Momentum remains favorable while price holds above 1062 and reclaims 1094 intraday.",
      },
      {
        horizon: "Swing",
        bias: "Overweight",
        conviction: "81 / 100",
        summary: "Narrative, sponsorship, and relative strength stay aligned unless capex language weakens.",
      },
    ],
    catalysts: [
      {
        date: "2026-03-29",
        title: "Hyperscaler capex read-through",
        type: "Industry",
        impact: "High",
        summary: "Any reinforcement of accelerated AI infrastructure budgets extends the leadership trade.",
      },
      {
        date: "2026-04-03",
        title: "Options expiry positioning reset",
        type: "Flow",
        impact: "Medium",
        summary: "Dealer positioning could create a cleaner re-entry window or a sharp stop-hunt around the pivot.",
      },
      {
        date: "2026-04-09",
        title: "Supply chain channel checks",
        type: "Channel",
        impact: "Medium",
        summary: "Order visibility needs to confirm that recent demand assumptions are still conservative.",
      },
    ],
    relatedNews: [
      {
        source: "Unveni Desk",
        time: "2026-03-26T08:12:00-05:00",
        title: "Buy-side still pays for AI compute scarcity",
        summary: "Risk appetite remains concentrated in names with defensible supply and visible spend channels.",
      },
      {
        source: "Channel Survey",
        time: "2026-03-25T16:44:00-05:00",
        title: "Component lead times tighten again into quarter-end",
        summary: "Tighter lead times support revenue durability but keep the expectation bar elevated.",
      },
    ],
    relatedResearch: [
      "nvda-acceleration-still-funds-the-tape",
      "breadth-needs-to-catch-the-index",
    ],
    chartSeries: [948, 956, 962, 974, 970, 979, 991, 1002, 1010, 1036, 1044, 1056, 1074, 1068, 1088],
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    sector: "Software & Cloud",
    exchange: "NASDAQ",
    price: 512.2,
    changePercent: 0.66,
    marketCap: "$3.82T",
    liquidity: "Very high",
    thesisHeadline: "Quality leadership remains orderly while Azure and productivity demand stay steady.",
    thesisSummary:
      "Microsoft is not the fastest tape on the board, but it remains one of the cleanest vehicles for persistent institutional ownership.",
    thesisBody: [
      "The setup continues to behave like a high-quality compounder rather than a speculative momentum squeeze. That matters when the market wants quality duration.",
      "AI monetization discussion remains helpful, though the stock does not need a dramatic acceleration story to justify sponsorship.",
      "If the tape weakens, this is more likely to become a relative safe harbor than a first source of forced selling.",
    ],
    riskSummary: "More valuation compression risk than operating risk in the near term.",
    riskItems: [
      "If rate volatility returns, premium multiple software can underperform even with solid fundamentals.",
      "Any Azure slowdown would hit sentiment harder because stability is central to the long thesis.",
      "The trade can lag in sharp cyclical squeezes where money rotates away from quality defensiveness.",
    ],
    keyLevels: [
      {
        label: "Support",
        value: "503.00",
        note: "Recent demand band where trend followers have been defending pullbacks.",
      },
      {
        label: "Pivot",
        value: "514.50",
        note: "Short-term continuation gate above current price.",
      },
      {
        label: "Stretch",
        value: "524.00",
        note: "Extension target if the tape continues to prefer quality growth.",
      },
      {
        label: "Risk trigger",
        value: "496.00",
        note: "Below this zone the setup likely moves into deeper digestion.",
      },
    ],
    sentiment: [
      {
        label: "Street tone",
        value: "Positive",
        note: "Stability, margins, and AI optionality continue to attract core ownership.",
      },
      {
        label: "Crowding",
        value: "Moderate",
        note: "Well-owned, but not carrying the same expectation intensity as semis.",
      },
      {
        label: "Risk band",
        value: "Medium",
        note: "Risk is more valuation and macro duration than business-model shock.",
      },
    ],
    horizons: [
      {
        horizon: "Intraday",
        bias: "Balanced long",
        conviction: "68 / 100",
        summary: "Action is slower than semis, but dips into 503 remain buyable while the tape is calm.",
      },
      {
        horizon: "Swing",
        bias: "Core long",
        conviction: "77 / 100",
        summary: "The stock remains a favored quality anchor for a constructive broad-market regime.",
      },
    ],
    catalysts: [
      {
        date: "2026-03-31",
        title: "Enterprise AI adoption survey",
        type: "Demand",
        impact: "Medium",
        summary: "A steady adoption read can support the monetization narrative without needing hype.",
      },
      {
        date: "2026-04-11",
        title: "Cloud channel check refresh",
        type: "Channel",
        impact: "Medium",
        summary: "Cloud resilience is the clearest near-term proof point for staying constructive.",
      },
    ],
    relatedNews: [
      {
        source: "Desk Flow",
        time: "2026-03-26T09:01:00-05:00",
        title: "Large-cap quality regains allocation preference",
        summary: "When traders reduce beta, Microsoft remains one of the first homes for retained exposure.",
      },
    ],
    relatedResearch: ["quality-duration-still-has-a-bid"],
    chartSeries: [480, 482, 486, 490, 491, 494, 497, 501, 503, 507, 506, 509, 511, 510, 512],
  },
  {
    symbol: "SPY",
    name: "SPDR S&P 500 ETF",
    sector: "Index Proxy",
    exchange: "NYSE Arca",
    price: 648.31,
    changePercent: 0.21,
    marketCap: "$593B",
    liquidity: "Extremely high",
    thesisHeadline: "Index structure is firm, but breadth still needs to broaden before the tape feels effortless.",
    thesisSummary:
      "The broad market is holding trend, though leadership remains concentrated enough to keep positioning selective.",
    thesisBody: [
      "The index keeps printing higher lows, which is constructive, but traders still need confirmation that the move is spreading beyond concentrated growth leadership.",
      "Macro pressure is manageable rather than absent. That keeps the market tradable, but not indiscriminately easy.",
      "A healthy path from here likely includes rotation and digestion instead of a straight-line melt-up.",
    ],
    riskSummary: "The market is healthy, but still vulnerable to headline-driven breadth setbacks.",
    riskItems: [
      "If rate volatility resurfaces, breadth can weaken before the index meaningfully breaks.",
      "Leadership concentration still makes the tape look stronger than average participation suggests.",
      "Macro surprises would likely show up first through failed rotation rather than immediate index collapse.",
    ],
    keyLevels: [
      {
        label: "Support",
        value: "642.80",
        note: "Short-term trend shelf that needs to hold for the constructive path.",
      },
      {
        label: "Pivot",
        value: "649.20",
        note: "Near-term decision level for continuation through highs.",
      },
      {
        label: "Stretch",
        value: "655.80",
        note: "Momentum extension if breadth firms up.",
      },
      {
        label: "Risk trigger",
        value: "637.00",
        note: "Below this level the market likely shifts from grind higher to repair behavior.",
      },
    ],
    sentiment: [
      {
        label: "Street tone",
        value: "Constructive",
        note: "Macro is not frictionless, but not yet disruptive enough to break the trend.",
      },
      {
        label: "Breadth",
        value: "Improving slowly",
        note: "The index wants better participation to make the trend more durable.",
      },
      {
        label: "Risk band",
        value: "Medium",
        note: "The market is tradable with discipline, not a complacent chase environment.",
      },
    ],
    horizons: [
      {
        horizon: "Intraday",
        bias: "Constructive",
        conviction: "61 / 100",
        summary: "Supportive while above 642.8, though conviction improves only if breadth expands intraday.",
      },
      {
        horizon: "Swing",
        bias: "Moderate overweight",
        conviction: "69 / 100",
        summary: "Trend remains positive, but position sizing should respect breadth and macro sensitivity.",
      },
    ],
    catalysts: [
      {
        date: "2026-03-27",
        title: "Core inflation print",
        type: "Macro",
        impact: "High",
        summary: "A benign print supports duration and helps broaden participation beyond concentrated growth.",
      },
      {
        date: "2026-04-01",
        title: "Quarter-open allocation rebalance",
        type: "Flow",
        impact: "Medium",
        summary: "Fresh institutional positioning can either reinforce breadth or re-concentrate exposure.",
      },
    ],
    relatedNews: [
      {
        source: "Macro Desk",
        time: "2026-03-26T07:38:00-05:00",
        title: "Rates calm keeps equity tape orderly",
        summary: "The market is benefiting from a lower-volatility macro backdrop, though that support still needs breadth confirmation.",
      },
    ],
    relatedResearch: ["breadth-needs-to-catch-the-index"],
    chartSeries: [626, 629, 631, 634, 636, 638, 640, 641, 643, 644, 646, 647, 646, 648, 648],
  },
  {
    symbol: "XOM",
    name: "Exxon Mobil",
    sector: "Energy",
    exchange: "NYSE",
    price: 132.78,
    changePercent: -0.48,
    marketCap: "$548B",
    liquidity: "High",
    thesisHeadline: "Energy is no longer the tape leader, but cash-flow durability still attracts defensive capital.",
    thesisSummary:
      "Exxon offers steadier downside behavior than cyclicals tied to higher-beta narratives, though upside needs a cleaner commodity impulse.",
    thesisBody: [
      "The stock is acting more like a cash-yielding ballast than a leadership source. That can still matter in mixed macro tapes.",
      "Commodity support helps, but the trade wants a stronger crude signal before it can re-rate meaningfully.",
      "Positioning is not stretched, which keeps the downside cleaner even if relative momentum has faded.",
    ],
    riskSummary: "Without a stronger commodity impulse, upside can remain capped while capital prefers growth.",
    riskItems: [
      "If crude retraces, relative defensiveness may not be enough to preserve sponsorship.",
      "The stock can lag when the market strongly favors duration and AI leadership.",
      "Capital return appeal is helpful, but not always enough to drive reacceleration.",
    ],
    keyLevels: [
      {
        label: "Support",
        value: "129.90",
        note: "Recent shelf where defensive buyers have shown up.",
      },
      {
        label: "Pivot",
        value: "133.40",
        note: "Need a reclaim here to re-open upside momentum.",
      },
      {
        label: "Stretch",
        value: "137.80",
        note: "Best-case move if crude and defensiveness align.",
      },
      {
        label: "Risk trigger",
        value: "127.20",
        note: "Below this level the setup weakens materially.",
      },
    ],
    sentiment: [
      {
        label: "Street tone",
        value: "Stable",
        note: "Not an excitement tape, but still respected for quality and cash generation.",
      },
      {
        label: "Momentum",
        value: "Muted",
        note: "The market is not currently paying a premium for this exposure.",
      },
      {
        label: "Risk band",
        value: "Medium-low",
        note: "Cleaner downside profile than most cyclicals, though upside is less dynamic.",
      },
    ],
    horizons: [
      {
        horizon: "Intraday",
        bias: "Neutral",
        conviction: "47 / 100",
        summary: "Useful only if price can reclaim 133.4 with stronger commodity support.",
      },
      {
        horizon: "Swing",
        bias: "Watchlist long",
        conviction: "56 / 100",
        summary: "Still investable as ballast, but not a priority allocation ahead of better momentum.",
      },
    ],
    catalysts: [
      {
        date: "2026-03-30",
        title: "OPEC commentary refresh",
        type: "Macro",
        impact: "Medium",
        summary: "Commodity support can improve quickly if supply discipline remains credible.",
      },
      {
        date: "2026-04-07",
        title: "Refining margin read",
        type: "Fundamental",
        impact: "Medium",
        summary: "Margin resilience would reinforce the cash-flow case even without higher crude.",
      },
    ],
    relatedNews: [
      {
        source: "Commodity Notes",
        time: "2026-03-26T06:52:00-05:00",
        title: "Energy remains steady, not urgent",
        summary: "Capital still respects balance-sheet quality, but momentum capital is not yet rotating back aggressively.",
      },
    ],
    relatedResearch: ["energy-as-ballast-not-beta"],
    chartSeries: [136, 135, 134.8, 134.2, 133.9, 133.4, 133.1, 132.9, 132.4, 132.1, 131.8, 132.2, 132.6, 132.9, 132.8],
  },
];

export const researchMemos: ResearchMemo[] = [
  {
    slug: "nvda-acceleration-still-funds-the-tape",
    symbol: "NVDA",
    title: "Acceleration Still Funds The Tape",
    subtitle: "Leadership remains expensive, but the market is still rewarding visible AI spend.",
    author: "Morgan Lee",
    publishedAt: "2026-03-26T07:10:00-05:00",
    readingTime: "6 min read",
    status: "Published",
    executiveSummary:
      "NVIDIA remains an overweight-quality momentum position because institutional buyers still trust the spend cycle. The risk is not the narrative. The risk is whether expectations outrun fresh proof points.",
    setup:
      "The desk wants continued respect for the 1062 shelf and a clean reclaim of 1094 before adding aggressively. That keeps the trade tied to structure instead of headline enthusiasm.",
    keyLevels: [
      {
        label: "Demand shelf",
        value: "1062.00",
        note: "Holding this keeps the constructive structure intact.",
      },
      {
        label: "Continuation trigger",
        value: "1094.00",
        note: "Reclaiming this opens the path toward new highs.",
      },
      {
        label: "Break condition",
        value: "1038.00",
        note: "Losing this zone likely forces a more defensive read.",
      },
    ],
    risks: [
      "Positioning is crowded enough that any disappointing capex language could create abrupt de-risking.",
      "If breadth narrows again, the stock may be forced to carry too much index leadership on its own.",
      "The tape still needs operational proof, not only AI enthusiasm, to sustain current multiples.",
    ],
    sections: [
      {
        label: "Context",
        title: "Why sponsorship still exists",
        paragraphs: [
          "The market is still paying for scarcity, visibility, and direct exposure to AI infrastructure spending. NVIDIA remains the cleanest vehicle for all three.",
          "This matters because the trade does not need a new narrative. It only needs confirmation that the existing one is still funded by real budgets.",
        ],
      },
      {
        label: "Structure",
        title: "How price keeps the thesis honest",
        paragraphs: [
          "The stock can remain expensive and still be investable if structure keeps validating the narrative. The 1062 shelf is the first place that needs to prove real institutional demand.",
          "If price cannot defend that level, the desk should treat the setup as fragile even if the long-term story still sounds compelling.",
        ],
      },
      {
        label: "Action",
        title: "What the desk should watch next",
        paragraphs: [
          "A clean reclaim of 1094 with strong breadth is the highest-quality near-term signal. Without that, traders should prefer patience over forced entry.",
          "The desk should also watch whether related semis participate. If the group stops confirming leadership, single-name conviction should soften as well.",
        ],
      },
    ],
  },
  {
    slug: "breadth-needs-to-catch-the-index",
    symbol: "SPY",
    title: "Breadth Needs To Catch The Index",
    subtitle: "The market trend is healthy, but concentrated leadership still masks fragile participation.",
    author: "Reese Patel",
    publishedAt: "2026-03-25T16:20:00-05:00",
    readingTime: "5 min read",
    status: "Published",
    executiveSummary:
      "The index remains constructive, but the desk should respect a difference between higher prices and broader participation. The cleanest bullish path from here requires breadth to improve rather than leadership becoming even more concentrated.",
    setup:
      "Stay constructive while SPY holds 642.8, but upgrade conviction only if participation extends beyond the same narrow group carrying the index.",
    keyLevels: [
      {
        label: "Trend support",
        value: "642.80",
        note: "Keeps the constructive path alive.",
      },
      {
        label: "Rotation trigger",
        value: "649.20",
        note: "Continuation above this is best paired with better breadth.",
      },
      {
        label: "Repair zone",
        value: "637.00",
        note: "Below this, the tape likely needs deeper repair.",
      },
    ],
    risks: [
      "Macroeconomic stability could wobble before the index shows it through price.",
      "Concentrated leadership makes the tape more brittle than the headline index level implies.",
      "Weak rotation can turn a healthy pause into a more meaningful confidence problem.",
    ],
    sections: [
      {
        label: "Market",
        title: "The tape is firm, not frictionless",
        paragraphs: [
          "The desk should resist false precision here. The trend is real, but the quality of participation is still mixed.",
          "That means traders can stay constructive without becoming complacent.",
        ],
      },
      {
        label: "Rotation",
        title: "Why breadth matters now",
        paragraphs: [
          "The index does not need universal participation to move higher, but it does need enough supporting evidence that the move is not becoming more fragile with every new high.",
          "Improving breadth is the easiest way for the market to lower its own risk profile.",
        ],
      },
    ],
  },
  {
    slug: "quality-duration-still-has-a-bid",
    symbol: "MSFT",
    title: "Quality Duration Still Has A Bid",
    subtitle: "When investors reduce beta, Microsoft keeps inheriting capital.",
    author: "Dana Wu",
    publishedAt: "2026-03-24T13:05:00-05:00",
    readingTime: "4 min read",
    status: "Published",
    executiveSummary:
      "Microsoft remains a high-trust long because buyers still prefer stable compounders when macro is calm but not fully resolved. The stock does not need speculative enthusiasm to remain well owned.",
    setup:
      "Use 503 as the first meaningful trend shelf. The trade improves if 514.5 is reclaimed with broader large-cap participation.",
    keyLevels: [
      {
        label: "Support",
        value: "503.00",
        note: "Maintains the cleaner quality-bid profile.",
      },
      {
        label: "Continuation",
        value: "514.50",
        note: "Open above this level for the next leg higher.",
      },
      {
        label: "Failure point",
        value: "496.00",
        note: "Would weaken the orderly trend.",
      },
    ],
    risks: [
      "A duration shock could compress multiples even without business deterioration.",
      "Cloud commentary matters more than usual because stability is central to the thesis.",
    ],
    sections: [
      {
        label: "Ownership",
        title: "Why capital stays here",
        paragraphs: [
          "Microsoft remains one of the few megacaps that satisfies quality, balance-sheet strength, and AI optionality at once.",
          "That combination matters when capital wants exposure but not maximum volatility.",
        ],
      },
      {
        label: "Conclusion",
        title: "What changes the read",
        paragraphs: [
          "The thesis weakens only if the market begins to punish duration aggressively or if Azure stability becomes less credible.",
          "Absent either, the stock remains one of the market's preferred core allocations.",
        ],
      },
    ],
  },
  {
    slug: "energy-as-ballast-not-beta",
    symbol: "XOM",
    title: "Energy As Ballast, Not Beta",
    subtitle: "Exxon is useful as stability, but it is not where the market is paying for acceleration.",
    author: "Jordan Price",
    publishedAt: "2026-03-22T11:00:00-05:00",
    readingTime: "4 min read",
    status: "Published",
    executiveSummary:
      "Exxon remains a credible portfolio stabilizer because cash generation and balance-sheet quality continue to matter. The setup is less compelling if the desk is specifically looking for leadership or high-beta upside.",
    setup:
      "The stock needs a reclaim of 133.4 to improve. Until then, it belongs in the ballast bucket rather than the opportunity bucket.",
    keyLevels: [
      {
        label: "Support",
        value: "129.90",
        note: "Defines the lower edge of the defensive posture.",
      },
      {
        label: "Reclaim",
        value: "133.40",
        note: "Needed before the desk upgrades the setup.",
      },
      {
        label: "Failure",
        value: "127.20",
        note: "Would shift the read from stable to suspect.",
      },
    ],
    risks: [
      "Commodity softness can still pressure the tape even if the balance sheet remains strong.",
      "The stock can lag badly when the market prefers duration and secular growth instead of cash yield.",
    ],
    sections: [
      {
        label: "Role",
        title: "Why it still matters",
        paragraphs: [
          "Not every position needs to be a momentum engine. Exxon can still improve portfolio shape by lowering tape sensitivity.",
          "That said, the stock should not be confused with a fresh source of upside acceleration.",
        ],
      },
    ],
  },
];

export const defaultSymbol = symbols[0];
export const defaultResearchMemo = researchMemos[0];

export const dashboardSnapshot = {
  deskStatus: "Open research queue",
  marketBackdrop:
    "Duration is calm, breadth is improving slowly, and leadership remains concentrated in quality growth and AI infrastructure.",
  watchlist: [
    {
      symbol: "NVDA",
      name: "NVIDIA",
      bias: "Constructive",
      risk: "Expectation-heavy",
      nextCatalyst: "Capex read-through",
    },
    {
      symbol: "MSFT",
      name: "Microsoft",
      bias: "Core long",
      risk: "Valuation-sensitive",
      nextCatalyst: "Cloud channel check",
    },
    {
      symbol: "SPY",
      name: "S&P 500",
      bias: "Constructive",
      risk: "Breadth needs work",
      nextCatalyst: "Core inflation print",
    },
    {
      symbol: "XOM",
      name: "Exxon Mobil",
      bias: "Neutral",
      risk: "Commodity-capped",
      nextCatalyst: "OPEC commentary",
    },
  ],
  riskSummary: [
    "Leadership is still doing more of the market's work than breadth would ideally allow.",
    "High-expectation AI names remain investable, but the desk should be selective on entry quality.",
    "Macro is calmer, not absent. Rate volatility remains the fastest way to change the tape.",
  ],
};

export const settingsSections: SettingsSection[] = [
  {
    title: "Account",
    description: "Identity, seat, and workspace ownership.",
    fields: [
      {
        label: "Primary user",
        value: "Morgan Lee",
        helper: "Lead analyst on the U.S. equity book.",
      },
      {
        label: "Seat type",
        value: "Institutional research",
        helper: "Full memo, watchlist, and workspace access.",
      },
      {
        label: "Workspace region",
        value: "Chicago",
        helper: "Used for session hours, timestamps, and default market clocks.",
      },
    ],
  },
  {
    title: "Preferences",
    description: "How the desk defaults new reviews and reads.",
    fields: [
      {
        label: "Default horizon",
        value: "Dual horizon",
        helper: "Intraday and swing reads are shown together on first load.",
      },
      {
        label: "Primary benchmark",
        value: "SPY",
        helper: "Benchmark drift is included in every symbol overview.",
      },
      {
        label: "Risk framing",
        value: "Structured",
        helper: "Every memo opens with invalidation and scenario pressure first.",
      },
    ],
  },
  {
    title: "Notifications",
    description: "How important signals leave the desk.",
    fields: [
      {
        label: "Catalyst alerting",
        value: "Immediate",
        helper: "High-impact events page and email the assigned analyst instantly.",
      },
      {
        label: "Memo distribution",
        value: "Digest at 16:15 CT",
        helper: "Final memo summaries are bundled into one close-of-day delivery.",
      },
      {
        label: "Execution warnings",
        value: "Inline and SMS",
        helper: "Only invalidation or risk escalation alerts break out of product.",
      },
    ],
  },
];

export function getSymbolRecord(symbol: string) {
  const normalized = symbol.toUpperCase();
  return symbols.find((item) => item.symbol === normalized) ?? defaultSymbol;
}

export function getResearchMemo(slug: string) {
  return researchMemos.find((item) => item.slug === slug) ?? defaultResearchMemo;
}

export function getResearchForSymbol(symbol: string) {
  return researchMemos.filter((item) => item.symbol === symbol.toUpperCase());
}
