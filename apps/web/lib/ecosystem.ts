import { EcosystemApp } from '@/hooks/usePetraEcosystemApps';

// Re-export the hook and types for convenience
export { usePetraEcosystemApps, type EcosystemApp } from '@/hooks/usePetraEcosystemApps';

// Keep the old hardcoded apps as fallback (can be removed later)
export const fallbackEcosystemApps = [
  {
    categories: ['defi', 'liquidStaking'],
    platform: ['mobile', 'extension', 'web'],
    type: 'dapp',
    description: 'Liquidity Staking Protocol on Aptos',
    isPopular: true,
    link: 'https://stake.amnis.finance/',
    logoUrl:
      'https://media.aptosfoundation.org/1697740121-project-icon_amnis.png?auto=format&fit=crop&h=100&w=100',
    logoUrlDark:
      'https://media.aptosfoundation.org/1697740121-project-icon_amnis.png?auto=format&fit=crop&h=100&w=100',
    name: 'Amnis Finance',
    supportsAptosConnect: true,
    tester: 'amnis'
  },
  {
    categories: ['defi', 'entertainment'],
    platform: ['mobile', 'extension', 'web'],
    type: 'dapp',
    description: 'Presented by Econia Labs',
    isPopular: true,
    link: 'https://www.emojicoin.fun/',
    logoUrl:
      'https://imagedelivery.net/1v0lk1OFEOmesBikJtB8QQ/568a0e52-57fc-4910-1e5e-38663b8dd400/small100x100',
    logoUrlDark:
      'https://imagedelivery.net/1v0lk1OFEOmesBikJtB8QQ/568a0e52-57fc-4910-1e5e-38663b8dd400/small100x100',
    name: 'EmojiCoin.fun',
    supportsAptosConnect: true,
    tester: 'emojicoin'
  },
  {
    categories: ['defi', 'stablecoins', 'launchpads'],
    platform: ['mobile', 'extension', 'web'],
    type: 'dapp',
    description: 'DeFi App – Powered by Move, Now Live on Aptos',
    isPopular: false,
    link: 'https://app.thala.fi/',
    logoUrl:
      'https://media.aptosfoundation.org/1687178238-thala-launch.jpeg?auto=format&fit=crop&h=100&w=100',
    logoUrlDark:
      'https://media.aptosfoundation.org/1687178238-thala-launch.jpeg?auto=format&fit=crop&h=100&w=100',
    name: 'Thala Labs',
    supportsAptosConnect: true,
    tester: 'thala'
  },
  {
    categories: ['defi', 'bridges'],
    platform: ['mobile', 'extension', 'web'],
    type: 'dapp',
    description: 'Cross-chain aggregator',
    isPopular: false,
    link: 'https://www.okx.com/web3/dex-swap#inputChain=637&inputCurrency=APT&outputChain=637&outputCurrency=0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa%3A%3Aasset%3A%3AUSDC',
    logoUrl:
      'https://media.aptosfoundation.org/1699066253-project-icon_okx-dex.png?auto=format&fit=crop&h=100&w=100',
    logoUrlDark:
      'https://media.aptosfoundation.org/1699066253-project-icon_okx-dex.png?auto=format&fit=crop&h=100&w=100',
    name: 'OKX DEX',
    tester: 'okx.com'
  },
  {
    categories: ['defi', 'swaps'],
    platform: ['mobile', 'extension', 'web'],
    type: 'dapp',
    description: 'App for DeFi. Building the Future of web3',
    isPopular: false,
    link: 'https://app.kanalabs.io/',
    logoUrl:
      'https://media.aptosfoundation.org/1690445358-e55899f0b363-kanalabs_logo.png?auto=format&fit=crop&h=100&w=100',
    logoUrlDark:
      'https://media.aptosfoundation.org/1690445358-e55899f0b363-kanalabs_logo.png?auto=format&fit=crop&h=100&w=100',
    name: 'Kana Labs',
    supportsAptosConnect: true,
    tester: 'kanalabs'
  },
  {
    categories: ['defi', 'lending'],
    description: 'Universal lending market connecting liquidity on Aptos',
    isPopular: false,
    link: 'https://echelon.market/',
    logoUrl:
      'https://imagedelivery.net/1v0lk1OFEOmesBikJtB8QQ/7ae9dda7-8964-4f18-bdcf-cf171e49fd00/small100x100',
    logoUrlDark:
      'https://imagedelivery.net/1v0lk1OFEOmesBikJtB8QQ/7ae9dda7-8964-4f18-bdcf-cf171e49fd00/small100x100',
    name: 'Echelon',
    tester: 'echelon'
  },
  {
    categories: ['defi', 'explorer'],
    description: 'Aptos blockchain explorer by Aptos Labs',
    isPopular: false,
    link: 'https://explorer.aptoslabs.com/?network=mainnet',
    logoUrl:
      'https://media.aptosfoundation.org/1687171540-aptos-explorer-by-aptoslabs.png?auto=format&fit=crop&h=100&w=100',
    logoUrlDark:
      'https://media.aptosfoundation.org/1687171540-aptos-explorer-by-aptoslabs.png?auto=format&fit=crop&h=100&w=100',
    name: 'Aptos Explorer',
    tester: 'explorer.aptoslabs'
  },
  {
    categories: ['defi', 'swaps'],
    description:
      'Fully on-chain hybrid orderbook AMM DEX built natively for Aptos.',
    isPopular: true,
    link: 'https://hyperion.xyz/',
    logoUrl:
      'https://imagedelivery.net/1v0lk1OFEOmesBikJtB8QQ/49da4d25-2e3b-49e6-cce5-bacb6f3b8b00/small100x100',
    logoUrlDark:
      'https://imagedelivery.net/1v0lk1OFEOmesBikJtB8QQ/49da4d25-2e3b-49e6-cce5-bacb6f3b8b00/small100x100',
    name: 'Hyperion',
    tester: 'Hyperion'
  }
] as const;

/**
 * Check if a given URL matches any of the known ecosystem apps
 * @param url - The URL to check
 * @param ecosystemApps - Array of ecosystem apps to check against (optional, uses fallback if not provided)
 */
export function isKnownEcosystemApp(url: string, ecosystemApps?: EcosystemApp[]): boolean {
  const appsToCheck = ecosystemApps || fallbackEcosystemApps;
  
  try {
    const targetUrl = new URL(url);
    const targetOrigin = targetUrl.origin;
    const targetHostname = targetUrl.hostname;

    return appsToCheck.some((app) => {
      // Skip apps without a link (e.g., widgets)
      if (!app.link) return false;
      
      try {
        const appUrl = new URL(app.link);
        const appOrigin = appUrl.origin;
        const appHostname = appUrl.hostname;

        // Check if origins match or if hostnames match (for subdomain flexibility)
        return appOrigin === targetOrigin || appHostname === targetHostname;
      } catch {
        // If app.link is not a valid URL, fall back to string comparison
        return app.link === url;
      }
    });
  } catch {
    // If url is not valid, fall back to exact string matching
    return appsToCheck.some((app) => app.link === url);
  }
}
