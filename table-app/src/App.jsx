import { useEffect, useState } from 'preact/hooks';
import { loadMenu } from './menu.js';
import { useTableSession } from './store.js';
import { StatusBar, Toast } from './ui.jsx';
import { MenuScreen } from './MenuScreen.jsx';
import { ItemSheet } from './ItemSheet.jsx';
import { CartScreen } from './CartScreen.jsx';
import { CheckoutScreen } from './CheckoutScreen.jsx';
import { PaidScreen } from './PaidScreen.jsx';
import { IdentityPrompt } from './IdentityPrompt.jsx';

export function App() {
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError(null);
    loadMenu().then(value => { if (active) setMenu(value); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [attempt]);

  return (
    <div class="frame">
      <div class="frame-shell">
        <div class="screen">
          <StatusBar />
          <p class="preview-notice">Interactive preview · No kitchen orders or payments</p>
          {menu ? <Session menu={menu} /> : <MenuSkeleton error={error} onRetry={() => setAttempt(value => value + 1)} />}
        </div>
      </div>
    </div>
  );
}

/** Loading state shaped like the real menu (brand + rail + card grid) rather than a bare line. */
function MenuSkeleton({ error, onRetry }) {
  if (error) return <div class="loading" role="alert"><div><b>코치<span>포차</span></b><p>We couldn’t load the menu.</p><button class="retry-menu" onClick={onRetry}>Try again</button></div></div>;
  return (
    <div class="view skeleton" aria-busy="true" aria-label="Loading the menu">
      <div class="menu-head">
        <div class="brand-row">
          <div class="brand">코치<span>포차</span></div>
          <span class="sk sk-tag" />
        </div>
      </div>
      <div class="menu-body">
        <nav class="rail" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, i) => <span key={i} class="sk sk-cat" />)}
        </nav>
        <section class="grid-wrap" aria-hidden="true">
          <div class="section-head"><span class="sk sk-head" /></div>
          <div class="grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} class="sk-card">
                <span class="sk sk-art" />
                <span class="sk sk-name" />
                <span class="sk sk-price" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Session({ menu }) {
  const { s, d, act } = useTableSession(menu);
  return (
    <>
      {s.screen === 'menu' && <MenuScreen menu={menu} s={s} d={d} act={act} />}
      {s.screen === 'cart' && <CartScreen s={s} d={d} act={act} />}
      {s.screen === 'checkout' && <CheckoutScreen s={s} d={d} act={act} />}
      {s.screen === 'paid' && <PaidScreen s={s} d={d} act={act} />}
      {s.screen === 'menu' && s.sheet && <ItemSheet menu={menu} s={s} d={d} act={act} />}
      <IdentityPrompt s={s} d={d} act={act} />
      <Toast key={s.toastSeq} text={s.toast} />
    </>
  );
}
