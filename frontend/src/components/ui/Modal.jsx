import { createPortal } from 'react-dom'

/**
 * Reusable modal component that renders via a React Portal
 * directly into document.body, escaping any parent overflow/transform issues.
 */
export default function Modal({ open, onClose, title, children }) {
  if (!open) return null

  return createPortal(
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}
