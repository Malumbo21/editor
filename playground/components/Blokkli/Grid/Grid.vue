<template>
  <section
    class="py-70"
    :class="[
      colorClass,

      { 'border-t border-t-mono-200': options.background === 'white' },
    ]"
  >
    <BlokkliField
      name="header"
      :list="header"
      list-class="container"
      non-empty-class="mb-30 md:mb-70"
      field-list-type="header"
    />
    <BlokkliField
      name="blocks"
      :list="blocks"
      class="container grid gap-20 lg:gap-40"
      drop-alignment="horizontal"
      :class="{
        'grid-cols-2': options.mobile,
        'lg:grid-cols-2': options.columns === 'two',
        'lg:grid-cols-3': options.columns === 'three',
        'lg:grid-cols-4': options.columns === 'four',
      }"
    />
  </section>
</template>

<script lang="ts" setup>
import type { FieldListItemTyped } from '#blokkli/generated-types'
import { defineBlokkli, computed, provide } from '#imports'

const { options } = defineBlokkli({
  bundle: 'grid',
  globalOptions: ['background'],
  options: {
    columns: {
      type: 'radios',
      label: 'Columns',
      default: 'two',
      displayAs: 'icons',
      options: {
        two: { icon: 'icon-blokkli-option-two', label: 'Two' },
        three: { icon: 'icon-blokkli-option-three', label: 'Three' },
        four: { icon: 'icon-blokkli-option-four', label: 'Four' },
      },
    },
    mobile: {
      type: 'checkbox',
      label: 'Mobile',
      default: true,
    },
  },
  editor: {
    disableEdit: true,
    editTitle: (el) => el.querySelector('h2')?.textContent,
  },
})

defineProps<{
  header: FieldListItemTyped[]
  blocks: FieldListItemTyped[]
}>()

const colorClass = computed(() => {
  switch (options.value.background) {
    case 'dark':
      return 'bg-mono-800'
    case 'light':
      return 'bg-mono-100'
  }
  return 'bg-white'
})

const isInverted = computed(() => options.value.background === 'dark')
provide('isInverted', isInverted)
</script>

<style></style>
