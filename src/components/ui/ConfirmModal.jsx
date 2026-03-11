// ConfirmModal — generic confirmation dialog, replaces window.confirm()
// Usage: <ConfirmModal message="..." onConfirm={fn} onCancel={fn} />
import styles from './ConfirmModal.module.css'

export default function ConfirmModal({ message, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', onConfirm, onCancel, danger = false }) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button className={styles.btnCancel} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={`${styles.btnConfirm} ${danger ? styles.danger : ''}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
