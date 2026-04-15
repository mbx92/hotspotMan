<script setup lang="ts">
import type { AuthorizeResponse, BannerResponse, PortalConfig } from '~/types'

const route = useRoute()
const config = useRuntimeConfig()
const { data: bannerResponse } = await useFetch<BannerResponse>('/api/banner')
const { data: portalConfig } = await useFetch<PortalConfig>('/api/hotspot-config')

const mac = computed(() => String(route.query.mac || ''))
const ip = computed(() => String(route.query.ip || ''))
const redirectUrl = computed(() => String(route.query.redirectUrl || config.public.portalContinueUrl))
const banner = computed(() => bannerResponse.value?.banner || null)
const hotspotMode = computed(() => portalConfig.value?.mode || 'CLICK_THROUGH')
const gatewayName = computed(() => portalConfig.value?.gatewayName || config.public.portalLogoText)
const requiresCredentials = computed(() => hotspotMode.value === 'LOCAL_CREDENTIALS')
const isRadiusMode = computed(() => hotspotMode.value === 'RADIUS')

const loginForm = reactive({
  username: '',
  password: '',
})

const pending = ref(false)
const errorMessage = ref('')

async function continueToInternet() {
  errorMessage.value = ''
  pending.value = true

  try {
    const response = await $fetch<AuthorizeResponse>('/api/authorize', {
      method: 'POST',
      query: { redirectUrl: redirectUrl.value },
      body: {
        mac: mac.value,
        ip: ip.value,
        username: loginForm.username,
        password: loginForm.password,
      },
    })

    await navigateTo(response.redirectUrl, { external: true })
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Authorization failed'
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10">
    <section class="grid w-full gap-6 border border-base-300 bg-base-100 p-6 lg:grid-cols-[0.9fr_1.1fr] lg:p-10">
      <div class="flex flex-col justify-between gap-8 border border-base-300 bg-primary p-6 text-primary-content">
        <div class="space-y-4">
          <p class="text-xs font-semibold uppercase tracking-[0.25em] text-secondary-content/80">Secure Access</p>
          <h1 class="text-4xl font-semibold">{{ gatewayName }}</h1>
          <p class="max-w-md text-sm leading-6 text-primary-content/80">
            Connected access for patients, visitors, and clinical support teams.
          </p>
        </div>

        <dl class="grid gap-3 text-sm text-primary-content/80">
          <div>
            <dt class="font-semibold text-primary-content">Device MAC</dt>
            <dd>{{ mac || 'Unavailable' }}</dd>
          </div>
          <div>
            <dt class="font-semibold text-primary-content">Assigned IP</dt>
            <dd>{{ ip || 'Unavailable' }}</dd>
          </div>
        </dl>
      </div>

      <div class="flex flex-col justify-between gap-6">
        <div class="space-y-4">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Hospital Portal</p>
          <h2 class="text-3xl font-semibold text-base-content">Internet access authorization</h2>
          <p class="max-w-2xl text-sm leading-6 text-base-content/60">
            Review the current announcement below, then continue to authenticate this device with the hotspot gateway.
          </p>
        </div>

        <article v-if="banner" class="overflow-hidden border border-base-300 bg-base-200">
          <img :src="banner.imageUrl" :alt="banner.title" class="h-64 w-full object-cover">
          <div class="border-t border-base-300 p-4">
            <h3 class="text-lg font-semibold text-base-content">{{ banner.title }}</h3>
            <p class="mt-2 text-sm text-base-content/60">Current hospital message displayed from the database.</p>
          </div>
        </article>

        <article v-else class="border border-dashed border-base-300 bg-base-200 p-6">
          <h3 class="text-lg font-semibold text-base-content">No active banner</h3>
          <p class="mt-2 text-sm text-base-content/60">The captive portal is live, but no active banner has been configured yet.</p>
        </article>

        <div class="space-y-4">
          <div v-if="requiresCredentials" class="grid gap-4 border border-base-300 bg-base-200 p-4 sm:grid-cols-2">
            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Username</legend>
              <input v-model="loginForm.username" type="text" class="input input-bordered w-full" autocomplete="username" required>
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Password</legend>
              <input v-model="loginForm.password" type="password" class="input input-bordered w-full" autocomplete="current-password" required>
            </fieldset>
          </div>

          <div v-else-if="isRadiusMode" class="border border-warning/40 bg-warning/10 p-4 text-sm text-base-content/70">
            RADIUS mode aktif. Kredensial pengguna harus diautentikasi oleh OpenNDS yang terhubung ke FreeRADIUS, bukan langsung dari portal aplikasi.
          </div>

          <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>
          <button class="btn btn-primary btn-sm w-full sm:w-auto" type="button" :disabled="pending || !mac || !ip || isRadiusMode || (requiresCredentials && (!loginForm.username || !loginForm.password))" @click="continueToInternet">
            {{ pending ? 'Authorizing...' : requiresCredentials ? 'Login & Continue' : 'Continue' }}
          </button>
        </div>
      </div>
    </section>
  </main>
</template>
