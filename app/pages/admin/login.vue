<script setup lang="ts">
const form = reactive({
  username: '',
  password: '',
})
const submitting = ref(false)
const errorMessage = ref('')

async function submitLogin() {
  errorMessage.value = ''
  submitting.value = true

  try {
    await $fetch('/api/admin/login', {
      method: 'POST',
      body: form,
    })

    await navigateTo('/admin')
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Login failed'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-base-200 px-4 py-12">
    <section class="w-full max-w-md border border-base-300 bg-base-100 p-8">
      <header class="mb-6 space-y-2">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Hotspot Admin</p>
        <h1 class="text-3xl font-semibold text-base-content">Sign in</h1>
        <p class="text-sm text-base-content/60">Hospital hotspot management dashboard access.</p>
      </header>

      <form class="space-y-4" @submit.prevent="submitLogin">
        <fieldset class="fieldset">
          <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Username</legend>
          <input v-model="form.username" type="text" class="input input-bordered w-full" autocomplete="username" required>
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend text-xs font-semibold uppercase tracking-wide">Password</legend>
          <input v-model="form.password" type="password" class="input input-bordered w-full" autocomplete="current-password" required>
        </fieldset>

        <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>

        <button class="btn btn-primary btn-sm w-full" type="submit" :disabled="submitting">
          {{ submitting ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>
    </section>
  </main>
</template>