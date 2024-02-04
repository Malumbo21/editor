import {
  computed,
  inject,
  type ComputedRef,
  getCurrentInstance,
  onMounted,
  onBeforeUnmount,
} from '#imports'
import type {
  BlockDefinitionInput,
  BlockDefinitionOptionsInput,
  DefineBlokkliContext,
  InjectedBlokkliItem,
  ItemEditContext,
} from '#blokkli/types'
import { globalOptionsDefaults } from '#blokkli/default-global-options'

import type {
  FieldListItemTyped,
  GlobalOptionsKey,
  ValidFieldListTypes,
} from '#blokkli/generated-types'
import {
  INJECT_BLOCK_ITEM,
  INJECT_EDIT_CONTEXT,
  INJECT_FIELD_LIST_BLOCKS,
  INJECT_FIELD_LIST_TYPE,
  INJECT_REUSABLE_OPTIONS,
  INJECT_PROVIDER_BLOCKS,
} from '../helpers/symbols'

/**
 * Define a blokkli component.
 */
export function defineBlokkli<
  T extends BlockDefinitionOptionsInput = {},
  G extends GlobalOptionsKey[] | undefined = undefined,
>(config: BlockDefinitionInput<T, G>): DefineBlokkliContext<T, G> {
  const optionKeys: string[] = []
  // The default options are provided by the component definition itself.
  const defaultOptions: Record<string, any> = {}
  for (const key in config.options) {
    optionKeys.push(key)
    if (config.options[key] && 'default' in config.options[key]) {
      defaultOptions[key] = config.options[key].default
    }
  }

  // If the item uses global options, we add the default values from the
  // global options to the default options of this item.
  if (config.globalOptions) {
    config.globalOptions.forEach((key) => {
      optionKeys.push(key)
      const defaultValue = (globalOptionsDefaults as any)[key as any]?.default
      if (defaultValue !== undefined) {
        defaultOptions[key] = defaultValue
      }
    })
  }

  const fieldListType = inject<ComputedRef<ValidFieldListTypes>>(
    INJECT_FIELD_LIST_TYPE,
    computed(() => 'default'),
  )!

  const siblings = inject<ComputedRef<FieldListItemTyped[]>>(
    INJECT_FIELD_LIST_BLOCKS,
  )!

  const rootBlocks = inject<ComputedRef<FieldListItemTyped[]>>(
    INJECT_PROVIDER_BLOCKS,
  )!

  // Inject the data from the BlokkliItem component.
  const item = inject<InjectedBlokkliItem>(INJECT_BLOCK_ITEM)
  const uuid = item?.value.uuid || ''
  const index =
    item?.value.index !== undefined ? item.value.index : computed(() => 0)

  const parentType = computed(() => item?.value.parentType)

  // This is injected by the "from_library" blokkli component.
  // If its present it means this blokkli is reusable. In this case it
  // inherits the options defined on its wrapper blokkli.
  const fromLibraryOptions = inject<ComputedRef<Record<string, string>> | null>(
    INJECT_REUSABLE_OPTIONS,
    null,
  )

  // When we are in an edit context, the current options are managed in a
  // separate reactive state. This state is mutated when the user is changing
  // the options. These options are only persisted once the user closes the
  // options popup. In order to have live preview of how these options affect
  // the component, we use this state to override the options.
  const editContext = inject<ItemEditContext | null>(INJECT_EDIT_CONTEXT, null)

  const options = computed(() => {
    if (config.bundle === 'from_library') {
      return {
        ...(item?.value.options || {}),
        ...(editContext?.mutatedOptions.value[uuid] || {}),
      }
    }
    const result = optionKeys.reduce<
      Record<string, string | boolean | string[]>
    >((acc, key) => {
      // Use an override option if available.
      if (editContext) {
        const overrideOptions = editContext.mutatedOptions.value[uuid] || {}

        if (overrideOptions[key] !== undefined) {
          acc[key] = overrideOptions[key]
          return acc
        }
      }

      if (fromLibraryOptions) {
        if (fromLibraryOptions.value[key] !== undefined) {
          acc[key] = fromLibraryOptions.value[key]
          return acc
        }
      }

      if (item?.value.options && item.value.options[key] !== undefined) {
        // Use the persisted option value on the item itself.
        acc[key] = item.value.options[key]
        return acc
      }

      // Fallback to the default defined by the component.
      acc[key] = defaultOptions[key]
      return acc
    }, {})

    Object.keys(result).forEach((key) => {
      const definition = config.options?.[key] || globalOptionsDefaults[key]
      if (!definition) {
        return
      }

      if (definition.type === 'checkbox') {
        result[key] = result[key] === '1'
      } else if (definition.type === 'checkboxes') {
        const v = result[key] || ''
        if (typeof v === 'string') {
          result[key] = v.split(',')
        } else if (v === null || v === undefined || typeof v === 'boolean') {
          result[key] = []
        }
      }
    })

    return result
  })

  const isEditing = !!item?.value.isEditing

  onMounted(() => {
    if (!isEditing || !editContext || fromLibraryOptions) {
      return
    }

    // Register the DOM element of this block.
    const instance = getCurrentInstance()
    if (instance?.vnode.el instanceof HTMLElement) {
      editContext.dom.registerBlock(uuid, instance.vnode.el)
    }
  })
  onBeforeUnmount(() => {
    if (editContext && uuid) {
      editContext.dom.unregisterBlock(uuid)
    }
  })
  return {
    uuid,
    index,
    options,
    isEditing,
    parentType,
    fieldListType,
    siblings,
    rootBlocks,
  } as any
}
