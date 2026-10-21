/**
 * domPatch.js
 *
 * Vá lỗi can thiệp DOM từ bên thứ 3 (Browser Extensions, Cốc Cốc, Google Translate, Grammarly...)
 * Ngăn chặn lỗi: "NotFoundError: Failed to execute 'insertBefore' on 'Node'"
 * và "NotFoundError: Failed to execute 'removeChild' on 'Node'".
 */

if (typeof window !== 'undefined' && typeof Node === 'function' && Node.prototype) {
  const originalInsertBefore = Node.prototype.insertBefore
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(
          '[domPatch] referenceNode is not a child of parentNode. Falling back to appendChild.',
          { parent: this, referenceNode, newNode }
        )
      }
      return originalInsertBefore.call(this, newNode, null)
    }
    return originalInsertBefore.apply(this, arguments)
  }

  const originalRemoveChild = Node.prototype.removeChild
  Node.prototype.removeChild = function (child) {
    if (child && child.parentNode !== this) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[domPatch] child is not a child of parentNode. Skipping removeChild.', {
          parent: this,
          child
        })
      }
      return child
    }
    return originalRemoveChild.apply(this, arguments)
  }

  // Bỏ qua các lỗi không thể bắt được do Extension ngoài (như searchAnalyzer.js, chrome-extension://)
  window.addEventListener(
    'error',
    (event) => {
      if (
        event.filename &&
        (event.filename.includes('searchAnalyzer.js') ||
          event.filename.startsWith('chrome-extension://') ||
          event.filename.startsWith('moz-extension://'))
      ) {
        event.preventDefault()
        event.stopPropagation()
        return true
      }
      if (event.message && event.message.includes('Search engine null is not supported')) {
        event.preventDefault()
        event.stopPropagation()
        return true
      }
    },
    true
  )
}
