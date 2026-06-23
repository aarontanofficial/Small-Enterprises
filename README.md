# Yan's Foodhouz POS (PWA)

A lightweight, installable Point-of-Sale app built for Yan's Foodhouz (ulam/pulutan/paluto restaurant). Works fully offline after the first load — all data is stored on the device (localStorage), so no internet or server is required to take orders.

## What it solves
- **No POS** → Orders tab: tap menu items to build an order, auto-totals the bill.
- **Manual order writing** → Same order screen replaces paper tickets; tags each order as Walk-in, GrabFood, FoodPanda, or Pickup.
- **No delivery app monitoring** → All orders (any source) land in one "Today's Queue" list.
- **No inventory system** → Inventory tab tracks ingredient quantities with low-stock warnings.
- **GCash confirmation** → GCash tab logs the reference number per order and lets staff mark it "Confirmed" once verified in the GCash app.
- **Bonus**: Sales tab shows today's total, order count, best sellers, and sales by source. Menu tab lets the owner edit prices/items without touching code.

## How to deploy on GitHub Pages

1. Create a new GitHub repository (e.g. `yans-foodhouz-pos`).
2. Upload all files in this folder (`index.html`, `app.js`, `manifest.json`, `service-worker.js`, `icons/`) to the root of the repo.
3. In the repo, go to **Settings → Pages**.
4. Under "Build and deployment", set **Source** to "Deploy from a branch", choose branch `main` and folder `/ (root)`, then Save.
5. Wait a minute, then GitHub will give you a URL like:
   `https://your-username.github.io/yans-foodhouz-pos/`
6. Open that link on the restaurant's phone/tablet (Chrome or Safari).
7. Tap the browser menu → **"Add to Home Screen"** (or you'll see an Install banner). The app icon will appear like a normal app — no app store needed.

## Notes
- Data lives only on the device it's installed on. If you want staff on multiple devices to share live order data, that needs a small backend (e.g. Firebase) added later — happy to wire that up if needed.
- Icons in `/icons` are placeholders — swap `icon-192.png` / `icon-512.png` with the restaurant's actual logo (same filenames) any time.
- To reset all data (for testing), clear the site's storage in browser settings, or open dev tools console and run `localStorage.clear()`.
