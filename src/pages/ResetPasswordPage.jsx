import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import styles from './AuthPage.module.css'

export default function ResetPasswordPage() {
  const navigate              = useNavigate()
  const { updatePassword }    = useAuth()
  const { t }                 = useLang()

  const [ready, setReady]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm]       = useState({ password: '', confirm: '' })

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const set = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    setError('')
  }

  const handleSubmit = async () => {
    if (!form.password)                       return setError(t('auth.errRequired'))
    if (form.password.length < 8)             return setError(t('auth.errPasswordLen'))
    if (form.password !== form.confirm)       return setError(t('auth.errPasswordMatch'))

    setLoading(true)
    const { error } = await updatePassword({ password: form.password })
    if (error) setError(error.message || t('auth.errGeneric'))
    else {
      setSuccess(t('auth.resetSuccess'))
      setTimeout(() => navigate('/auth'), 2000)
    }
    setLoading(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        <Link to="/" className={styles.logo}>
          <span className={styles.logoWhite}>Nos</span>Book
        </Link>

        <p className={styles.subtitle}>{t('auth.resetTitle')}</p>

        {success ? (
          <div className={styles.successBox}>
            <span>✅</span>
            <span>{success}</span>
          </div>
        ) : !ready ? (
          <p className={styles.subtitle}>{t('auth.loading')}</p>
        ) : (
          <div
            className={styles.form}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
          >
            <Input
              label={t('auth.newPassword')}
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder={t('auth.minPassword')}
              required
              autoComplete="new-password"
            />
            <Input
              label={t('auth.confirmPassword')}
              type="password"
              value={form.confirm}
              onChange={set('confirm')}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />

            {error && (
              <div className={styles.errorBox}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <Button variant="solid" size="lg" fullWidth onClick={handleSubmit} disabled={loading}>
              {loading ? t('auth.loading') : t('auth.btnResetPassword')}
            </Button>
          </div>
        )}

      </div>
    </div>
  )
}
