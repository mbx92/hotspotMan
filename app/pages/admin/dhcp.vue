<script setup lang="ts">
import type {
  DhcpAgentStatus,
  DhcpApplyResponse,
  DhcpPreviewResponse,
  DhcpProvider,
  DhcpReservationRecord,
  DhcpSettingsRecord,
} from '~/types'

definePageMeta({
  middleware: ['admin-auth'],
})

type DhcpTab = 'provider' | 'reservations' | 'preview' | 'agent'

const activeTab = ref<DhcpTab>('provider')

const { data: dhcpSettings, refresh: refreshDhcpSettings } = await useFetch<DhcpSettingsRecord>('/api/admin/dhcp-settings')
const { data: dhcpReservations, refresh: refreshDhcpReservations } = await useFetch<DhcpReservationRecord[]>('/api/admin/dhcp-reservations')
const { data: dhcpPreview, refresh: refreshDhcpPreview } = await useFetch<DhcpPreviewResponse>('/api/admin/dhcp-preview')
const { data: dhcpAgentStatus, refresh: refreshDhcpAgentStatus } = await useFetch<DhcpAgentStatus>('/api/admin/dhcp-agent')

const settingsForm = reactive({
  provider: 'DNSMASQ' as DhcpProvider,
  enabled: true,
  interfaceName: 'br-lan',
  listenAddress: '',
  subnet: '192.168.30.0/24',
  rangeStart: '192.168.30.50',
  rangeEnd: '192.168.30.200',
  routerIp: '192.168.30.1',
  dnsServers: '1.1.1.1,8.8.8.8',
  domainName: '',
  leaseTime: '12h',
  dnsmasqConfigPath: '/etc/dnsmasq.d/hotspotman.conf',
  keaConfigPath: '/etc/kea/kea-dhcp4.conf',
})

const createReservationForm = reactive({
  mac: '',
  ip: '',
  hostname: '',
  description: '',
})

const selectedReservationId = ref('')
const updateReservationForm = reactive({
  mac: '',
  ip: '',
  hostname: '',
  description: '',
})

const savingSettings = ref(false)
const savingReservation = ref(false)
const updatingReservation = ref(false)
const applyingDhcp = ref(false)

const settingsMessage = ref('')
const reservationMessage = ref('')
const updateReservationMessage = ref('')
const applyMessage = ref('')

watchEffect(() => {
  if (!dhcpSettings.value) {
    return
  }

  settingsForm.provider = dhcpSettings.value.provider
  settingsForm.enabled = dhcpSettings.value.enabled
  settingsForm.interfaceName = dhcpSettings.value.interfaceName
  settingsForm.listenAddress = dhcpSettings.value.listenAddress || ''
  settingsForm.subnet = dhcpSettings.value.subnet
  settingsForm.rangeStart = dhcpSettings.value.rangeStart
  settingsForm.rangeEnd = dhcpSettings.value.rangeEnd
  settingsForm.routerIp = dhcpSettings.value.routerIp
  settingsForm.dnsServers = dhcpSettings.value.dnsServers
  settingsForm.domainName = dhcpSettings.value.domainName || ''
  settingsForm.leaseTime = dhcpSettings.value.leaseTime
  settingsForm.dnsmasqConfigPath = dhcpSettings.value.dnsmasqConfigPath || ''
  settingsForm.keaConfigPath = dhcpSettings.value.keaConfigPath || ''
})

watchEffect(() => {
  const reservations = dhcpReservations.value || []

  if (!reservations.length) {
    selectedReservationId.value = ''
    return
  }

  if (!selectedReservationId.value || !reservations.some((item) => item.id === selectedReservationId.value)) {
    selectedReservationId.value = reservations[0]?.id || ''
  }

  const selected = reservations.find((item) => item.id === selectedReservationId.value)

  if (!selected) {
    return
  }

  updateReservationForm.mac = selected.mac
  updateReservationForm.ip = selected.ip
  updateReservationForm.hostname = selected.hostname || ''
  updateReservationForm.description = selected.description || ''
})

const providerOptions: Array<{ value: DhcpProvider, label: string, help: string }> = [
  { value: 'DNSMASQ', label: 'dnsmasq', help: 'Lebih ringan dan praktis untuk gateway Linux kecil atau edge hotspot.' },
  { value: 'KEA', label: 'Kea DHCP', help: 'Lebih proper untuk production dan lebih cocok untuk konfigurasi enterprise yang berkembang.' },
]

const selectedReservation = computed(() => (dhcpReservations.value || []).find((item) => item.id === selectedReservationId.value) || null)
const usingDnsmasq = computed(() => settingsForm.provider === 'DNSMASQ')
const usingKea = computed(() => settingsForm.provider === 'KEA')
const totalReservations = computed(() => dhcpReservations.value?.length || 0)
const enabledLabel = computed(() => settingsForm.enabled ? 'Enabled' : 'Disabled')

async function refreshDhcpData() {
  await Promise.all([
    refreshDhcpSettings(),
    refreshDhcpReservations(),
    refreshDhcpPreview(),
    refreshDhcpAgentStatus(),
  ])
}

async function saveDhcpSettings() {
  savingSettings.value = true
  settingsMessage.value = ''

  try {
    await $fetch('/api/admin/dhcp-settings', {
      method: 'POST',
      body: {
        ...settingsForm,
        listenAddress: settingsForm.listenAddress || null,
        domainName: settingsForm.domainName || null,
        dnsmasqConfigPath: settingsForm.dnsmasqConfigPath || null,
        keaConfigPath: settingsForm.keaConfigPath || null,
      },
    })

    await Promise.all([refreshDhcpSettings(), refreshDhcpPreview()])
    settingsMessage.value = 'DHCP settings saved.'
  }
  catch (error) {
    settingsMessage.value = error instanceof Error ? error.message : 'Failed to save DHCP settings'
  }
  finally {
    savingSettings.value = false
  }
}

async function createReservation() {
  savingReservation.value = true
  reservationMessage.value = ''

  try {
    await $fetch('/api/admin/dhcp-reservations', {
      method: 'POST',
      body: {
        ...createReservationForm,
        hostname: createReservationForm.hostname || null,
        description: createReservationForm.description || null,
      },
    })

    createReservationForm.mac = ''
    createReservationForm.ip = ''
    createReservationForm.hostname = ''
    createReservationForm.description = ''

    await Promise.all([refreshDhcpReservations(), refreshDhcpPreview()])
    reservationMessage.value = 'Reservation created.'
  }
  catch (error) {
    reservationMessage.value = error instanceof Error ? error.message : 'Failed to create reservation'
  }
  finally {
    savingReservation.value = false
  }
}

async function updateReservation() {
  if (!selectedReservationId.value) {
    return
  }

  updatingReservation.value = true
  updateReservationMessage.value = ''

  try {
    await $fetch('/api/admin/dhcp-reservations-update', {
      method: 'POST',
      body: {
        id: selectedReservationId.value,
        ...updateReservationForm,
        hostname: updateReservationForm.hostname || null,
        description: updateReservationForm.description || null,
      },
    })

    await Promise.all([refreshDhcpReservations(), refreshDhcpPreview()])
    updateReservationMessage.value = 'Reservation updated.'
  }
  catch (error) {
    updateReservationMessage.value = error instanceof Error ? error.message : 'Failed to update reservation'
  }
  finally {
    updatingReservation.value = false
  }
}

async function applyDhcp() {
  applyingDhcp.value = true
  applyMessage.value = ''

  try {
    const result = await $fetch<DhcpApplyResponse>('/api/admin/dhcp-apply', {
      method: 'POST',
      body: { provider: settingsForm.provider },
    })

    await refreshDhcpAgentStatus()
    applyMessage.value = result.message
  }
  catch (error) {
    applyMessage.value = error instanceof Error ? error.message : 'Failed to apply DHCP configuration'
  }
  finally {
    applyingDhcp.value = false
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
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Network Services</p>
        <h1 class="text-3xl font-semibold text-base-content">DHCP Administration</h1>
        <p class="text-sm text-base-content/60">Kelola konfigurasi DHCP berbasis dnsmasq atau Kea, reservation statis, preview config, dan apply lewat agent Linux lokal.</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <NuxtLink to="/admin" class="btn btn-ghost btn-sm">Dashboard</NuxtLink>
        <NuxtLink to="/admin/settings" class="btn btn-ghost btn-sm">Settings</NuxtLink>
        <NuxtLink to="/admin/dhcp" class="btn btn-primary btn-sm">DHCP</NuxtLink>
        <button class="btn btn-ghost btn-sm" type="button" @click="logout">Sign out</button>
      </div>
    </header>

    <section class="grid gap-4 md:grid-cols-4">
      <article class="border border-base-300 bg-base-100 p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">Provider</p>
        <p class="mt-3 text-2xl font-semibold text-primary">{{ settingsForm.provider }}</p>
      </article>

      <article class="border border-base-300 bg-base-100 p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">Service State</p>
        <p class="mt-3 text-2xl font-semibold text-primary">{{ enabledLabel }}</p>
      </article>

      <article class="border border-base-300 bg-base-100 p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">Reservations</p>
        <p class="mt-3 text-2xl font-semibold text-primary">{{ totalReservations }}</p>
      </article>

      <article class="border border-base-300 bg-base-100 p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">Agent</p>
        <p class="mt-3 text-2xl font-semibold text-primary">{{ dhcpAgentStatus?.reachable ? 'Reachable' : 'Offline' }}</p>
      </article>
    </section>

    <section class="border border-base-300 bg-base-100 p-4 sm:p-6">
      <div class="border-b border-base-300 pb-4">
        <div role="tablist" class="tabs tabs-box bg-base-200 p-1">
          <button type="button" role="tab" class="tab flex-1" :class="activeTab === 'provider' ? 'tab-active' : ''" @click="activeTab = 'provider'">Provider</button>
          <button type="button" role="tab" class="tab flex-1" :class="activeTab === 'reservations' ? 'tab-active' : ''" @click="activeTab = 'reservations'">Reservations</button>
          <button type="button" role="tab" class="tab flex-1" :class="activeTab === 'preview' ? 'tab-active' : ''" @click="activeTab = 'preview'">Preview & Apply</button>
          <button type="button" role="tab" class="tab flex-1" :class="activeTab === 'agent' ? 'tab-active' : ''" @click="activeTab = 'agent'">Agent</button>
        </div>
      </div>

      <div v-if="activeTab === 'provider'" class="grid gap-6 pt-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article class="border border-base-300 bg-base-100 p-6">
          <header class="mb-4">
            <h2 class="text-xl font-semibold text-base-content">Provider Settings</h2>
            <p class="text-sm text-base-content/60">Pilih provider DHCP aktif dan simpan parameter jaringan yang dipakai untuk generate config.</p>
          </header>

          <form class="space-y-4" @submit.prevent="saveDhcpSettings">
            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Provider</legend>
              <select v-model="settingsForm.provider" class="select select-bordered w-full">
                <option v-for="option in providerOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
              <p class="mt-2 text-sm text-base-content/60">{{ providerOptions.find((option) => option.value === settingsForm.provider)?.help }}</p>
            </fieldset>

            <label class="label cursor-pointer justify-start gap-3 border border-base-300 bg-base-200 px-4 py-3">
              <input v-model="settingsForm.enabled" type="checkbox" class="checkbox checkbox-sm">
              <span class="label-text">DHCP service enabled</span>
            </label>

            <div class="grid gap-4 md:grid-cols-2">
              <fieldset class="fieldset">
                <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Interface</legend>
                <input v-model="settingsForm.interfaceName" type="text" class="input input-bordered w-full" required>
              </fieldset>

              <fieldset class="fieldset">
                <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Listen Address</legend>
                <input v-model="settingsForm.listenAddress" type="text" class="input input-bordered w-full" placeholder="192.168.30.1">
              </fieldset>
            </div>

            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Subnet</legend>
              <input v-model="settingsForm.subnet" type="text" class="input input-bordered w-full" required>
            </fieldset>

            <div class="grid gap-4 md:grid-cols-3">
              <fieldset class="fieldset">
                <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Range Start</legend>
                <input v-model="settingsForm.rangeStart" type="text" class="input input-bordered w-full" required>
              </fieldset>

              <fieldset class="fieldset">
                <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Range End</legend>
                <input v-model="settingsForm.rangeEnd" type="text" class="input input-bordered w-full" required>
              </fieldset>

              <fieldset class="fieldset">
                <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Router IP</legend>
                <input v-model="settingsForm.routerIp" type="text" class="input input-bordered w-full" required>
              </fieldset>
            </div>

            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">DNS Servers</legend>
              <input v-model="settingsForm.dnsServers" type="text" class="input input-bordered w-full" required>
            </fieldset>

            <div class="grid gap-4 md:grid-cols-2">
              <fieldset class="fieldset">
                <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Domain Name</legend>
                <input v-model="settingsForm.domainName" type="text" class="input input-bordered w-full" placeholder="hospital.local">
              </fieldset>

              <fieldset class="fieldset">
                <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Lease Time</legend>
                <input v-model="settingsForm.leaseTime" type="text" class="input input-bordered w-full" required>
              </fieldset>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <fieldset class="fieldset">
                <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">dnsmasq Config Path</legend>
                <input v-model="settingsForm.dnsmasqConfigPath" type="text" class="input input-bordered w-full">
              </fieldset>

              <fieldset class="fieldset">
                <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Kea Config Path</legend>
                <input v-model="settingsForm.keaConfigPath" type="text" class="input input-bordered w-full">
              </fieldset>
            </div>

            <p v-if="settingsMessage" class="text-sm" :class="settingsMessage.includes('saved') ? 'text-success' : 'text-error'">{{ settingsMessage }}</p>

            <button class="btn btn-primary btn-sm" type="submit" :disabled="savingSettings">
              {{ savingSettings ? 'Saving...' : 'Save DHCP settings' }}
            </button>
          </form>
        </article>

        <article class="border border-base-300 bg-base-100 p-6">
          <header class="mb-4">
            <h2 class="text-xl font-semibold text-base-content">Provider Guidance</h2>
            <p class="text-sm text-base-content/60">Pilih provider berdasarkan kebutuhan gateway dan skala production.</p>
          </header>

          <div class="space-y-4 text-sm text-base-content/70">
            <div class="border border-base-300 bg-base-200 p-4">
              <p class="font-semibold text-base-content">dnsmasq</p>
              <p class="mt-2">Ringan, cepat, cocok untuk gateway hotspot yang juga menangani DNS caching dan DHCP sederhana.</p>
            </div>

            <div class="border border-base-300 bg-base-200 p-4">
              <p class="font-semibold text-base-content">Kea DHCP</p>
              <p class="mt-2">Lebih proper untuk production, lebih mudah dikembangkan, dan lebih cocok bila nanti DHCP dipisah dari gateway edge.</p>
            </div>

            <div class="border border-base-300 bg-base-200 p-4">
              <p class="font-semibold text-base-content">Safe Apply Model</p>
              <p class="mt-2">Nuxt hanya menyimpan dan mengirim config ke agent lokal. Agent localhost melakukan validasi config dan reload service terpilih.</p>
            </div>
          </div>
        </article>
      </div>

      <div v-else-if="activeTab === 'reservations'" class="grid gap-6 pt-6 xl:grid-cols-[1fr_1fr]">
        <article class="border border-base-300 bg-base-100 p-6">
          <header class="mb-4">
            <h2 class="text-xl font-semibold text-base-content">Create Reservation</h2>
            <p class="text-sm text-base-content/60">Tambahkan static lease yang akan ikut digenerate ke config dnsmasq atau Kea.</p>
          </header>

          <form class="grid gap-4 border border-base-300 bg-base-200 p-4" @submit.prevent="createReservation">
            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">MAC Address</legend>
              <input v-model="createReservationForm.mac" type="text" class="input input-bordered w-full" required>
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">IP Address</legend>
              <input v-model="createReservationForm.ip" type="text" class="input input-bordered w-full" required>
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Hostname</legend>
              <input v-model="createReservationForm.hostname" type="text" class="input input-bordered w-full">
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Description</legend>
              <input v-model="createReservationForm.description" type="text" class="input input-bordered w-full">
            </fieldset>

            <p v-if="reservationMessage" class="text-sm" :class="reservationMessage.includes('created') ? 'text-success' : 'text-error'">{{ reservationMessage }}</p>

            <button class="btn btn-primary btn-sm" type="submit" :disabled="savingReservation">
              {{ savingReservation ? 'Saving...' : 'Create reservation' }}
            </button>
          </form>

          <div class="mt-6 overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>MAC</th>
                  <th>IP</th>
                  <th>Hostname</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="reservation in dhcpReservations || []" :key="reservation.id">
                  <td>{{ reservation.mac }}</td>
                  <td>{{ reservation.ip }}</td>
                  <td>{{ reservation.hostname || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="border border-base-300 bg-base-100 p-6">
          <header class="mb-4">
            <h2 class="text-xl font-semibold text-base-content">Update Reservation</h2>
            <p class="text-sm text-base-content/60">Sesuaikan lease statis yang sudah ada tanpa menyentuh file config secara manual.</p>
          </header>

          <form class="space-y-4" @submit.prevent="updateReservation">
            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Select Reservation</legend>
              <select v-model="selectedReservationId" class="select select-bordered w-full">
                <option v-for="reservation in dhcpReservations || []" :key="reservation.id" :value="reservation.id">
                  {{ reservation.mac }} -> {{ reservation.ip }}
                </option>
              </select>
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">MAC Address</legend>
              <input v-model="updateReservationForm.mac" type="text" class="input input-bordered w-full" :disabled="!selectedReservation">
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">IP Address</legend>
              <input v-model="updateReservationForm.ip" type="text" class="input input-bordered w-full" :disabled="!selectedReservation">
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Hostname</legend>
              <input v-model="updateReservationForm.hostname" type="text" class="input input-bordered w-full" :disabled="!selectedReservation">
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Description</legend>
              <input v-model="updateReservationForm.description" type="text" class="input input-bordered w-full" :disabled="!selectedReservation">
            </fieldset>

            <p v-if="updateReservationMessage" class="text-sm" :class="updateReservationMessage.includes('updated') ? 'text-success' : 'text-error'">{{ updateReservationMessage }}</p>

            <button class="btn btn-primary btn-sm" type="submit" :disabled="updatingReservation || !selectedReservation">
              {{ updatingReservation ? 'Updating...' : 'Update reservation' }}
            </button>
          </form>
        </article>
      </div>

      <div v-else-if="activeTab === 'preview'" class="grid gap-6 pt-6 xl:grid-cols-[1fr_1fr]">
        <article class="border border-base-300 bg-base-100 p-6">
          <header class="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold text-base-content">Rendered Preview</h2>
              <p class="text-sm text-base-content/60">Preview config yang akan dikirim ke agent Linux untuk provider aktif.</p>
            </div>

            <button class="btn btn-ghost btn-sm" type="button" @click="refreshDhcpData">Refresh</button>
          </header>

          <div class="space-y-4">
            <div v-if="usingDnsmasq" class="border border-base-300 bg-base-200 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">dnsmasq preview</p>
              <pre class="mt-3 overflow-x-auto whitespace-pre-wrap text-sm text-base-content">{{ dhcpPreview?.dnsmasqConfig || '' }}</pre>
            </div>

            <div v-if="usingKea" class="border border-base-300 bg-base-200 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">Kea preview</p>
              <pre class="mt-3 overflow-x-auto whitespace-pre-wrap text-sm text-base-content">{{ dhcpPreview?.keaConfig || '' }}</pre>
            </div>
          </div>
        </article>

        <article class="border border-base-300 bg-base-100 p-6">
          <header class="mb-4">
            <h2 class="text-xl font-semibold text-base-content">Apply Configuration</h2>
            <p class="text-sm text-base-content/60">Config hanya di-apply melalui localhost agent dengan bearer token. Nuxt tidak memegang hak root langsung.</p>
          </header>

          <div class="space-y-4">
            <div class="border border-base-300 bg-base-200 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">Target provider</p>
              <p class="mt-2 font-semibold text-base-content">{{ settingsForm.provider }}</p>
            </div>

            <div class="border border-base-300 bg-base-200 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">Agent state</p>
              <p class="mt-2 font-semibold text-base-content">{{ dhcpAgentStatus?.reachable ? 'Reachable on localhost' : 'Unavailable' }}</p>
              <p class="mt-2 text-sm text-base-content/60">{{ dhcpAgentStatus?.message || 'No agent status yet.' }}</p>
            </div>

            <p v-if="applyMessage" class="text-sm" :class="applyMessage.includes('successfully') ? 'text-success' : 'text-error'">{{ applyMessage }}</p>

            <button class="btn btn-primary btn-sm" type="button" :disabled="applyingDhcp || !dhcpAgentStatus?.reachable" @click="applyDhcp">
              {{ applyingDhcp ? 'Applying...' : 'Apply DHCP configuration' }}
            </button>
          </div>
        </article>
      </div>

      <div v-else class="grid gap-6 pt-6 xl:grid-cols-[1fr_1fr]">
        <article class="border border-base-300 bg-base-100 p-6">
          <header class="mb-4">
            <h2 class="text-xl font-semibold text-base-content">Agent Status</h2>
            <p class="text-sm text-base-content/60">Agent Linux lokal menerima config via localhost dan menjalankan validate + reload service yang di-whitelist.</p>
          </header>

          <div class="space-y-4">
            <div class="border border-base-300 bg-base-200 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">Service Name</p>
              <p class="mt-2 font-semibold text-base-content">{{ dhcpAgentStatus?.service || 'hotspotman-dhcp-agent' }}</p>
            </div>

            <div class="border border-base-300 bg-base-200 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">dnsmasq target</p>
              <p class="mt-2 font-semibold text-base-content">{{ dhcpAgentStatus?.dnsmasqTargetPath || '-' }}</p>
            </div>

            <div class="border border-base-300 bg-base-200 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">Kea target</p>
              <p class="mt-2 font-semibold text-base-content">{{ dhcpAgentStatus?.keaTargetPath || '-' }}</p>
            </div>

            <button class="btn btn-ghost btn-sm" type="button" @click="refreshDhcpAgentStatus">Refresh agent status</button>
          </div>
        </article>

        <article class="border border-base-300 bg-base-100 p-6">
          <header class="mb-4">
            <h2 class="text-xl font-semibold text-base-content">Safe Agent Design</h2>
            <p class="text-sm text-base-content/60">Model eksekusi yang menjaga Nuxt tetap non-root dan membatasi blast radius operasi sistem.</p>
          </header>

          <div class="space-y-4 text-sm text-base-content/70">
            <div class="border border-base-300 bg-base-200 p-4">
              <p class="font-semibold text-base-content">1. Localhost-only</p>
              <p class="mt-2">Agent bind ke `127.0.0.1` dan menolak semua request tanpa bearer token.</p>
            </div>

            <div class="border border-base-300 bg-base-200 p-4">
              <p class="font-semibold text-base-content">2. Whitelisted actions only</p>
              <p class="mt-2">Agent hanya menerima apply config `DNSMASQ` atau `KEA`, lalu menjalankan validate dan reload service yang sudah di-hardcode.</p>
            </div>

            <div class="border border-base-300 bg-base-200 p-4">
              <p class="font-semibold text-base-content">3. No root in Nuxt</p>
              <p class="mt-2">Nuxt hanya menyimpan config, generate preview, dan mengirimnya ke agent. Hak istimewa sistem tetap berada di proses agent / systemd service.</p>
            </div>

            <div class="border border-base-300 bg-base-200 p-4">
              <p class="font-semibold text-base-content">4. Staging then copy</p>
              <p class="mt-2">Agent menulis config ke staging file, menjalankan test command, baru menyalin ke path final dan `systemctl reload` jika valid.</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>