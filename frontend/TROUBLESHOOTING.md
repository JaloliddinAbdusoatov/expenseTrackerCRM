# Troubleshooting

## Console errors: CSP, "unsupported MIME type", "listener indicated an asynchronous response"

If you see errors like:

- **"Executing inline script violates the following Content Security Policy directive"** (with `chrome-extension://...` in the message)
- **"The script has an unsupported MIME type ('text/html')"**
- **"A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received"** (from `reports:1` or `tab.js:1`)

**Cause:** These come from a **browser extension** (e.g. ad blocker, password manager, dev tools, or another Chrome extension), not from the EmotionFlow app. The extension injects its own scripts and Content Security Policy, which can block other scripts or receive HTML instead of JavaScript (e.g. 404 page).

**Fix:**

1. **Disable extensions for localhost**
   - Open `chrome://extensions/`
   - Turn off extensions one by one and refresh `http://localhost:8080` until the errors disappear to find the one causing it.

2. **Use a clean profile**
   - Open Chrome in a new profile (or Guest / Incognito with extensions disabled) and open `http://localhost:8080`.

3. **Ignore in development**
   - The app should still work. These messages do not break EmotionFlow; they come from the extension. You can filter them out in DevTools (e.g. by level or by text) if they are noisy.

The app does **not** set a strict Content Security Policy; any such directive in the error is from an extension.
