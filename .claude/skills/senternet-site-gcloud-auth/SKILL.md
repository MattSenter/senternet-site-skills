---
name: senternet-site-gcloud-auth
description: Authenticate gcloud and Firebase CLI for site setup.
---

# Google Cloud & Firebase CLI Authentication

Authenticate the Google Cloud SDK and Firebase CLI so Claude can create Firebase projects and GA4 properties on your behalf. Run this once per machine before using any skill that touches Firebase or Google Analytics.

## Steps

### 1. Detect the OS

```bash
uname -s 2>/dev/null
```

- `Darwin` → macOS
- `Linux` → Linux
- `MINGW*` / `MSYS*` → Windows (Git Bash)
- Command not found → Windows (PowerShell/CMD)

### 2. Check and install Google Cloud SDK

```bash
which gcloud 2>/dev/null || gcloud --version 2>/dev/null
```

If not installed, install for the detected OS:

**macOS (Homebrew):**
```bash
brew install --cask google-cloud-sdk
```
Then add to shell config — check which shell is active (`echo $SHELL`):
- zsh: `echo 'source "$(brew --prefix)/share/google-cloud-sdk/path.zsh.inc"' >> ~/.zshrc && source ~/.zshrc`
- bash: `echo 'source "$(brew --prefix)/share/google-cloud-sdk/path.bash.inc"' >> ~/.bash_profile && source ~/.bash_profile`

**Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```
Or with snap (Ubuntu/Debian): `snap install google-cloud-cli --classic`
Or with apt (Debian/Ubuntu):
```bash
sudo apt-get install -y apt-transport-https ca-certificates gnupg
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee /etc/apt/sources.list.d/google-cloud-sdk.list
sudo apt-get update && sudo apt-get install google-cloud-cli
```

**Windows (PowerShell as Administrator):**
```powershell
winget install Google.CloudSDK
```
After installation, close and reopen PowerShell so `gcloud` is on PATH.
Alternatively, download and run the interactive installer from the Google Cloud SDK documentation page.

### 3. Authenticate gcloud (user credentials)

```bash
gcloud auth login \
  --scopes=openid,email,profile,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/analytics.edit,https://www.googleapis.com/auth/analytics
```

A browser window opens — sign in with the Google account that owns your Firebase projects and GA4 account. The extra scopes are required for creating GA4 properties via API.

**Windows (PowerShell):** If `--scopes` causes issues, run without it first to verify auth works, then re-run with the scopes flag.

### 4. Set up application default credentials

```bash
gcloud auth application-default login \
  --scopes=openid,email,profile,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/analytics.edit,https://www.googleapis.com/auth/analytics
```

Sign in again in the browser (same account). This is separate from step 3 — ADC is used when scripts make API calls on your behalf.

### 5. Check and install Firebase CLI

```bash
which firebase 2>/dev/null || firebase --version 2>/dev/null
```

If not installed (same command across all platforms — requires Node.js):
```bash
npm install -g firebase-tools
```

### 6. Authenticate Firebase CLI

```bash
firebase login
```

A browser window opens — sign in with the same Google account.

**Linux (headless/SSH):** Use `firebase login --no-localhost` instead, which gives a URL to open on another machine.

### 7. Verify everything

```bash
gcloud auth list
firebase projects:list
```

Both should show your authenticated account. `firebase projects:list` will show existing Firebase projects (may be empty if you haven't created any yet).

## Re-authentication

If you need to switch Google accounts or credentials expire:
```bash
gcloud auth revoke
gcloud auth login --scopes=openid,email,profile,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/analytics.edit,https://www.googleapis.com/auth/analytics
gcloud auth application-default login --scopes=openid,email,profile,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/analytics.edit,https://www.googleapis.com/auth/analytics
firebase login --reauth
```

## Notes

- The `analytics.edit` scope is required for the GA4 skill to create properties and get Measurement IDs via the Analytics Admin API.
- `gcloud auth login` and `gcloud auth application-default login` are separate credential stores — both must be set up.
- Credentials persist across terminal sessions; you only need to re-run this when tokens expire or you switch accounts.
- On Windows, prefer PowerShell over CMD. Git Bash also works but may have PATH quirks after gcloud installation.
