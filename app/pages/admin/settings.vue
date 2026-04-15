<script setup lang="ts">
import type { HotspotMode, HotspotSettingsRecord, HotspotUserRecord, RadiusIntegrationProfile } from '~/types'

definePageMeta({
  middleware: ['admin-auth'],
})

const { data: hotspotSettings, refresh: refreshHotspotSettings } = await useFetch<HotspotSettingsRecord>('/api/admin/hotspot-settings')
const { data: hotspotUsers, refresh: refreshHotspotUsers } = await useFetch<HotspotUserRecord[]>('/api/admin/hotspot-users')
const { data: radiusProfile, refresh: refreshRadiusProfile } = await useFetch<RadiusIntegrationProfile>('/api/admin/radius-profile')

type SettingsTab = 'mode' | 'users' | 'radius'

const activeTab = ref<SettingsTab>('mode')

const hotspotModeOptions: Array<{ value: HotspotMode, label: string, help: string }> = [
  { value: 'CLICK_THROUGH', label: 'Click Through', help: 'Pengguna cukup menekan tombol lanjut tanpa akun.' },
  { value: 'LOCAL_CREDENTIALS', label: 'Username / Password Lokal', help: 'Pengguna login memakai akun hotspot yang dikelola dari dashboard admin.' },
  { value: 'RADIUS', label: 'RADIUS', help: 'Gateway OpenNDS mengautentikasi user ke FreeRADIUS dengan shared secret.' },
]

const hotspotForm = reactive({
  mode: 'CLICK_THROUGH' as HotspotMode,
  gatewayName: 'Hospital Wi-Fi',
  landingPageUrl: '',
  sessionTimeoutMinutes: 480,
  radiusClientIp: '',
  radiusNasIdentifier: '',
  radiusServer: '',
  radiusAuthPort: 1812,
  radiusAcctPort: 1813,
  radiusSecret: '',
})

const newUserForm = reactive({
  username: '',
  fullName: '',
  password: '',
})

const selectedUserId = ref('')
const selectedUserForm = reactive({
  fullName: '',
  password: '',
  isActive: true,
})

const hotspotSaving = ref(false)
const userSaving = ref(false)
const updateSaving = ref(false)
const hotspotMessage = ref('')
const userMessage = ref('')
const updateMessage = ref('')

watchEffect(() => {
  if (!hotspotSettings.value) {
    return
  }

  hotspotForm.mode = hotspotSettings.value.mode
  hotspotForm.gatewayName = hotspotSettings.value.gatewayName
  hotspotForm.landingPageUrl = hotspotSettings.value.landingPageUrl || ''
  hotspotForm.sessionTimeoutMinutes = hotspotSettings.value.sessionTimeoutMinutes
  hotspotForm.radiusClientIp = hotspotSettings.value.radiusClientIp || ''
  hotspotForm.radiusNasIdentifier = hotspotSettings.value.radiusNasIdentifier || ''
  hotspotForm.radiusServer = hotspotSettings.value.radiusServer || ''
  hotspotForm.radiusAuthPort = hotspotSettings.value.radiusAuthPort
  hotspotForm.radiusAcctPort = hotspotSettings.value.radiusAcctPort
  hotspotForm.radiusSecret = hotspotSettings.value.radiusSecret || ''
})

watchEffect(() => {
  const users = hotspotUsers.value || []

  if (!users.length) {
    selectedUserId.value = ''
    return
  }

  if (!selectedUserId.value || !users.some((user) => user.id === selectedUserId.value)) {
    selectedUserId.value = users[0]?.id || ''
  }

  const selectedUser = users.find((user) => user.id === selectedUserId.value)

  if (!selectedUser) {
    return
  }

  selectedUserForm.fullName = selectedUser.fullName || ''
  selectedUserForm.password = ''
  selectedUserForm.isActive = selectedUser.isActive
})

const selectedUser = computed(() => (hotspotUsers.value || []).find((user) => user.id === selectedUserId.value) || null)
const requiresRadius = computed(() => hotspotForm.mode === 'RADIUS')
const usesLocalCredentials = computed(() => hotspotForm.mode === 'LOCAL_CREDENTIALS')
const totalHotspotUsers = computed(() => hotspotUsers.value?.length || 0)
const activeHotspotUsers = computed(() => (hotspotUsers.value || []).filter((user) => user.isActive).length)
const radiusReady = computed(() => Boolean(radiusProfile.value?.openNds.radiusServer && radiusProfile.value?.openNds.radiusSecret))

async function saveHotspotSettings() {
  hotspotSaving.value = true
  hotspotMessage.value = ''

  try {
    await $fetch('/api/admin/hotspot-settings', {
      method: 'POST',
      body: {
        ...hotspotForm,
        landingPageUrl: hotspotForm.landingPageUrl || null,
        radiusClientIp: hotspotForm.radiusClientIp || null,
        radiusNasIdentifier: hotspotForm.radiusNasIdentifier || null,
        radiusServer: hotspotForm.radiusServer || null,
        radiusSecret: hotspotForm.radiusSecret || null,
      },
    })

    await Promise.all([refreshHotspotSettings(), refreshRadiusProfile()])
    hotspotMessage.value = 'Hotspot settings saved.'
  }
  catch (error) {
    hotspotMessage.value = error instanceof Error ? error.message : 'Failed to save hotspot settings'
  }
  finally {
    hotspotSaving.value = false
  }
}

async function createHotspotUser() {
  userSaving.value = true
  userMessage.value = ''

  try {
    await $fetch('/api/admin/hotspot-users', {
      method: 'POST',
      body: newUserForm,
    })

    newUserForm.username = ''
    newUserForm.fullName = ''
    newUserForm.password = ''

    await refreshHotspotUsers()
    userMessage.value = 'Hotspot user created.'
  }
  catch (error) {
    userMessage.value = error instanceof Error ? error.message : 'Failed to create hotspot user'
  }
  finally {
    userSaving.value = false
  }
}

async function updateHotspotUser() {
  if (!selectedUserId.value) {
    return
  }

  updateSaving.value = true
  updateMessage.value = ''

  try {
    await $fetch('/api/admin/hotspot-users/update', {
      method: 'POST',
      body: {
        id: selectedUserId.value,
        fullName: selectedUserForm.fullName,
        password: selectedUserForm.password || undefined,
        isActive: selectedUserForm.isActive,
      },
    })

    selectedUserForm.password = ''
    await refreshHotspotUsers()
    updateMessage.value = 'Hotspot user updated.'
  }
  catch (error) {
    updateMessage.value = error instanceof Error ? error.message : 'Failed to update hotspot user'
  }
  finally {
    updateSaving.value = false
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
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Admin Settings</p>
        <h1 class="text-3xl font-semibold text-base-content">Hotspot Configuration</h1>
        <p class="text-sm text-base-content/60">Pisahkan pengaturan autentikasi, akun user hotspot, dan profil RADIUS dari dashboard operasional.</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <NuxtLink to="/admin" class="btn btn-ghost btn-sm">Dashboard</NuxtLink>
        <NuxtLink to="/admin/settings" class="btn btn-primary btn-sm">Settings</NuxtLink>
        <NuxtLink to="/admin/dhcp" class="btn btn-ghost btn-sm">DHCP</NuxtLink>
        <button class="btn btn-ghost btn-sm" type="button" @click="logout">Sign out</button>
      </div>
    </header>

    <section class="grid gap-4 md:grid-cols-3">
      <article class="border border-base-300 bg-base-100 p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">Current Mode</p>
        <p class="mt-3 text-2xl font-semibold text-primary">{{ hotspotForm.mode }}</p>
        <p class="mt-2 text-sm text-base-content/60">Authentication strategy currently applied to the captive portal.</p>
      </article>

      <article class="border border-base-300 bg-base-100 p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">Local Users</p>
        <p class="mt-3 text-2xl font-semibold text-primary">{{ activeHotspotUsers }}/{{ totalHotspotUsers }}</p>
        <p class="mt-2 text-sm text-base-content/60">Active versus total hotspot accounts available for local login mode.</p>
      </article>

      <article class="border border-base-300 bg-base-100 p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">RADIUS Status</p>
        <p class="mt-3 text-2xl font-semibold text-primary">{{ radiusReady ? 'Ready' : 'Incomplete' }}</p>
        <p class="mt-2 text-sm text-base-content/60">Shared secret and server profile status for OpenNDS to FreeRADIUS integration.</p>
      </article>
    </section>

    <section class="border border-base-300 bg-base-100 p-4 sm:p-6">
      <div class="border-b border-base-300 pb-4">
        <div role="tablist" class="tabs tabs-box bg-base-200 p-1">
          <button
            type="button"
            role="tab"
            class="tab flex-1"
            :class="activeTab === 'mode' ? 'tab-active' : ''"
            @click="activeTab = 'mode'"
          >
            Mode & Gateway
          </button>
          <button
            type="button"
            role="tab"
            class="tab flex-1"
            :class="activeTab === 'users' ? 'tab-active' : ''"
            @click="activeTab = 'users'"
          >
            Local Users
          </button>
          <button
            type="button"
            role="tab"
            class="tab flex-1"
            :class="activeTab === 'radius' ? 'tab-active' : ''"
            @click="activeTab = 'radius'"
          >
            RADIUS
          </button>
        </div>
      </div>

      <div v-if="activeTab === 'mode'" class="grid gap-6 pt-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article class="border border-base-300 bg-base-100 p-6">
          <header class="mb-4">
            <h2 class="text-xl font-semibold text-base-content">Mode & Gateway Basics</h2>
            <p class="text-sm text-base-content/60">Atur mode autentikasi utama dan parameter dasar captive portal.</p>
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

            <div v-if="requiresRadius" class="border border-warning/40 bg-warning/10 p-4 text-sm text-base-content/70">
              Mode RADIUS aktif. Lanjutkan ke tab RADIUS untuk melengkapi client IP, NAS identifier, server, port, dan shared secret.
            </div>

            <p v-if="hotspotMessage" class="text-sm" :class="hotspotMessage.includes('saved') ? 'text-success' : 'text-error'">
              {{ hotspotMessage }}
            </p>

            <button class="btn btn-primary btn-sm" type="submit" :disabled="hotspotSaving">
              {{ hotspotSaving ? 'Saving...' : 'Save mode settings' }}
            </button>
          </form>
        </article>

        <article class="border border-base-300 bg-base-100 p-6">
          <header class="mb-4">
            <h2 class="text-xl font-semibold text-base-content">Implementation Notes</h2>
            <p class="text-sm text-base-content/60">Ringkasan kebutuhan teknis per mode autentikasi.</p>
          </header>

          <div class="space-y-4 text-sm text-base-content/70">
            <div class="border border-base-300 bg-base-200 p-4">
              <p class="font-semibold text-base-content">Click Through</p>
              <p class="mt-2">Cocok untuk akses tamu cepat. Tidak membutuhkan FreeRADIUS atau tabel user hotspot.</p>
            </div>

            <div class="border border-base-300 bg-base-200 p-4">
              <p class="font-semibold text-base-content">Local Credentials</p>
              <p class="mt-2">Membutuhkan akun hotspot lokal di database aplikasi. Portal akan menampilkan form username/password.</p>
            </div>

            <div class="border border-base-300 bg-base-200 p-4">
              <p class="font-semibold text-base-content">RADIUS</p>
              <p class="mt-2">Membutuhkan OpenNDS, FreeRADIUS, shared secret, client IP gateway, dan NAS identifier. Mode ini tidak diautentikasi langsung oleh halaman portal aplikasi.</p>
            </div>

            <div v-if="usesLocalCredentials" class="border border-success/30 bg-success/10 p-4 text-success-content">
              Mode lokal aktif. Pastikan minimal ada satu user hotspot aktif di tab Local Users sebelum menguji login dari portal.
            </div>
          </div>
        </article>
      </div>

      <div v-else-if="activeTab === 'users'" class="grid gap-6 pt-6 xl:grid-cols-[1fr_1fr]">
        <article class="border border-base-300 bg-base-100 p-6">
          <header class="mb-4">
            <h2 class="text-xl font-semibold text-base-content">Create Local User</h2>
            <p class="text-sm text-base-content/60">Tambah akun username/password untuk mode Local Credentials.</p>
          </header>

          <form class="grid gap-4 border border-base-300 bg-base-200 p-4" @submit.prevent="createHotspotUser">
            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Username</legend>
              <input v-model="newUserForm.username" type="text" class="input input-bordered w-full" required>
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Full Name</legend>
              <input v-model="newUserForm.fullName" type="text" class="input input-bordered w-full">
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Password</legend>
              <input v-model="newUserForm.password" type="password" class="input input-bordered w-full" required>
            </fieldset>

            <p v-if="userMessage" class="text-sm" :class="userMessage.includes('created') ? 'text-success' : 'text-error'">
              {{ userMessage }}
            </p>

            <button class="btn btn-primary btn-sm" type="submit" :disabled="userSaving">
              {{ userSaving ? 'Creating...' : 'Create hotspot user' }}
            </button>
          </form>

          <div class="mt-6 overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in hotspotUsers || []" :key="user.id">
                  <td>{{ user.username }}</td>
                  <td>{{ user.fullName || '-' }}</td>
                  <td>
                    <span class="badge badge-soft" :class="user.isActive ? 'badge-success' : 'badge-error'">
                      {{ user.isActive ? 'Active' : 'Disabled' }}
                    </span>
                  </td>
                  <td>{{ new Date(user.createdAt).toLocaleString() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="border border-base-300 bg-base-100 p-6">
          <header class="mb-4">
            <h2 class="text-xl font-semibold text-base-content">Update Existing User</h2>
            <p class="text-sm text-base-content/60">Aktif/nonaktifkan akun atau reset password tanpa membuat user baru.</p>
          </header>

          <form class="space-y-4" @submit.prevent="updateHotspotUser">
            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Select User</legend>
              <select v-model="selectedUserId" class="select select-bordered w-full">
                <option v-for="user in hotspotUsers || []" :key="user.id" :value="user.id">
                  {{ user.username }}
                </option>
              </select>
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Full Name</legend>
              <input v-model="selectedUserForm.fullName" type="text" class="input input-bordered w-full" :disabled="!selectedUser">
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">New Password</legend>
              <input v-model="selectedUserForm.password" type="password" class="input input-bordered w-full" :disabled="!selectedUser" placeholder="Leave blank to keep current password">
            </fieldset>

            <label class="label cursor-pointer justify-start gap-3 border border-base-300 bg-base-200 px-4 py-3">
              <input v-model="selectedUserForm.isActive" type="checkbox" class="checkbox checkbox-sm">
              <span class="label-text">User is active</span>
            </label>

            <p v-if="updateMessage" class="text-sm" :class="updateMessage.includes('updated') ? 'text-success' : 'text-error'">
              {{ updateMessage }}
            </p>

            <button class="btn btn-primary btn-sm" type="submit" :disabled="updateSaving || !selectedUser">
              {{ updateSaving ? 'Updating...' : 'Update user' }}
            </button>
          </form>
        </article>
      </div>

      <div v-else class="grid gap-6 pt-6 xl:grid-cols-[1fr_1fr]">
        <article class="border border-base-300 bg-base-100 p-6">
          <header class="mb-4">
            <h2 class="text-xl font-semibold text-base-content">RADIUS Transport Settings</h2>
            <p class="text-sm text-base-content/60">Lengkapi parameter yang dibutuhkan OpenNDS saat berbicara ke FreeRADIUS.</p>
          </header>

          <form class="space-y-4" @submit.prevent="saveHotspotSettings">
            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">RADIUS Client IP</legend>
              <input v-model="hotspotForm.radiusClientIp" type="text" class="input input-bordered w-full" placeholder="192.168.30.1" :required="requiresRadius">
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">RADIUS NAS Identifier</legend>
              <input v-model="hotspotForm.radiusNasIdentifier" type="text" class="input input-bordered w-full" placeholder="opennds-hospital" :required="requiresRadius">
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">RADIUS Server</legend>
              <input v-model="hotspotForm.radiusServer" type="text" class="input input-bordered w-full" placeholder="192.168.30.10" :required="requiresRadius">
            </fieldset>

            <div class="grid gap-4 md:grid-cols-2">
              <fieldset class="fieldset">
                <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Auth Port</legend>
                <input v-model.number="hotspotForm.radiusAuthPort" type="number" min="1" class="input input-bordered w-full" :required="requiresRadius">
              </fieldset>

              <fieldset class="fieldset">
                <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Accounting Port</legend>
                <input v-model.number="hotspotForm.radiusAcctPort" type="number" min="1" class="input input-bordered w-full" :required="requiresRadius">
              </fieldset>
            </div>

            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Shared Secret</legend>
              <input v-model="hotspotForm.radiusSecret" type="password" class="input input-bordered w-full" :required="requiresRadius">
            </fieldset>

            <p v-if="hotspotMessage" class="text-sm" :class="hotspotMessage.includes('saved') ? 'text-success' : 'text-error'">
              {{ hotspotMessage }}
            </p>

            <button class="btn btn-primary btn-sm" type="submit" :disabled="hotspotSaving">
              {{ hotspotSaving ? 'Saving...' : 'Save RADIUS settings' }}
            </button>
          </form>
        </article>

        <article class="border border-base-300 bg-base-100 p-6">
          <header class="mb-4">
            <h2 class="text-xl font-semibold text-base-content">RADIUS Integration Profile</h2>
            <p class="text-sm text-base-content/60">Nilai referensi yang bisa langsung dipakai untuk OpenNDS dan FreeRADIUS.</p>
          </header>

          <div class="grid gap-4 md:grid-cols-2">
            <article class="border border-base-300 bg-base-200 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">Gateway</p>
              <p class="mt-2 font-semibold text-base-content">{{ radiusProfile?.openNds.gatewayName || '-' }}</p>
            </article>

            <article class="border border-base-300 bg-base-200 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">RADIUS Server</p>
              <p class="mt-2 font-semibold text-base-content">{{ radiusProfile?.openNds.radiusServer || '-' }}</p>
            </article>

            <article class="border border-base-300 bg-base-200 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">NAS Identifier</p>
              <p class="mt-2 font-semibold text-base-content">{{ radiusProfile?.openNds.radiusNasIdentifier || '-' }}</p>
            </article>

            <article class="border border-base-300 bg-base-200 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">Client IP</p>
              <p class="mt-2 font-semibold text-base-content">{{ radiusProfile?.openNds.radiusClientIp || '-' }}</p>
            </article>
          </div>

          <div class="mt-4 border border-base-300 bg-base-200 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">FreeRADIUS clients.conf Snippet</p>
            <pre class="mt-3 overflow-x-auto whitespace-pre-wrap text-sm text-base-content">{{ radiusProfile?.freeRadiusClientSnippet || 'Fill RADIUS settings to generate snippet.' }}</pre>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>
