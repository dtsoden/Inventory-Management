import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  userSidebar: [
    {
      type: 'category',
      label: 'User Guide',
      collapsed: false,
      items: [
        'user/getting-started',
        'user/dashboard',
        'user/inventory',
        'user/procurement',
        'user/receiving',
        'user/vendors',
        'user/ai-assistant',
        'user/profile',
      ],
    },
  ],
  adminSidebar: [
    {
      type: 'category',
      label: 'Setup & Architecture',
      collapsed: false,
      items: [
        'admin/setup-wizard',
        'admin/architecture',
        'admin/docker-deployment',
        'admin/runtime-migrations',
      ],
    },
    {
      type: 'category',
      label: 'Settings Reference',
      collapsed: false,
      items: [
        'admin/settings-overview',
        'admin/settings-users',
        'admin/settings-branding',
        'admin/settings-integrations',
        'admin/settings-data-sources',
        'admin/settings-security',
        'admin/settings-notifications',
        'admin/settings-sample-data',
        'admin/settings-lists',
      ],
    },
  ],
};

export default sidebars;
