<script setup lang="ts">
import type { AdminProfile, AdminStats, BannerResponse, HotspotMode, HotspotSettingsRecord, SessionRecord } from '~/types'

definePageMeta({
  middleware: ['admin-auth'],
})

const { data: admin } = await useFetch<AdminProfile>('/api/admin/me')
const { data: stats, refresh: refreshStats } = await useFetch<AdminStats>('/api/admin/stats')
const { data: sessions, refresh: refreshSessions } = await useFetch<SessionRecord[]>('/api/sessions')
const { data: bannerResponse, refresh: refreshBanner } = await useFetch<BannerResponse>('/api/banner')
const { data: hotspotSettings, refresh: refreshHotspotSettings } = await useFetch<HotspotSettingsRecord>('/api/admin/hotspot-settings')

const activeBanner = computed(() => bannerResponse.value?.banner || null)
const recentActiveSessions = computed(() => (sessions.value || []).filter((session) => !session.logoutAt).length)
const latestLogin = computed(() => sessions.value?.[0]?.loginAt || null)
const hotspotModeOptions: Array<{ value: HotspotMode, label: string, help: string }> = [
  { value: 'CLICK_THROUGH', label: 'Click Through', help: 'Pengguna cukup menekan tombol lanjut tanpa akun.' },
  { value: 'LOCAL_CREDENTIALS', label: 'Username / Password Lokal', help: 'OpenNDS memakai form login, validasi dilakukan backend aplikasi.' },
  { value: 'RADIUS', label: 'RADIUS', help: 'OpenNDS mendelegasikan autentikasi ke server RADIUS.' },
]

const bannerForm = reactive({
  title: '',
  imageUrl: '',
})
const bannerSaving = ref(false)
const hotspotSaving = ref(false)
const hotspotMessage = ref('')
const hotspotForm = reactive({
  mode: 'CLICK_THROUGH' as HotspotMode,
  gatewayName: 'Hospital Wi-Fi',
  landingPageUrl: '',
  sessionTimeoutMinutes: 480,
  radiusServer: '',
  radiusAuthPort: 1812,
  radiusAcctPort: 1813,
  radiusSecret: '',
})

watchEffect(() => {
  if (!hotspotSettings.value) {
    return
  }

  hotspotForm.mode = hotspotSettings.value.mode
  hotspotForm.gatewayName = hotspotSettings.value.gatewayName
  hotspotForm.landingPageUrl = hotspotSettings.value.landingPageUrl || ''
  hotspotForm.sessionTimeoutMinutes = hotspotSettings.value.sessionTimeoutMinutes
  hotspotForm.radiusServer = hotspotSettings.value.radiusServer || ''
  hotspotForm.radiusAuthPort = hotspotSettings.value.radiusAuthPort
  hotspotForm.radiusAcctPort = hotspotSettings.value.radiusAcctPort
  hotspotForm.radiusSecret = hotspotSettings.value.radiusSecret || ''
})

const requiresRadius = computed(() => hotspotForm.mode === 'RADIUS')

async function saveHotspotSettings() {
  hotspotSaving.value = true
  hotspotMessage.value = ''

  try {
    await $fetch('/api/admin/hotspot-settings', {
      method: 'POST',
      body: {
        ...hotspotForm,
        landingPageUrl: hotspotForm.landingPageUrl || null,
        radiusServer: hotspotForm.radiusServer || null,
        radiusSecret: hotspotForm.radiusSecret || null,
      },
    })

    await refreshHotspotSettings()
    hotspotMessage.value = 'Hotspot mode saved successfully.'
  }
  catch (error) {
    hotspotMessage.value = error instanceof Error ? error.message : 'Failed to save hotspot mode'
  }
  finally {
    hotspotSaving.value = false
  }
}

async function createBanner() {
  bannerSaving.value = true

  try {
    await $fetch('/api/banner', {
      method: 'POST',
      body: {
        ...bannerForm,
        isActive: true,
      },
    })

    bannerForm.title = ''
    bannerForm.imageUrl = ''

    await Promise.all([refreshBanner(), refreshStats(), refreshSessions()])
  }
  finally {
    bannerSaving.value = false
  }
}

async function logout() {
  await $fetch('/api/admin/logout', { method: 'POST' })
  await navigateTo('/admin/login')
}
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-8">
    <header class="flex flex-col gap-4 border border-base-300 bg-base-100 p-6 md:flex-row md:items-center md:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Admin Dashboard</p>
        <h1 class="text-3xl font-semibold text-base-content">Hotspot Operations</h1>
        <p class="text-sm text-base-content/60">Monitor sessions, manage banners, and supervise hotspot access.</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <NuxtLink to="/admin" class="btn btn-primary btn-sm">Dashboard</NuxtLink>
        <NuxtLink to="/admin/settings" class="btn btn-ghost btn-sm">Settings</NuxtLink>
        <NuxtLink to="/admin/dhcp" class="btn btn-ghost btn-sm">DHCP</NuxtLink>
        <button class="btn btn-ghost btn-sm" type="button" @click="logout">Sign out</button>
      </div>
    </header>

    <section class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <article class="border border-base-300 bg-base-100 p-6">
        <div class="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div class="space-y-3">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Login Successful</p>
            <h2 class="text-2xl font-semibold text-base-content">Welcome back, {{ admin?.username || 'Administrator' }}</h2>
            <p class="max-w-2xl text-sm leading-6 text-base-content/60">
              You are now in the hospital hotspot control panel. Use this page to review connected users and change the active portal banner without leaving the network segment.
            </p>
          </div>

          <div class="min-w-64 border border-base-300 bg-base-200 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">Session Summary</p>
            <dl class="mt-3 space-y-3 text-sm">
              <div class="flex items-center justify-between gap-4">
                <dt class="text-base-content/60">Current active in list</dt>
                <dd class="font-semibold text-base-content">{{ recentActiveSessions }}</dd>
              </div>
              <div class="flex items-center justify-between gap-4">
                <dt class="text-base-content/60">Latest login</dt>
                <dd class="text-right font-semibold text-base-content">
                  {{ latestLogin ? new Date(latestLogin).toLocaleString() : 'No session yet' }}
                </dd>
              </div>
              <div class="flex items-center justify-between gap-4">
                <dt class="text-base-content/60">Active banner</dt>
                <dd>
                  <span class="badge badge-soft" :class="activeBanner ? 'badge-success' : 'badge-warning'">
                    {{ activeBanner ? 'Configured' : 'Missing' }}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </article>

      <article class="border border-base-300 bg-base-100 p-6">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Admin Identity</p>
        <div class="mt-4 space-y-4">
          <div>
            <p class="text-sm text-base-content/60">Username</p>
            <p class="text-xl font-semibold text-base-content">{{ admin?.username || '-' }}</p>
          </div>
          <div>
            <p class="text-sm text-base-content/60">Created</p>
            <p class="text-base font-medium text-base-content">{{ admin?.createdAt ? new Date(admin.createdAt).toLocaleString() : '-' }}</p>
          </div>
          <div>
            <p class="text-sm text-base-content/60">Access policy</p>
            <p class="text-base font-medium text-base-content">Restricted to internal admin subnet</p>
          </div>
        </div>
      </article>
    </section>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article class="border border-base-300 bg-base-100 p-6">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">Active Users</p>
        <p class="mt-3 text-4xl font-semibold text-primary">{{ stats?.activeUsers ?? 0 }}</p>
      </article>

      <article class="border border-base-300 bg-base-100 p-6">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">Sessions Today</p>
        <p class="mt-3 text-4xl font-semibold text-primary">{{ stats?.sessionsToday ?? 0 }}</p>
      </article>

      <article class="border border-base-300 bg-base-100 p-6">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">Banner Status</p>
        <p class="mt-3 text-2xl font-semibold text-base-content">{{ activeBanner ? 'Active' : 'Not Set' }}</p>
        <p class="mt-2 text-sm text-base-content/60">Only one banner should be active for the captive portal.</p>
      </article>

      <article class="border border-base-300 bg-base-100 p-6">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">Recent Active Rows</p>
        <p class="mt-3 text-4xl font-semibold text-primary">{{ recentActiveSessions }}</p>
        <p class="mt-2 text-sm text-base-content/60">Calculated from the latest 50 sessions displayed below.</p>
      </article>

      <article class="border border-base-300 bg-base-100 p-6">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">Hotspot Mode</p>
        <p class="mt-3 text-2xl font-semibold text-base-content">{{ hotspotSettings?.mode || 'CLICK_THROUGH' }}</p>
        <p class="mt-2 text-sm text-base-content/60">Current authentication strategy for captive portal users.</p>
      </article>
    </section>

    <section class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <article class="border border-base-300 bg-base-100 p-6">
        <header class="mb-4">
          <h2 class="text-xl font-semibold text-base-content">Hotspot Mode Settings</h2>
          <p class="text-sm text-base-content/60">Atur model autentikasi hotspot seperti click-through, login lokal, atau RADIUS.</p>
        </header>

        <form class="space-y-4" @submit.prevent="saveHotspotSettings">
          <fieldset class="fieldset">
            <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Mode</legend>
            <select v-model="hotspotForm.mode" class="select select-bordered w-full">
              <option v-for="option in hotspotModeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <p class="mt-2 text-sm text-base-content/60">
              {{ hotspotModeOptions.find((option) => option.value === hotspotForm.mode)?.help }}
            </p>
          </fieldset>

          <fieldset class="fieldset">
            <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Gateway Name</legend>
            <input v-model="hotspotForm.gatewayName" type="text" class="input input-bordered w-full" required>
          </fieldset>

          <fieldset class="fieldset">
            <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Landing Page URL</legend>
            <input v-model="hotspotForm.landingPageUrl" type="url" class="input input-bordered w-full" placeholder="https://hospital.local/welcome">
          </fieldset>

          <fieldset class="fieldset">
            <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Session Timeout (minutes)</legend>
            <input v-model.number="hotspotForm.sessionTimeoutMinutes" type="number" min="1" class="input input-bordered w-full" required>
          </fieldset>

          <div v-if="requiresRadius" class="grid gap-4 border border-base-300 bg-base-200 p-4 md:grid-cols-2">
            <fieldset class="fieldset md:col-span-2">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">RADIUS Server</legend>
              <input v-model="hotspotForm.radiusServer" type="text" class="input input-bordered w-full" placeholder="192.168.30.10" required>
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Auth Port</legend>
              <input v-model.number="hotspotForm.radiusAuthPort" type="number" min="1" class="input input-bordered w-full" required>
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Accounting Port</legend>
              <input v-model.number="hotspotForm.radiusAcctPort" type="number" min="1" class="input input-bordered w-full" required>
            </fieldset>

            <fieldset class="fieldset md:col-span-2">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Shared Secret</legend>
              <input v-model="hotspotForm.radiusSecret" type="password" class="input input-bordered w-full" required>
            </fieldset>
          </div>

          <p v-if="hotspotMessage" class="text-sm" :class="hotspotMessage.includes('successfully') ? 'text-success' : 'text-error'">
            {{ hotspotMessage }}
          </p>

          <button class="btn btn-primary btn-sm" type="submit" :disabled="hotspotSaving">
            {{ hotspotSaving ? 'Saving...' : 'Save hotspot mode' }}
          </button>
        </form>
      </article>

      <article class="border border-base-300 bg-base-100 p-6">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-base-content">Recent Sessions</h2>
            <p class="text-sm text-base-content/60">Latest 50 authorized hotspot sessions.</p>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>User</th>
                <th>MAC</th>
                <th>IP</th>
                <th>Mode</th>
                <th>Login</th>
                <th>Logout</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="session in sessions || []" :key="session.id">
                <td>{{ session.hotspotUsername || 'Guest' }}</td>
                <td>{{ session.mac }}</td>
                <td>{{ session.ip }}</td>
                <td>{{ session.authMode }}</td>
                <td>{{ new Date(session.loginAt).toLocaleString() }}</td>
                <td>
                  <span v-if="session.logoutAt">{{ new Date(session.logoutAt).toLocaleString() }}</span>
                  <span v-else class="badge badge-soft badge-success">Active</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="border border-base-300 bg-base-100 p-6 lg:col-start-2">
        <header class="mb-4">
          <h2 class="text-xl font-semibold text-base-content">Banner Management</h2>
          <p class="text-sm text-base-content/60">Set the active captive portal banner.</p>
        </header>

        <div v-if="activeBanner" class="mb-6 border border-base-300 bg-base-200 p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">Active Banner</p>
          <p class="mt-2 font-medium text-base-content">{{ activeBanner.title }}</p>
          <img :src="activeBanner.imageUrl" :alt="activeBanner.title" class="mt-3 h-40 w-full object-cover">
        </div>

        <form class="space-y-4" @submit.prevent="createBanner">
          <fieldset class="fieldset">
            <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Title</legend>
            <input v-model="bannerForm.title" type="text" class="input input-bordered w-full" required>
          </fieldset>

          <fieldset class="fieldset">
            <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Image URL</legend>
            <input v-model="bannerForm.imageUrl" type="url" class="input input-bordered w-full" required>
          </fieldset>

          <button class="btn btn-primary btn-sm" type="submit" :disabled="bannerSaving">
            {{ bannerSaving ? 'Saving...' : 'Save banner' }}
          </button>
        </form>
      </article>
    </section>
  </main>
</template>