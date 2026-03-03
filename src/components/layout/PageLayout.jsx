import Navbar from './Navbar'
import styles from './PageLayout.module.css'

export default function PageLayout({ children }) {
  return (
    <div className={styles.root}>

      {/* Animated background */}
      <div className={styles.bg} aria-hidden="true">
        <div className={styles.grid} />
        <div className={styles.glow1} />
        <div className={styles.glow2} />
      </div>

      <Navbar />

      <main className={styles.main}>
        {children}
      </main>

    </div>
  )
}
