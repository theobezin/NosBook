import styles from './Input.module.css'

export default function Input({
  label,
  type         = 'text',
  name,
  value,
  onChange,
  placeholder  = '',
  required     = false,
  autoComplete,
  className    = '',
}) {
  return (
    <div className={`${styles.wrap} ${className}`}>
      {label && (
        <label className={styles.label} htmlFor={name}>
          {label}
          {required && <span className={styles.req}>*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className={styles.input}
      />
    </div>
  )
}
