# GhostAPI Capture Extension

This folder contains the browser extension users install to create GhostAPI workflows from any website.

## Local install

1. Start GhostAPI:

   ```bash
   npm start
   ```

2. Open Chrome or Edge:

   ```txt
   chrome://extensions
   ```

3. Enable `Developer mode`.

4. Click `Load unpacked`.

5. Select:

   ```txt
   extensions/chrome
   ```

6. Pin `👻 GhostAPI Capture`.

7. Open a website and click the extension.

## Package for distribution

```bash
npm run package:extension
```

This creates:

```txt
extensions/dist/ghostapi-capture.zip
```

Upload that ZIP to the Chrome Web Store when the product is ready.

Do not commit `.pem`, `.crx`, or packaged `.zip` files. The `.pem` file is a private signing key.
