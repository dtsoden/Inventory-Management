import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Inventory Management Platform',
  tagline: 'User and administrator documentation',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  // Served from the host Next.js app under /docs
  url: 'https://shane-inventory.davidsoden.com',
  baseUrl: '/docs/',

  organizationName: 'dtsoden',
  projectName: 'Shane-Inventory',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: undefined,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Inventory Management Platform',
      logo: {
        alt: 'Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'userSidebar',
          position: 'left',
          label: 'User Guide',
        },
        {
          type: 'docSidebar',
          sidebarId: 'adminSidebar',
          position: 'left',
          label: 'Admin Guide',
        },
        {
          to: '/comparison',
          label: 'Shane Comparison',
          position: 'left',
        },
        {
          href: 'https://github.com/dtsoden/Shane-Inventory',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {label: 'User Guide', to: '/user/getting-started'},
            {label: 'Admin Guide', to: '/admin/setup-wizard'},
            {label: 'Shane Comparison', to: '/comparison'},
          ],
        },
        {
          title: 'Project',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/dtsoden/Shane-Inventory',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Inventory Management Platform. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
