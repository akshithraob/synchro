export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="card empty" role="status">
      {label}
    </p>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <p className="card empty" role="alert">
      <span className="warn">Something went wrong: {message}</span>
      {onRetry && (
        <>
          {' '}
          <button className="link-btn" onClick={onRetry}>
            Try again
          </button>
        </>
      )}
    </p>
  );
}
