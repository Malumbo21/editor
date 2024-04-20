import onBlokkliEvent from './composables/onBlokkliEvent'
import useAnimationFrame from './composables/useAnimationFrame'
import {
  computed,
  onMounted,
  onBeforeUnmount,
  type ComputedRef,
} from '#imports'
import { eventBus } from '#blokkli/helpers/eventBus'
import type { UiProvider } from './uiProvider'
import type { ProgramInfo } from 'twgl.js'

export type AnimationProvider = {
  /**
   * Request an animation loop. Should be called when UI state changes.
   */
  requestDraw: () => void

  /**
   * Get the WebGL rendering context.
   */
  gl: () => WebGLRenderingContext

  setSharedUniforms: (
    gl: WebGLRenderingContext,
    programInfo: ProgramInfo,
  ) => void

  dpi: ComputedRef<number>
}

export default function (ui: UiProvider): AnimationProvider {
  let mouseX = 0
  let mouseY = 0

  // Keep track of how many frames should be rendered.
  // Assuming 60 fps, this value means after every draw request we will only
  // render a maximum of 2 seconds.
  let iterator = 120

  const onPointerMove = (e: PointerEvent) => {
    mouseX = e.clientX
    mouseY = e.clientY
    iterator = 120
  }

  useAnimationFrame(() => {
    // Make sure we don't loop when it's not needed.
    if (iterator < 1) {
      return
    }

    // Decrement the value.
    iterator--

    // Let the "Artboard" feature alter the position/scale of the root element
    // before triggering the main animation loop event.
    eventBus.emit('animationFrame:before')

    eventBus.emit('animationFrame', {
      mouseX,
      mouseY,
      fieldAreas: [],
    })
  })

  onMounted(() => {
    document.addEventListener('scroll', requestDraw)
    document.body.addEventListener('wheel', requestDraw, { passive: false })
    window.addEventListener('pointermove', onPointerMove, {
      passive: false,
    })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('pointermove', onPointerMove)
    document.body.removeEventListener('wheel', requestDraw)
    document.removeEventListener('scroll', requestDraw)
  })

  const requestDraw = () => (iterator = 120)

  onBlokkliEvent('select', requestDraw)
  onBlokkliEvent('select:start', requestDraw)
  onBlokkliEvent('select:end', requestDraw)
  onBlokkliEvent('select:toggle', requestDraw)
  onBlokkliEvent('option:update', requestDraw)
  onBlokkliEvent('state:reloaded', requestDraw)

  const dpi = computed(() => {
    return 2.0
    return 2.5
    if (ui.isMobile.value) {
      return window.devicePixelRatio
    }
    return Math.min(window.devicePixelRatio, 2.5)
  })

  function setSharedUniforms(
    gl: WebGLRenderingContext,
    programInfo: ProgramInfo,
  ) {
    const resolution = [ui.viewport.value.width, ui.viewport.value.height]
    gl.uniform2fv(
      gl.getUniformLocation(programInfo.program, 'u_resolution'),
      resolution,
    )

    const offset = ui.artboardOffset.value
    gl.uniform1f(
      gl.getUniformLocation(programInfo.program, 'u_offset_x'),
      offset.x,
    )
    gl.uniform1f(
      gl.getUniformLocation(programInfo.program, 'u_offset_y'),
      offset.y,
    )
    gl.uniform1f(
      gl.getUniformLocation(programInfo.program, 'u_scale'),
      ui.artboardScale.value,
    )
    gl.uniform1f(gl.getUniformLocation(programInfo.program, 'u_dpi'), dpi.value)
  }

  return {
    requestDraw,
    gl: function () {
      const el = document.querySelector('#bk-animation-canvas-webgl')
      if (!(el instanceof HTMLCanvasElement)) {
        throw new TypeError('Failed to locate WebGL canvas.')
      }
      const gl = el.getContext('webgl2', {
        premultipliedAlpha: true,
      })
      if (!gl) {
        throw new Error('Failed to get WebGL context.')
      }

      return gl
    },
    setSharedUniforms,
    dpi,
  }
}
