import * as htmlToImage from 'html-to-image'
import html2canvas from 'html2canvas'

/**
 * High-fidelity, crystal-clear PNG export engine for production reports & charts.
 * Preserves 100% of Recharts parameters, labels, rotated axis texts, Vietnamese characters,
 * metric values, reference lines, legends, and Glide Data Grid tables.
 */

// Helper to download a Data URL or Blob
function triggerDownload(dataUrl, fileName) {
  const link = document.createElement('a')
  link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`
  link.href = dataUrl
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Filter function to automatically exclude `.screenshot-hide` elements
 */
function defaultFilter(node) {
  if (!node) return true
  if (node.classList && node.classList.contains('screenshot-hide')) {
    return false
  }
  return true
}

/**
 * Inline computed styles onto SVG text, paths, and containers to guarantee
 * flawless rendering in Chromium/Electron SVG ForeignObject rasterizer without losing characters.
 */
function prepareSvgAndCanvasForCapture(rootEl) {
  const cleanups = []
  if (!rootEl) return () => {}

  try {
    // 1. Process all SVG elements
    const svgElements = rootEl.querySelectorAll('svg')
    svgElements.forEach((svg) => {
      const rect = svg.getBoundingClientRect()
      const origW = svg.getAttribute('width')
      const origH = svg.getAttribute('height')
      const origViewBox = svg.getAttribute('viewBox')
      const origStyleW = svg.style.width
      const origStyleH = svg.style.height

      if (rect.width > 0 && rect.height > 0) {
        svg.setAttribute('width', String(Math.round(rect.width)))
        svg.setAttribute('height', String(Math.round(rect.height)))
        if (!origViewBox) {
          svg.setAttribute('viewBox', `0 0 ${Math.round(rect.width)} ${Math.round(rect.height)}`)
        }
      }

      cleanups.push(() => {
        if (origW !== null) svg.setAttribute('width', origW)
        else svg.removeAttribute('width')
        if (origH !== null) svg.setAttribute('height', origH)
        else svg.removeAttribute('height')
        if (origViewBox !== null) svg.setAttribute('viewBox', origViewBox)
        else svg.removeAttribute('viewBox')
        svg.style.width = origStyleW
        svg.style.height = origStyleH
      })

      // Process SVG text nodes (<text>, <tspan>) to inline computed font and fill properties
      const textNodes = svg.querySelectorAll('text, tspan')
      textNodes.forEach((tNode) => {
        const computed = window.getComputedStyle(tNode)
        const origFill = tNode.getAttribute('fill')
        const origFontFamily = tNode.getAttribute('font-family')
        const origFontSize = tNode.getAttribute('font-size')
        const origFontWeight = tNode.getAttribute('font-weight')
        const origTextAnchor = tNode.getAttribute('text-anchor')
        const origDominantBaseline = tNode.getAttribute('dominant-baseline')
        const origInlineStyle = tNode.getAttribute('style')

        // Apply computed font & fill attributes directly
        const fill = computed.fill && computed.fill !== 'none' ? computed.fill : (computed.color || '#0f172a')
        const fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
        const fontSize = computed.fontSize || '12px'
        const fontWeight = computed.fontWeight || '500'

        tNode.setAttribute('fill', fill)
        tNode.setAttribute('font-family', fontFamily)
        tNode.setAttribute('font-size', fontSize)
        tNode.setAttribute('font-weight', fontWeight)
        if (computed.textAnchor && !origTextAnchor) {
          tNode.setAttribute('text-anchor', computed.textAnchor)
        }
        if (computed.dominantBaseline && !origDominantBaseline) {
          tNode.setAttribute('dominant-baseline', computed.dominantBaseline)
        }

        // Inline style for maximum browser rasterization fidelity
        tNode.style.fill = fill
        tNode.style.fontFamily = fontFamily
        tNode.style.fontSize = fontSize
        tNode.style.fontWeight = fontWeight

        cleanups.push(() => {
          if (origFill !== null) tNode.setAttribute('fill', origFill)
          else tNode.removeAttribute('fill')
          if (origFontFamily !== null) tNode.setAttribute('font-family', origFontFamily)
          else tNode.removeAttribute('font-family')
          if (origFontSize !== null) tNode.setAttribute('font-size', origFontSize)
          else tNode.removeAttribute('font-size')
          if (origFontWeight !== null) tNode.setAttribute('font-weight', origFontWeight)
          else tNode.removeAttribute('font-weight')
          if (origTextAnchor !== null) tNode.setAttribute('text-anchor', origTextAnchor)
          else tNode.removeAttribute('text-anchor')
          if (origDominantBaseline !== null) tNode.setAttribute('dominant-baseline', origDominantBaseline)
          else tNode.removeAttribute('dominant-baseline')
          if (origInlineStyle !== null) tNode.setAttribute('style', origInlineStyle)
          else tNode.removeAttribute('style')
        })
      })
    })

    // 2. Lock Recharts wrappers to exact pixel widths/heights
    const rechartsWrappers = rootEl.querySelectorAll('.recharts-wrapper, .recharts-responsive-container')
    rechartsWrappers.forEach((rw) => {
      const rect = rw.getBoundingClientRect()
      const origW = rw.style.width
      const origH = rw.style.height
      const origMinW = rw.style.minWidth
      const origMinH = rw.style.minHeight

      if (rect.width > 0) {
        rw.style.width = `${Math.round(rect.width)}px`
        rw.style.minWidth = `${Math.round(rect.width)}px`
      }
      if (rect.height > 0) {
        rw.style.height = `${Math.round(rect.height)}px`
        rw.style.minHeight = `${Math.round(rect.height)}px`
      }

      cleanups.push(() => {
        rw.style.width = origW
        rw.style.height = origH
        rw.style.minWidth = origMinW
        rw.style.minHeight = origMinH
      })
    })
  } catch (err) {
    console.warn('prepareSvgAndCanvasForCapture warning:', err)
  }

  return () => {
    cleanups.forEach((fn) => {
      try {
        fn()
      } catch {
        // ignore rollback errors
      }
    })
  }
}

/**
 * Capture full production report screenshot
 * - Renders complete DOM tree natively with html-to-image
 * - Preserves all Recharts axis labels, metric values, reference lines, legends, and table contents
 * - High resolution 2x (Retina)
 */
export async function captureReportScreenshot({
  targetEl,
  fileName = 'BaoCao_SanXuat',
  onStart,
  onEnd,
  onError
}) {
  if (!targetEl) return
  onStart?.()

  // Track modified elements for cleanup
  const hiddenShowElements = []
  const hideHideElements = []
  const expandedContainers = []
  let restoreSvg = () => {}

  try {
    // 1. Temporarily display .screenshot-show elements
    const showEls = targetEl.querySelectorAll('.screenshot-show')
    showEls.forEach((el) => {
      const origDisplay = el.style.display
      el.style.setProperty('display', 'block', 'important')
      hiddenShowElements.push({ el, origDisplay })
    })

    // 2. Temporarily hide .screenshot-hide elements
    const hideEls = targetEl.querySelectorAll('.screenshot-hide')
    hideEls.forEach((el) => {
      const origDisplay = el.style.display
      el.style.setProperty('display', 'none', 'important')
      hideHideElements.push({ el, origDisplay })
    })

    // 3. Expand scrollable tables/containers if marked
    const scrollContainers = targetEl.querySelectorAll(
      '.table-scroll-container, [data-scrollable-table="true"]'
    )
    scrollContainers.forEach((el) => {
      const origMaxH = el.style.maxHeight
      const origH = el.style.height
      const origOverflow = el.style.overflow
      el.style.maxHeight = 'none'
      el.style.height = 'auto'
      el.style.overflow = 'visible'
      expandedContainers.push({ el, origMaxH, origH, origOverflow })
    })

    // 4. Inline SVG computed styles & fix container sizes
    restoreSvg = prepareSvgAndCanvasForCapture(targetEl)

    // Allow layout to stabilize
    await new Promise((resolve) => setTimeout(resolve, 150))

    // 5. Capture with html-to-image (skipFonts: true to prevent CORS/file protocol crashes)
    let dataUrl
    try {
      dataUrl = await htmlToImage.toPng(targetEl, {
        filter: defaultFilter,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        quality: 1,
        skipFonts: true,
        fontEmbedCSS: '',
        cacheBust: true,
        style: {
          transform: 'none',
          maxWidth: 'none',
          boxSizing: 'border-box',
          margin: '0',
          padding: '24px 32px 40px 32px'
        }
      })
    } catch (primaryErr) {
      console.warn('htmlToImage capture failed, falling back to toCanvas/html2canvas:', primaryErr)
      try {
        const canvas = await htmlToImage.toCanvas(targetEl, {
          filter: defaultFilter,
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          skipFonts: true,
          fontEmbedCSS: ''
        })
        dataUrl = canvas.toDataURL('image/png')
      } catch (canvasErr) {
        console.warn('toCanvas failed, falling back to html2canvas:', canvasErr)
        const canvas = await html2canvas(targetEl, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          ignoreElements: (element) => element.classList?.contains('screenshot-hide')
        })
        dataUrl = canvas.toDataURL('image/png')
      }
    }

    // 6. Download file
    const dateStr = new Date().toISOString().slice(0, 10)
    const finalName = fileName.includes(dateStr) ? `${fileName}.png` : `${fileName}_${dateStr}.png`
    triggerDownload(dataUrl, finalName)
  } catch (err) {
    console.error('Screenshot capture failed:', err)
    onError?.(err)
  } finally {
    // Restore modified elements
    try {
      restoreSvg()
    } catch {
      // ignore
    }
    hiddenShowElements.forEach(({ el, origDisplay }) => {
      if (origDisplay) {
        el.style.display = origDisplay
      } else {
        el.style.removeProperty('display')
      }
    })
    hideHideElements.forEach(({ el, origDisplay }) => {
      if (origDisplay) {
        el.style.display = origDisplay
      } else {
        el.style.removeProperty('display')
      }
    })
    expandedContainers.forEach(({ el, origMaxH, origH, origOverflow }) => {
      el.style.maxHeight = origMaxH
      el.style.height = origH
      el.style.overflow = origOverflow
    })
    onEnd?.()
  }
}

/**
 * Download a single chart container as high-res PNG (2x Retina)
 * Captures 100% of Recharts parameters, labels, axis texts, ticks, reference lines, and metrics.
 */
export async function downloadSingleChart(targetRef, chartName = 'BieuDo') {
  const el = targetRef?.current || targetRef
  if (!el) {
    console.warn('downloadSingleChart: target element not found for', chartName)
    return
  }

  const hiddenShowElements = []
  const hideHideElements = []
  let restoreSvg = () => {}

  try {
    // 1. Temporarily display .screenshot-show and hide .screenshot-hide inside chart
    const showEls = el.querySelectorAll('.screenshot-show')
    showEls.forEach((item) => {
      const origDisplay = item.style.display
      item.style.setProperty('display', 'block', 'important')
      hiddenShowElements.push({ el: item, origDisplay })
    })

    const hideEls = el.querySelectorAll('.screenshot-hide')
    hideEls.forEach((item) => {
      const origDisplay = item.style.display
      item.style.setProperty('display', 'none', 'important')
      hideHideElements.push({ el: item, origDisplay })
    })

    // 2. Inline SVG styles and lock dimensions
    restoreSvg = prepareSvgAndCanvasForCapture(el)

    await new Promise((resolve) => setTimeout(resolve, 100))

    // 3. Capture with html-to-image for flawless SVG text & parameter preservation
    let dataUrl
    try {
      dataUrl = await htmlToImage.toPng(el, {
        filter: defaultFilter,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        quality: 1,
        skipFonts: true,
        fontEmbedCSS: '',
        cacheBust: true,
        style: {
          background: '#ffffff',
          boxSizing: 'border-box',
          padding: '16px 20px'
        }
      })
    } catch (primaryErr) {
      console.warn('htmlToImage single chart failed, trying fallback:', primaryErr)
      try {
        const canvas = await htmlToImage.toCanvas(el, {
          filter: defaultFilter,
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          skipFonts: true,
          fontEmbedCSS: ''
        })
        dataUrl = canvas.toDataURL('image/png')
      } catch (canvasErr) {
        console.warn('toCanvas single chart failed, falling back to html2canvas:', canvasErr)
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          ignoreElements: (element) => element.classList?.contains('screenshot-hide')
        })
        dataUrl = canvas.toDataURL('image/png')
      }
    }

    const dateStr = new Date().toISOString().slice(0, 10)
    triggerDownload(dataUrl, `${chartName}_${dateStr}.png`)
  } catch (err) {
    console.error('Download single chart error:', err)
  } finally {
    try {
      restoreSvg()
    } catch {
      // ignore
    }
    hiddenShowElements.forEach(({ el: item, origDisplay }) => {
      if (origDisplay) {
        item.style.display = origDisplay
      } else {
        item.style.removeProperty('display')
      }
    })
    hideHideElements.forEach(({ el: item, origDisplay }) => {
      if (origDisplay) {
        item.style.display = origDisplay
      } else {
        item.style.removeProperty('display')
      }
    })
  }
}

