import styles from './Spinner.module.css'

export default function Spinner({ size = 'md', text = '' }) {
  return (
    <div className={styles.wrap}>
      <div className={`${styles.ring} ${styles[size]}`} />
      {text && <span className={styles.text}>{text}</span>}
    </div>
  )
}
