import { useEffect, useRef } from 'preact/hooks';
import { Avatar } from './ui.jsx';

export function IdentityPrompt({ s, d, act }) {
  const inputRef = useRef(null);
  const isFull = !d.canAddPeople;
  const title = s.pendingAdd ? 'Who is this for?' : 'Join this check';
  const help = s.pendingAdd
    ? 'Name yourself before this item goes into the table cart.'
    : 'Pick your name or add a new person to the shared check.';

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape' && !s.pendingAdd) act.closeIdentity(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s.pendingAdd, act]);

  useEffect(() => {
    if (!s.identityOpen) return;
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [s.identityOpen]);

  if (!s.identityOpen) return null;

  const submit = e => {
    e.preventDefault();
    const clean = (inputRef.current?.value || '').trim();
    if (!clean) return;
    const existing = d.people.find(p => p.name.toLowerCase() === clean.toLowerCase());
    if (!existing && isFull) return;
    act.identifyGuest(clean, existing?.id || null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <>
      <div class="dim identity-dim" onClick={() => !s.pendingAdd && act.closeIdentity()} />
      <form class="identity-modal" role="dialog" aria-modal="true" aria-label={title} onSubmit={submit}>
        <div class="modal-kicker">TABLE {d.tableId} · CHECK IDENTITY</div>
        <h2>{title}</h2>
        <p>{help}</p>

        {d.people.length > 0 && (
          <div class="guest-picks" aria-label="People on this check">
            {d.people.map(p => (
              <button type="button" key={p.id} class={`guest-pick${p.id === d.currentGuestId ? ' on' : ''}`} onClick={() => act.selectGuest(p.id)}>
                <Avatar {...p} size={28} />
                <span>{p.name}</span>
                <small>{p.lines.length ? `${p.lines.reduce((a, l) => a + l.qty, 0)} item${p.lines.reduce((a, l) => a + l.qty, 0) === 1 ? '' : 's'}` : 'no items yet'}</small>
              </button>
            ))}
          </div>
        )}

        <label class="name-field">
          <span>{d.people.length ? 'Add another person' : 'Your name'}</span>
          <input ref={inputRef} maxLength={28} placeholder={isFull ? '10 people max reached' : 'e.g. Jae'} disabled={isFull} />
        </label>
        {isFull && <div class="name-hint warn">Maximum 10 people on one check.</div>}

        <div class="modal-actions">
          {!s.pendingAdd && <button type="button" class="btn-ghost" onClick={act.closeIdentity}>Cancel</button>}
          <button type="submit" class="btn-primary" disabled={isFull}>Continue</button>
        </div>
      </form>
    </>
  );
}
