<template>
  <DropTargets
    v-if="dragItems.length && isVisible"
    v-slot="{ color, label }"
    :items="dragItems"
    :box="box"
    :mouse-x="mouseX"
    :mouse-y="mouseY"
    :is-touch="isTouching"
  >
    <DragItems
      ref="dragItemsComponent"
      :x="mouseX"
      :y="mouseY"
      :start-coords="startCoords"
      :items="dragItems"
      :is-touch="isTouching"
      :active-color="color"
      :active-label="label"
    />
  </DropTargets>
</template>

<script lang="ts" setup>
import DragItems from './DragItems/index.vue'
import DropTargets from './DropTargets/index.vue'
import {
  ref,
  useBlokkli,
  onUnmounted,
  defineBlokkliFeature,
  nextTick,
} from '#imports'

import type {
  DropTargetEvent,
  BlokkliDefinitionAddBehaviour,
  BlokkliFieldElement,
  Coord,
  DraggableActionItem,
  DraggableClipboardItem,
  DraggableExistingBlock,
  DraggableHostData,
  DraggableItem,
  DraggableMediaLibraryItem,
  DraggableReusableItem,
  DraggableSearchContentItem,
  Rectangle,
  DraggableExistingStructureBlock,
} from '#blokkli/types'
import { getDefinition } from '#blokkli/definitions'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

const { adapter } = defineBlokkliFeature({
  icon: 'drag',
  id: 'dragging-overlay',
  label: 'Dragging Overlay',
  description: 'Renders an overlay when dragging or placing a block.',
  screenshot: 'feature-dragging-overlay.jpg',
})

const { eventBus, state, ui, animation, dom, selection } = useBlokkli()

const dragItemsComponent = ref<InstanceType<typeof DragItems> | null>(null)
const isVisible = ref(false)
const isTouching = ref(false)
const mouseX = ref(0)
const mouseY = ref(0)
const startCoords = ref<Coord>({
  x: 0,
  y: 0,
})

const box = ref<Rectangle>({
  x: 0,
  y: 0,
  width: 10,
  height: 10,
})

const dragItems = ref<DraggableItem[]>([])

function isSameItemType(items: DraggableItem[]): boolean {
  return items.every((item) => item.itemType === items[0].itemType)
}

type FilteredItemType<T extends DraggableItem> = T extends {
  itemType: 'existing'
}
  ? { itemType: 'existing'; items: T[] }
  : T extends { itemType: 'existing_structure' }
    ? { itemType: 'existing_structure'; items: T[] }
    : T extends { itemType: 'media_library' }
      ? { itemType: 'media_library'; items: T[] }
      : { itemType: T['itemType']; item: T }

function filterItemType<T extends DraggableItem>(
  items: T[],
): FilteredItemType<T> {
  if (!items.length) {
    throw new Error('Items array is empty')
  }

  if (!isSameItemType(items)) {
    throw new Error('Items of different types')
  }

  const itemType = items[0].itemType

  if (
    itemType === 'existing' ||
    itemType === 'existing_structure' ||
    itemType === 'media_library'
  ) {
    return { itemType, items } as any
  }

  if (items.length > 1) {
    throw new Error(`Only a single item of type '${itemType}' is allowed.`)
  }

  return { itemType, item: items[0] } as FilteredItemType<T>
}

const onDropNew = async (
  bundle: string,
  host: DraggableHostData,
  afterUuid?: string,
) => {
  const field = dom.findField(host.uuid, host.fieldName)
  if (!field) {
    throw new Error(
      `Failed to locate field with name "${host.fieldName}" on UUID "${host.uuid}"`,
    )
  }
  const definition = getDefinition(
    bundle,
    field.fieldListType,
    field.hostEntityBundle as any,
  )
  const addBehaviour: BlokkliDefinitionAddBehaviour =
    definition?.editor?.addBehaviour || 'form'
  if (
    definition?.editor?.disableEdit ||
    addBehaviour === 'no-form' ||
    addBehaviour.startsWith('editable:') ||
    !adapter.formFrameBuilder
  ) {
    await state.mutateWithLoadingState(() =>
      adapter.addNewBlock({
        bundle,
        host,
        afterUuid,
      }),
    )
  } else {
    eventBus.emit('add:block:new', {
      bundle,
      host,
      afterUuid,
    })
  }
}

const onDropExisting = async (
  items: Array<DraggableExistingBlock | DraggableExistingStructureBlock>,
  host: DraggableHostData,
  afterUuid?: string,
) => {
  const uuids = items.map((v) => v.uuid)
  await state.mutateWithLoadingState(() =>
    adapter.moveMultipleBlocks({
      uuids,
      afterUuid,
      host,
    }),
  )
  if (uuids.length >= 1 && uuids.length <= 10) {
    for (let i = 0; i < uuids.length; i++) {
      dom.refreshBlockRect(uuids[i])
    }
  }

  if (ui.isMobile.value) {
    eventBus.emit('scrollIntoView', {
      uuid: uuids[0],
      center: true,
    })
  }
}

const onDropReusable = async (
  item: DraggableReusableItem,
  host: DraggableHostData,
  afterUuid?: string,
) => {
  await state.mutateWithLoadingState(() =>
    adapter.addLibraryItem({
      libraryItemUuid: item.libraryItemUuid,
      host,
      afterUuid,
    }),
  )
}

const onDropClipboardItem = async (
  item: DraggableClipboardItem,
  host: DraggableHostData,
  afterUuid?: string,
) => {
  eventBus.emit('drop:clipboardItem', {
    id: item.clipboardId,
    host,
    blockBundle: item.itemBundle,
    afterUuid,
  })
}

const onDropMediaLibraryItem = async (
  items: DraggableMediaLibraryItem[],
  host: DraggableHostData,
  afterUuid?: string,
) => {
  if (adapter.mediaLibraryAddBlock && items.length === 1) {
    await state.mutateWithLoadingState(() =>
      adapter.mediaLibraryAddBlock({
        preceedingUuid: afterUuid,
        host,
        item: items[0],
      }),
    )
  } else if (adapter.mediaLibraryAddBlocks && items.length > 1) {
    await state.mutateWithLoadingState(() =>
      adapter.mediaLibraryAddBlocks({
        preceedingUuid: afterUuid,
        host,
        items,
      }),
    )
  }
}

const onDropSearchContentItem = async (
  item: DraggableSearchContentItem,
  host: DraggableHostData,
  afterUuid?: string,
) => {
  await state.mutateWithLoadingState(() =>
    adapter.addContentSearchItem({
      item: item.searchItem,
      host,
      bundle: item.itemBundle,
      afterUuid,
    }),
  )
}

const onDropAction = (
  action: DraggableActionItem,
  host: DraggableHostData,
  field: BlokkliFieldElement,
  afterUuid?: string,
) => {
  eventBus.emit('action:placed', {
    preceedingUuid: afterUuid,
    action,
    host,
    field,
  })
}

const onDrop = (e: DropTargetEvent) => {
  mouseX.value = 0
  mouseY.value = 0

  nextTick(async () => {
    const afterUuid = e.preceedingUuid
    const host = e.host
    const typed = filterItemType(e.items)
    if (
      typed.itemType === 'existing' ||
      typed.itemType === 'existing_structure'
    ) {
      await onDropExisting(typed.items, host, afterUuid)
    } else if (typed.itemType === 'new') {
      await onDropNew(typed.item.itemBundle, host, afterUuid)
    } else if (typed.itemType === 'reusable') {
      await onDropReusable(typed.item, host, afterUuid)
    } else if (typed.itemType === 'clipboard') {
      await onDropClipboardItem(typed.item, host, afterUuid)
    } else if (typed.itemType === 'search_content') {
      await onDropSearchContentItem(typed.item, host, afterUuid)
    } else if (typed.itemType === 'action') {
      onDropAction(typed.item, host, e.field, afterUuid)
    } else if (typed.itemType === 'media_library') {
      await onDropMediaLibraryItem(typed.items, host, afterUuid)
    }

    eventBus.emit('dragging:end')
    eventBus.emit('item:dropped')

    // @TODO: Reimplement feature.
    // Try to find the new block that has been added.
    const newUuid =
      state.mutations.value[state.mutations.value.length - 1]?.plugin
        ?.affectedItemUuid
    if (!newUuid) {
      return
    }
    const newBlock = dom.findBlock(newUuid)
    if (!newBlock) {
      return
    }

    const allSelected = [...selection.uuids.value, newBlock.uuid]

    eventBus.emit('select', allSelected)

    if (typed.itemType !== 'new') {
      return
    }

    const definition = getDefinition(
      newBlock.itemBundle,
      newBlock.hostFieldListType,
    )

    if (!definition?.editor?.addBehaviour?.startsWith('editable:')) {
      return
    }

    const editableField = definition.editor.addBehaviour.split(':')[1]

    if (!editableField) {
      return
    }

    const editableFieldElement = newBlock
      .element()
      .querySelector(`[data-blokkli-editable-field="${editableField}"]`)
    if (!(editableFieldElement instanceof HTMLElement)) {
      return
    }

    eventBus.emit('editable:focus', {
      fieldName: editableField,
      uuid: newUuid,
    })
  })
}

onBlokkliEvent('dragging:drop', onDrop)

function loop() {
  if (!isVisible.value) {
    isVisible.value = true
  }

  if (!dragItemsComponent.value) {
    return
  }

  box.value = dragItemsComponent.value.getRect()
}

const onMouseUp = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  if (!ui.isMobile.value) {
    eventBus.emit('dragging:end')
  }
}

function onMouseMove(e: MouseEvent) {
  mouseX.value = e.clientX
  mouseY.value = e.clientY
}

onBlokkliEvent('dragging:start', (e) => {
  isTouching.value = e.mode === 'touch'
  startCoords.value = e.coords
  animation.requestDraw()
  const item = e.items[0]
  if (!item) {
    return
  }

  mouseX.value = e.coords.x
  mouseY.value = e.coords.y

  // Before showing the drop targets we update all currently visible rects to
  // ensure the user sees the correct drop targets right away.
  dom.updateVisibleRects()
  dragItems.value = e.items
  if ('element' in item) {
    if (!isTouching.value) {
      document.removeEventListener('pointerup', onMouseUp)
      document.addEventListener('pointerup', onMouseUp)
      document.removeEventListener('pointermove', onMouseMove, {
        capture: true,
      })
      document.addEventListener('pointermove', onMouseMove, { capture: true })
    }
    eventBus.on('animationFrame', loop)
  }
})

onBlokkliEvent('dragging:end', () => {
  isVisible.value = false
  dragItems.value = []
  eventBus.off('animationFrame', loop)
  document.removeEventListener('pointerup', onMouseUp)
  document.removeEventListener('pointermove', onMouseMove, { capture: true })
})

onBlokkliEvent('keyPressed', (e) => {
  if (e.code === 'Escape') {
    eventBus.emit('dragging:end')
  }
})

onBlokkliEvent('block:append', (e) => {
  onDropNew(e.bundle, e.host, e.afterUuid)
})

onUnmounted(() => {
  document.removeEventListener('pointerup', onMouseUp)
  document.removeEventListener('pointermove', onMouseMove, { capture: true })
})
</script>

<script lang="ts">
export default {
  name: 'DraggingOverlay',
}
</script>
