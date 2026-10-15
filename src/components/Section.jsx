export function Section({ title, eyebrow, action, onAction, children, className = "" }) {
  return (
    <section className={`reveal ${className}`}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          {eyebrow ? <p className="mb-2 text-xs uppercase tracking-[0.22em] text-ink-500">{eyebrow}</p> : null}
          <h2 className="text-2xl font-semibold tracking-normal text-ink-100">{title}</h2>
        </div>
        {action ? (
          typeof action === 'string' || typeof action === 'number' ? (
            <button onClick={onAction} className="text-sm font-medium text-ink-400 transition hover:text-ink-100" type="button">
              {action}
            </button>
          ) : (
            action
          )
        ) : null}
      </div>
      {children}
    </section>
  );
}
