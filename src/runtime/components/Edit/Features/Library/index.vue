<template>
  <PluginItemAction
    v-if="isReusable"
    id="library_detach"
    :title="$t('libraryDetach', 'Detach from library')"
    icon="detach"
    multiple
    :weight="-70"
    @click="onDetach"
  />
  <PluginItemAction
    v-else-if="!isReusable"
    id="library_make_reusable"
    :title="$t('libraryAdd', 'Add to library')"
    :disabled="!canMakeReusable || state.editMode.value !== 'editing'"
    icon="reusable"
    :weight="-70"
    @click="showReusableDialog = true"
  />

  <PluginAddAction
    v-if="
      adapter.addLibraryItem && adapter.getLibraryItems && isSupportedOnEntity
    "
    type="library"
    :title="$t('libraryAddFromLibrary', 'Add from library')"
    :description="
      $t(
        'libraryAddDescription',
        'Add a reusable block from the block library.',
      )
    "
    icon="reusable"
    color="lime"
    item-bundle="from_library"
    :disabled="!fromLibraryAllowedInList"
    @placed="placedAction = $event"
  />

  <Teleport to="body">
    <transition appear name="bk-slide-up" :duration="300">
      <ReusableDialog
        v-if="showReusableDialog && selectedItem"
        :uuid="selectedItem.uuid"
        :background-class="definition?.editor?.previewBackgroundClass"
        @confirm="onMakeReusable"
        @cancel="showReusableDialog = false"
      />
    </transition>
  </Teleport>

  <Teleport to="body">
    <transition appear name="bk-slide-in" :duration="200">
      <LibraryDialog
        v-if="placedAction && adapter.getLibraryItems"
        :field="placedAction.field"
        @close="placedAction = null"
        @submit="onAddLibraryItem"
      />
    </transition>
  </Teleport>
  <EditReusable
    v-if="editingLibraryItem"
    v-bind="editingLibraryItem"
    @submit="onSubmitLibraryItem"
    @close="cancelLibraryItemEdit"
  />
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginItemAction, PluginAddAction } from '#blokkli/plugins'
import ReusableDialog from './ReusableDialog/index.vue'
import LibraryDialog from './LibraryDialog/index.vue'
import EditReusable from './EditReusable/index.vue'
import { getDefinition } from '#blokkli/definitions'
import type { ActionPlacedEvent, LibraryEditItemEvent } from '#blokkli/types'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

const { adapter } = defineBlokkliFeature({
  id: 'library',
  icon: 'reusable',
  label: 'Library',
  description:
    'Implements support for a block library to manage reusable blocks.',
  requiredAdapterMethods: ['makeBlockReusable', 'detachReusableBlock'],
})

const { selection, state, types, $t, eventBus } = useBlokkli()
const showReusableDialog = ref(false)

const selectedItem = computed(() => {
  if (selection.blocks.value.length !== 1) {
    return
  }

  return selection.blocks.value[0]
})

const onDetach = async () => {
  if (!adapter.detachReusableBlock || !selection.uuids.value.length) {
    return
  }
  await state.mutateWithLoadingState(() =>
    adapter.detachReusableBlock({
      uuids: selection.uuids.value,
    }),
  )

  eventBus.emit('select:end')
}

const placedAction = ref<ActionPlacedEvent | null>(null)
const onAddLibraryItem = async (uuid: string) => {
  if (!placedAction.value || !adapter.addLibraryItem) {
    return
  }

  await state.mutateWithLoadingState(() =>
    adapter.addLibraryItem({
      libraryItemUuid: uuid,
      host: placedAction.value!.host,
      afterUuid: placedAction.value!.preceedingUuid,
    }),
  )
  placedAction.value = null
}

const definition = computed(() =>
  selectedItem?.value
    ? getDefinition(
        selectedItem.value.itemBundle,
        selectedItem.value.hostFieldListType,
        selectedItem.value.parentBlockBundle,
      )
    : null,
)

const itemBundle = computed(() =>
  selectedItem?.value
    ? types.getBlockBundleDefinition(selectedItem.value.itemBundle)
    : null,
)

const isReusable = computed(
  () =>
    selection.blocks.value.length &&
    selection.blocks.value.every((v) => v.itemBundle === 'from_library'),
)

async function onMakeReusable(label: string) {
  showReusableDialog.value = false
  if (!selectedItem?.value?.uuid) {
    return
  }
  await state.mutateWithLoadingState(
    () =>
      adapter.makeBlockReusable({
        label,
        uuid: selectedItem.value!.uuid,
      }),
    $t('libraryError', 'Failed to add block to library.'),
  )
  eventBus.emit('select:end')
}

const isSupportedOnEntity = computed(() =>
  types.generallyAvailableBundles.find((v) => v.id === 'from_library'),
)

const fromLibraryAllowedInList = computed(() => {
  if (!selection.uuids.value.length) {
    return !!types.generallyAvailableBundles.find(
      (v) => v.id === 'from_library',
    )
  }
  return types.allowedTypesInList.value.includes('from_library')
})

const canMakeReusable = computed(
  () =>
    !isReusable.value &&
    itemBundle?.value?.allowReusable &&
    fromLibraryAllowedInList.value,
)

const editingLibraryItem = ref<LibraryEditItemEvent | null>(null)

onBlokkliEvent('library:edit-item', function (e) {
  editingLibraryItem.value = e
})

function cancelLibraryItemEdit() {
  editingLibraryItem.value = null
}

function onSubmitLibraryItem() {
  eventBus.emit('reloadState')
  cancelLibraryItemEdit()
}
</script>

<script lang="ts">
export default {
  name: 'Library',
}
</script>
