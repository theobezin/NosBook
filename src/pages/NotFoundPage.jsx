import { Link } from 'react-router-dom'
import { useLang } from '@/i18n'
import Button from '@/components/ui/Button'
import styles from './NotFoundPage.module.css'

export default function NotFoundPage() {
  const { t } = useLang()
  return (
    <div className={styles.page}>
      <div className={styles.code}>404</div>
      <h1 className={styles.title}>{t('notFound.title')}</h1>
      <p className={styles.sub}>{t('notFound.sub')}</p>
      <Link to="/">
        <Button variant="solid" size="lg">{t('notFound.backToHub')}</Button>
      </Link>
    </div>
  )
}
