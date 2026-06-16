export type XLiveAccount = {
  handle: string;
  displayName: string;
  categories: string[];
  tags: string[];
};

const rawAccounts: XLiveAccount[] = [
  { handle: "dnystedt", displayName: "Dan Nystedt", categories: ["半导体行业", "中国供应链"], tags: ["半导体", "供应链"] },
  { handle: "asianometry", displayName: "Asianometry", categories: ["半导体行业", "中国供应链"], tags: ["半导体", "亚洲科技"] },
  { handle: "dylan522p", displayName: "Dylan Patel", categories: ["半导体行业", "其他"], tags: ["AI", "半导体"] },
  { handle: "SemiAnalysis_", displayName: "SemiAnalysis", categories: ["半导体行业", "其他"], tags: ["AI", "半导体"] },
  { handle: "jukan05", displayName: "Jukan", categories: ["半导体行业", "中国供应链"], tags: ["半导体", "供应链"] },
  { handle: "tculpan", displayName: "Tim Culpan", categories: ["半导体行业", "中国供应链"], tags: ["科技", "供应链"] },
  { handle: "semivision_tw", displayName: "SemiVision", categories: ["半导体行业", "中国供应链"], tags: ["半导体", "台湾产业链"] },
  { handle: "zephyr_z9", displayName: "Zephyr", categories: ["半导体行业"], tags: ["半导体"] },
  { handle: "fabknowledge", displayName: "Fab Knowledge", categories: ["半导体行业", "其他"], tags: ["晶圆厂", "半导体"] },
  { handle: "jordanschneider", displayName: "Jordan Schneider", categories: ["半导体行业", "中国供应链"], tags: ["科技政策", "供应链"] },
  { handle: "SKundojjala", displayName: "Sravan Kundojjala", categories: ["半导体行业", "其他"], tags: ["芯片", "移动终端"] },
  { handle: "IanCutress", displayName: "Ian Cutress", categories: ["半导体行业"], tags: ["芯片", "硬件"] },
  { handle: "PatrickMoorhead", displayName: "Patrick Moorhead", categories: ["半导体行业"], tags: ["科技", "AI"] },
  { handle: "DanielNewmanUV", displayName: "Daniel Newman", categories: ["半导体行业"], tags: ["科技", "AI"] },
  { handle: "Beth_Kindig", displayName: "Beth Kindig", categories: ["半导体行业"], tags: ["AI", "美股科技"] },
  { handle: "crmiller1", displayName: "Chris Miller", categories: ["半导体行业"], tags: ["芯片战争", "半导体"] },
  { handle: "aleabitoreddit", displayName: "Serenity", categories: ["半导体行业", "中国供应链"], tags: ["功率半导体", "AI数据中心", "台湾供应链"] },
  { handle: "catl_official", displayName: "CATL", categories: ["储能行业"], tags: ["储能", "电池"] },
  { handle: "Sungrow_Power", displayName: "Sungrow", categories: ["储能行业"], tags: ["储能", "逆变器"] },
  { handle: "BYDCompany", displayName: "BYD", categories: ["储能行业"], tags: ["新能源汽车", "电池"] },
  { handle: "Tesla", displayName: "Tesla", categories: ["储能行业"], tags: ["特斯拉", "新能源"] },
  { handle: "TeslaEnergy", displayName: "Tesla Energy", categories: ["储能行业"], tags: ["储能", "电力"] },
  { handle: "FluenceEnergy", displayName: "Fluence", categories: ["储能行业"], tags: ["储能", "电网"] },
  { handle: "PowinEnergy", displayName: "Powin", categories: ["储能行业"], tags: ["储能"] },
  { handle: "BloombergNEF", displayName: "BloombergNEF", categories: ["储能行业"], tags: ["新能源", "储能"] },
  { handle: "EnergyStorageEU", displayName: "Energy Storage EU", categories: ["储能行业"], tags: ["欧洲储能", "电力"] },
  { handle: "EnergyStorageNw", displayName: "Energy Storage News", categories: ["储能行业"], tags: ["储能", "行业新闻"] },
];

export const X_LIVE_ACCOUNTS = dedupeAccounts(rawAccounts);

export function getConfiguredXLiveAccounts() {
  const handles = process.env.X_LIVE_HANDLES?.split(",")
    .map((item) => normalizeHandle(item).toLowerCase())
    .filter(Boolean);

  if (!handles || handles.length === 0) {
    return X_LIVE_ACCOUNTS;
  }

  return X_LIVE_ACCOUNTS.filter((account) => handles.includes(account.handle.toLowerCase()));
}

function dedupeAccounts(accounts: XLiveAccount[]) {
  const merged = new Map<string, XLiveAccount>();

  for (const account of accounts) {
    const key = normalizeHandle(account.handle);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...account, handle: key });
      continue;
    }

    existing.categories = Array.from(new Set([...existing.categories, ...account.categories]));
    existing.tags = Array.from(new Set([...existing.tags, ...account.tags]));
  }

  return Array.from(merged.values());
}

export function normalizeHandle(handle: string) {
  return handle.replace(/^@/, "").trim();
}
