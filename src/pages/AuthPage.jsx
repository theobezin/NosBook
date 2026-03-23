import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import styles from './AuthPage.module.css'

export default function AuthPage() {
  const [params]              = useSearchParams()
  const navigate              = useNavigate()
  const { signIn, signUp, resetPassword } = useAuth()
  const { t }                             = useLang()

  const initialMode           = params.get('mode') === 'register' ? 'register' : 'login'
  const [mode, setMode]       = useState(initialMode)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({ email: '', password: '', username: '', confirm: '' })

  const set = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    setError('')
  }

  const validate = () => {
    if (!form.email || !form.password)    return t('auth.errRequired')
    if (mode === 'register') {
      if (!form.username.trim())          return t('auth.errUsernameReq')
      if (form.username.length < 3)       return t('auth.errUsernameLen')
      if (form.password.length < 8)       return t('auth.errPasswordLen')
      if (form.password !== form.confirm) return t('auth.errPasswordMatch')
    }
    return null
  }

  const handleSubmit = async () => {
    if (mode !== 'forgot') {
      const err = validate()
      if (err) { setError(err); return }
    }
    setLoading(true)
    setError('')

    if (mode === 'login') {
      const { error } = await signIn({ email: form.email, password: form.password })
      if (error) setError(t('auth.errCredentials'))
      else navigate('/profile')
    } else if (mode === 'register') {
      const { error } = await signUp({ email: form.email, password: form.password, username: form.username })
      if (error) setError(error.message || t('auth.errGeneric'))
      else setSuccess(t('auth.success'))
    } else if (mode === 'forgot') {
      if (!form.email) { setError(t('auth.errRequired')); setLoading(false); return }
      const { error } = await resetPassword({ email: form.email })
      if (error) setError(error.message || t('auth.errGeneric'))
      else setSuccess(t('auth.forgotSuccess'))
    }
    setLoading(false)
  }

  const switchMode = (m) => { setMode(m); setError(''); setSuccess('') }

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        <Link to="/" className={styles.logo}>
          <span className={styles.logoWhite}>Nos</span>Book
        </Link>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
            onClick={() => switchMode('login')}
          >
            {t('auth.signIn')}
          </button>
          <button
            className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
            onClick={() => switchMode('register')}
          >
            {t('auth.signUp')}
          </button>
        </div>

        <p className={styles.subtitle}>
          {mode === 'login' ? t('auth.subtitleLogin') : mode === 'register' ? t('auth.subtitleRegister') : t('auth.forgotSubtitle')}
        </p>

        {success ? (
          <div className={styles.successBox}>
            <span>✅</span>
            <span>{success}</span>
          </div>
        ) : (
          <div
            className={styles.form}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
          >
            {mode === 'register' && (
              <Input
                label={t('auth.adventurerName')}
                name="username"
                value={form.username}
                onChange={set('username')}
                placeholder="Ex: Lyraethis"
                required
                autoComplete="username"
              />
            )}

            <Input
              label={t('auth.email')}
              type="email"
              name="email"
              value={form.email}
              onChange={set('email')}
              placeholder="you@email.com"
              required
              autoComplete="email"
            />

            {mode !== 'forgot' && (
              <Input
                label={t('auth.password')}
                type="password"
                name="password"
                value={form.password}
                onChange={set('password')}
                placeholder={mode === 'register' ? t('auth.minPassword') : '••••••••'}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            )}

            {mode === 'register' && (
              <Input
                label={t('auth.confirmPassword')}
                type="password"
                name="confirm"
                value={form.confirm}
                onChange={set('confirm')}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            )}

            {error && (
              <div className={styles.errorBox}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <Button variant="solid" size="lg" fullWidth onClick={handleSubmit} disabled={loading}>
              {loading
                ? t('auth.loading')
                : mode === 'login' ? t('auth.btnSignIn')
                : mode === 'register' ? t('auth.btnCreate')
                : t('auth.btnSendReset')}
            </Button>

            {mode === 'login' && (
              <p className={styles.forgotLink}>
                {t('auth.forgotPassword')} <a href="#" onClick={(e) => { e.preventDefault(); switchMode('forgot') }}>{t('auth.resetLink')}</a>
              </p>
            )}

            {mode === 'forgot' && (
              <p className={styles.forgotLink}>
                <a href="#" onClick={(e) => { e.preventDefault(); switchMode('login') }}>{t('auth.backToLogin')}</a>
              </p>
            )}
          </div>
        )}

        <p className={styles.switch}>
          {mode === 'login'
            ? <>{t('auth.noAccount')} <button onClick={() => switchMode('register')}>{t('auth.signUp')}</button></>
            : <>{t('auth.alreadyAccount')} <button onClick={() => switchMode('login')}>{t('auth.signIn')}</button></>
          }
        </p>

      </div>
    </div>
  )
}
