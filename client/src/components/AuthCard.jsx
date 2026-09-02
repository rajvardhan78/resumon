import { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

/**
 * The shared pieces of the sign-in and sign-up screens. These replace Clerk's drop-in <SignIn />
 * and <SignUp /> widgets, so the forms are ours to style and to keep accessible.
 */

/** Centred glass card carrying the Resumon mark, a heading and the form. */
export function AuthCard({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-success to-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-primary font-bold text-3xl">R</span>
          </div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-text via-success to-text bg-clip-text text-transparent">
            {title}
          </h1>
          <p className="text-text/60">{subtitle}</p>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-6 sm:p-8">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

/** Banner for errors that belong to the whole form rather than one field. */
export function AuthAlert({ children }) {
  if (!children) return null;

  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30"
    >
      <span aria-hidden="true" className="text-red-400 leading-5">⚠</span>
      <p className="text-sm text-red-400">{children}</p>
    </motion.div>
  );
}
/**
 * Labelled text input. The error and hint are wired up through `aria-describedby` so a screen
 * reader announces them with the field instead of leaving them as loose text.
 */
export function AuthField({ id, label, error, hint, trailing, onChange, ...props }) {
  const describedBy = [error && `${id}-error`, hint && !error && `${id}-hint`]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="mb-5">
      <label htmlFor={id} className="block text-sm font-medium text-text/80 mb-2">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`w-full py-2.5 pl-4 ${trailing ? 'pr-16' : 'pr-4'} rounded-xl bg-white/10 border text-text
            placeholder:text-text/30 transition-colors focus:outline-none focus:ring-2 focus:ring-success/60
            ${error ? 'border-red-500/60' : 'border-white/20 hover:border-white/30 focus:border-success/60'}`}
          {...props}
        />
        {trailing}
      </div>

      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-400">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-text/40">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
/** Password input with a show/hide toggle, so a typo can be checked before submitting. */
export function PasswordField({ id, label, error, hint, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <AuthField
      id={id}
      label={label}
      error={error}
      hint={hint}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-pressed={visible}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-xs font-medium
            text-text/50 hover:text-text/90 focus:outline-none focus:ring-2 focus:ring-success/60"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      }
      {...props}
    />
  );
}

/** Primary submit button that shows a spinner and blocks double submits while a call is open. */
export function AuthSubmit({ pending, disabled, pendingLabel = 'Please wait…', children }) {
  return (
    <motion.button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      whileHover={pending || disabled ? undefined : { scale: 1.02 }}
      whileTap={pending || disabled ? undefined : { scale: 0.98 }}
      className="w-full py-3 rounded-xl bg-success hover:bg-success/90 text-primary font-semibold
        shadow-lg shadow-success/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-success/60 focus:ring-offset-2 focus:ring-offset-primary"
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <span
            aria-hidden="true"
            className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin"
          />
          {pendingLabel}
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}
