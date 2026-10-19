/** Build-time facts about this release, safe to use on client or server. */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';

export const REPO_URL = 'https://github.com/dtsoden/Inventory-Management';
export const RELEASES_URL = `${REPO_URL}/releases`;
export const releaseUrl = (version: string = APP_VERSION) => `${RELEASES_URL}/tag/v${version}`;
