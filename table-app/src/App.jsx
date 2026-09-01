import { useEffect, useState } from 'preact/hooks';
import { loadMenu } from './menu.js';
import { useTableSession } from './store.js';
import { StatusBar } from './ui.jsx';
import { MenuScreen } from './MenuScreen.jsx';
import { ItemSheet } from './ItemSheet.jsx';
import { CartScreen } from './CartScreen.jsx';
import { CheckoutScreen } from './CheckoutScreen.jsx';
import { PaidScreen } from './PaidScreen.jsx';

export function App() {
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { loadMenu().then(setMenu).catch(e => setError(e.message)); }, []);

  return (
    <div class="frame">
      <div class="frame-shell">
        <div class="screen">
          <StatusBar />
          {menu ? <Session menu={menu} /> : (
            <div class="loading"><div><b>코치<span>포차</span></b>{error || 'Setting the table…'}</div></div>
          )}
        </div>
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
    </>
  );
}
