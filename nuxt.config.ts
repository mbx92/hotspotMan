import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  future: {
    compatibilityVersion: 4,
  },
  devtools: { enabled: true },
  modules: [],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    adminSessionSecret: process.env.NUXT_ADMIN_SESSION_SECRET || 'change-me-in-production',
    adminAllowedSubnet: process.env.NUXT_ADMIN_ALLOWED_SUBNET || '192.168.30.0/24',
    openNdsBaseUrl: process.env.NUXT_OPENNDS_BASE_URL || 'http://127.0.0.1:2050',
    openNdsAuthPath: process.env.NUXT_OPENNDS_AUTH_PATH || '/opennds/fas',
    openNdsTimeoutMs: Number(process.env.NUXT_OPENNDS_TIMEOUT_MS || '5000'),
    dhcpAgentBaseUrl: process.env.NUXT_DHCP_AGENT_BASE_URL || 'http://127.0.0.1:4400',
    dhcpAgentToken: process.env.NUXT_DHCP_AGENT_TOKEN || '',
    public: {
      portalContinueUrl: process.env.NUXT_PUBLIC_PORTAL_CONTINUE_URL || 'https://www.example.com',
      portalLogoText: process.env.NUXT_PUBLIC_PORTAL_LOGO_TEXT || 'Hospital Wi-Fi',
    },
  },
  vite: {
    plugins: [tailwindcss() as any],
  },
})
