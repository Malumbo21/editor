import { defineConfig } from 'vitepress'
import features from './../../playground/.nuxt/blokkli/features.json'

const adapterDocs = [
  { text: 'loadState()', link: '/adapter/loadState' },
  { text: 'mapState()', link: '/adapter/mapState' },
  { text: 'getDisabledFeatures()', link: '/adapter/getDisabledFeatures' },
  { text: 'getAllBundles()', link: '/adapter/getAllBundles' },
  { text: 'getFieldConfig()', link: '/adapter/getFieldConfig' },
  { text: 'getEditableFieldConfig()', link: '/adapter/getEditableFieldConfig' },
  { text: 'getConversions()', link: '/adapter/getConversions' },
  { text: 'convertBlocks()', link: '/adapter/convertBlocks' },
  { text: 'getTransformPlugins()', link: '/adapter/getTransformPlugins' },
  { text: 'applyTransformPlugin()', link: '/adapter/applyTransformPlugin' },
  { text: 'addNewBlock()', link: '/adapter/addNewBlock' },
  { text: 'updateOptions()', link: '/adapter/updateOptions' },
  {
    text: 'addBlockFromClipboardItem()',
    link: '/adapter/addBlockFromClipboardItem',
  },
  { text: 'moveBlock()', link: '/adapter/moveBlock' },
  { text: 'moveMultipleBlocks()', link: '/adapter/moveMultipleBlocks' },
  { text: 'addLibraryItem()', link: '/adapter/addLibraryItem' },
  { text: 'deleteBlocks()', link: '/adapter/deleteBlocks' },
  { text: 'duplicateBlocks()', link: '/adapter/duplicateBlocks' },
  { text: 'pasteExistingBlocks()', link: '/adapter/pasteExistingBlocks' },
  { text: 'getImportItems()', link: '/adapter/getImportItems' },
  { text: 'importFromExisting()', link: '/adapter/importFromExisting' },
  { text: 'revertAllChanges()', link: '/adapter/revertAllChanges' },
  { text: 'publish()', link: '/adapter/publish' },
  { text: 'setHistoryIndex()', link: '/adapter/setHistoryIndex' },
  { text: 'takeOwnership()', link: '/adapter/takeOwnership' },
  { text: 'loadComments()', link: '/adapter/loadComments' },
  { text: 'addComment()', link: '/adapter/addComment' },
  { text: 'resolveComment()', link: '/adapter/resolveComment' },
  { text: 'makeBlockReusable()', link: '/adapter/makeBlockReusable' },
  { text: 'detachReusableBlock()', link: '/adapter/detachReusableBlock' },
  { text: 'getLibraryItems()', link: '/adapter/getLibraryItems' },
  { text: 'getLastChanged()', link: '/adapter/getLastChanged' },
  { text: 'getPreviewGrantUrl()', link: '/adapter/getPreviewGrantUrl' },
  { text: 'getContentSearchTabs()', link: '/adapter/getContentSearchTabs' },
  {
    text: 'getContentSearchResults()',
    link: '/adapter/getContentSearchResults',
  },
  { text: 'addContentSearchItem()', link: '/adapter/addContentSearchItem' },
  { text: 'changeLanguage()', link: '/adapter/changeLanguage' },
  { text: 'formFrameBuilder()', link: '/adapter/formFrameBuilder' },
  { text: 'updateFieldValue()', link: '/adapter/updateFieldValue' },
  { text: 'buildEditableFrameUrl()', link: '/adapter/buildEditableFrameUrl' },
  { text: 'assistantGetResults()', link: '/adapter/assistantGetResults' },
  {
    text: 'assistantAddBlockFromResult()',
    link: '/adapter/assistantAddBlockFromResult',
  },
  { text: 'getGridMarkup()', link: '/adapter/getGridMarkup' },
  { text: 'mediaLibraryAddBlock()', link: '/adapter/mediaLibraryAddBlock' },
  { text: 'mediaLibraryGetResults()', link: '/adapter/mediaLibraryGetResults' },
].sort((a, b) => a.text.localeCompare(b.text))

// Define the plugin
function linkPlugin(md) {
  const regex = /\[adapter\.([^\]]+)\]/g

  function replaceToken(tokens, idx) {
    const token = tokens[idx]
    const match = token.content.match(regex)

    if (match) {
      // Extract method name from the match
      const methodName = match[0].slice(9, -1) // Removes [adapter. and ]

      // Replace the content of the current token
      token.type = 'html_inline'
      token.content = `<a href="/adapter/${methodName}">${methodName}</a>`
    }
  }

  md.core.ruler.push('replace_adapter_method', function (state) {
    state.tokens.forEach((blockToken) => {
      if (blockToken.type === 'inline' && blockToken.children) {
        blockToken.children.forEach((token, idx) => {
          replaceToken(blockToken.children, idx)
        })
      }
    })
  })
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'blökkli docs',
  description: 'Documentation for the blökkli page builder',
  markdown: {
    config: (md) => {
      md.use(linkPlugin)
    },
  },
  // srcDir: 'docs',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'blokk.li', link: 'https://blokk.li' },
    ],

    sidebar: [
      {
        text: 'Define blocks',
        items: [
          { text: 'defineBlokkli()', link: '/define-blokkli' },
          { text: 'Options', link: '/define-blokkli/options' },
          { text: 'Block Context', link: '/define-blokkli/block-context' },
          { text: 'Editor behaviour', link: '/define-blokkli/editor' },
        ],
      },
      {
        text: 'Data Structure',
        items: [
          { text: 'Basics', link: '/data-structure/basics' },
          { text: 'Components Data', link: '/data-structure/components' },
          { text: 'Block Options', link: '/data-structure/options' },
          { text: 'Nested Blocks', link: '/data-structure/nested-blocks' },
        ],
      },
      {
        text: 'Editor',
        items: [
          { text: 'Overview', link: '/editor/overview' },
          { text: 'Edit State', link: '/editor/edit-state' },
          { text: 'Features', link: '/editor/features' },
        ],
      },
      {
        text: 'Features',
        collapsed: true,
        items: features.map((v) => {
          return {
            text: v.definition.label,
            link: '/features/' + v.id,
          }
        }),
      },
      {
        text: 'Adapter',
        collapsed: true,
        items: [
          { text: 'Overview', link: '/adapter/overview' },
          ...adapterDocs,
        ],
      },
      {
        text: 'Plugins',
        collapsed: true,
        items: [{ text: 'Add Action', link: '/plugins/add-action' }],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/blokkli/editor' },
    ],
  },
})