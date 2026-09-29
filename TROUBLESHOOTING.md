# Troubleshooting Guide

This guide covers common issues users and developers may encounter with the Dorisio frontend and their solutions.

## Table of Contents

- [Wallet Connection Issues](#wallet-connection-issues)
- [Payment/Transaction Issues](#paymenttransaction-issues)
- [Browser Compatibility](#browser-compatibility)
- [Mobile Issues](#mobile-issues)
- [Development Issues](#development-issues)
- [Developer-Specific Issues](#developer-specific-issues)
- [FAQ](#faq)
- [Contact Support](#contact-support)

---

## Wallet Connection Issues

### Freighter Wallet Not Detected

**Problem:** The app doesn't detect your Freighter wallet extension.

**Solutions:**
1. Ensure Freighter is installed and enabled in your browser
2. Refresh the page after installing Freighter
3. Check that you're logged into Freighter
4. Try in a different browser (Chrome, Firefox, Brave)
5. Disable other wallet extensions temporarily

**Browser-Specific Tips:**
- **Chrome:** Check `chrome://extensions/` to verify Freighter is enabled
- **Firefox:** Check `about:addons` for extension status
- **Brave:** Same as Chrome, but ensure Shields aren't blocking

### Wallet Connection Fails

**Problem:** Clicking "Connect Wallet" shows an error or fails silently.

**Solutions:**
1. Check your network connection
2. Ensure you're on the correct Stellar network (testnet vs mainnet)
3. Verify the backend is running (check `NEXT_PUBLIC_API_URL`)
4. Clear browser cache and cookies
5. Try disconnecting and reconnecting in Freighter

### Signature Request Not Appearing

**Problem:** No signature prompt appears when connecting or sending tips.

**Solutions:**
1. Check Freighter's popup blocker settings
2. Allow popups for the Dorisio domain
3. Ensure Freighter is unlocked
4. Refresh the page and try again

---

## Payment/Transaction Issues

### Transaction Stuck in "Pending"

**Problem:** A tip shows as "pending" for a long time.

**Solutions:**
1. Stellar network congestion can cause delays (typically 5-10 seconds)
2. Check the transaction status on StellarExpert or StellarBlock
3. Verify you have enough XLM for transaction fees
4. Wait up to 2 minutes before assuming it failed

**Transaction Not Appearing:**
- Refresh the page to sync with the latest blockchain state
- Check your transaction history on the blockchain explorer
- Verify the creator's wallet address is correct

### Insufficient Balance Error

**Problem:** "Insufficient balance" error when sending a tip.

**Solutions:**
1. Check your XLM balance in Freighter
2. Ensure you have enough for the tip AND transaction fees (~0.00001 XLM)
3. If using testnet, request testnet XLM from the faucet
4. For mainnet, acquire XLM from an exchange

### Transaction Failed

**Problem:** Transaction shows as "failed" in the dashboard.

**Solutions:**
1. Check the error message for specific details
2. Verify the recipient's wallet address is valid
3. Ensure you're on the correct network (testnet/mainnet)
4. Check if your account has enough reserves (minimum 2 XLM)

---

## Browser Compatibility

### Supported Browsers

Dorisio supports the following browsers:

- **Chrome/Edge:** 90+ (recommended)
- **Firefox:** 88+
- **Safari:** 14+
- **Brave:** Latest version

### Chrome/Edge Issues

**Problem:** UI elements not rendering correctly.

**Solutions:**
1. Disable hardware acceleration: Settings → System → Turn off "Use graphics acceleration"
2. Clear cache: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
3. Try Incognito mode to rule out extension conflicts
4. Update to the latest Chrome version

### Firefox Issues

**Problem:** Wallet connection not working.

**Solutions:**
1. Ensure Freighter extension is enabled in `about:addons`
2. Check Firefox's tracking protection isn't blocking the wallet
3. Disable privacy.resistFingerprinting in `about:config` if needed
4. Try in a fresh Firefox profile

### Safari Issues

**Problem:** App not loading or features not working.

**Solutions:**
1. Safari has limited Web3 support - consider Chrome/Firefox for wallet features
2. Enable JavaScript in Safari preferences
3. Clear website data: Safari → Clear History
4. Disable "Prevent Cross-Site Tracking" temporarily

### Mobile Browser Issues

**Problem:** Wallet extension not available on mobile.

**Solutions:**
1. Freighter is desktop-only - use the mobile app for basic features
2. For full wallet features, use a desktop browser
3. Mobile wallet support is planned for future releases

---

## Development Issues

### "Module not found" Errors

**Problem:** Cannot find local modules or SDK.

**Solutions:**
```bash
# Ensure SDK is built
cd ../sdk
npm run build
cd ../frontend
npm install
```

### Port Already in Use

**Problem:** Port 3000 is already in use.

**Solutions:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process (replace PID with actual process ID)
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev
```

### Environment Variables Not Loading

**Problem:** Changes to `.env.local` not reflected.

**Solutions:**
- Restart the dev server after changing `.env.local`
- Ensure the file is named exactly `.env.local` (not `.env.local.txt`)
- Check that variables start with `NEXT_PUBLIC_` for client-side access
- Verify no trailing spaces in variable values

### Build Errors

**Problem:** TypeScript or build errors.

**Solutions:**
```bash
# Run type check to see specific errors
npm run type-check

# Run linter
npm run lint

# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

### Backend Connection Issues

**Problem:** Cannot connect to backend API.

**Solutions:**
- Verify backend is running on the URL specified in `NEXT_PUBLIC_API_URL`
- Check that backend CORS allows requests from localhost:3000
- Test the backend URL directly in a browser or with curl
- Check browser console for CORS errors

### SDK WebSocket Connection Fails

**Problem:** Real-time notifications not working.

**Solutions:**
- Ensure `NEXT_PUBLIC_SDK_WS_URL` is set correctly
- Verify backend WebSocket server is running
- Check browser console for WebSocket connection errors
- Some corporate networks block WebSocket connections

---

## Developer-Specific Issues

For detailed development troubleshooting including:

- Environment setup issues
- Build and compilation errors
- Testing failures
- TypeScript issues
- Performance debugging
- Git workflow problems

Please refer to the comprehensive [Developer Troubleshooting Guide](./docs/DEVELOPER_TROUBLESHOOTING.md).

---

## FAQ

### General Questions

**Q: What is Dorisio?**
A: Dorisio is a tipping platform built on Stellar that allows fans to send tips directly to creators with low fees.

**Q: Is my wallet secure?**
A: Yes. Your private keys never leave your wallet. Dorisio only requests signatures for transactions you approve.

**Q: What cryptocurrency does Dorisio use?**
A: Dorisio uses Stellar (XLM) for transactions, chosen for its low fees and fast confirmation times.

**Q: Can I use other wallets besides Freighter?**
A: Currently, Freighter is the only supported wallet. Additional wallet support is planned for future releases.

### Account Questions

**Q: How do I become a creator?**
A: Sign up for an account, then navigate to your dashboard to complete creator verification.

**Q: Can I have both creator and supporter accounts?**
A: Yes, you can be both a creator and a supporter with the same account.

**Q: How do I reset my password?**
A: Click "Forgot Password" on the sign-in page and follow the email instructions.

### Transaction Questions

**Q: How long do transactions take?**
A: Most transactions confirm within 5-10 seconds on the Stellar network.

**Q: What are the fees?**
A: Transaction fees are minimal (~0.00001 XLM). Dorisio takes a small percentage for platform maintenance.

**Q: Can I cancel a transaction?**
A: Once submitted, transactions cannot be cancelled. However, pending transactions may fail if conditions aren't met.

### Technical Questions

**Q: Why does the app need my wallet address?**
A: Your wallet address is needed to send and receive tips on the Stellar network.

**Q: Is my data private?**
A: Yes. We only collect necessary data for account management and do not sell your information.

**Q: Can I use Dorisio on mobile?**
A: Basic features work on mobile browsers. Full wallet support requires a desktop browser with Freighter extension.

---

## Contact Support

If you've tried the solutions above and still need help:

### Self-Service Resources

- [GitHub Issues](https://github.com/Dorisio/frontend/issues) - Search for similar issues
- [Documentation](./README.md) - Main project documentation
- [SETUP Guide](./SETUP.md) - Development setup instructions

### Get Help

**Email:** support@dorisio.dev
**Response Time:** Typically within 24-48 hours

**When contacting support, please include:**
1. Your browser and version
2. Operating system
3. Steps to reproduce the issue
4. Screenshots or error messages
5. Console errors (open DevTools with F12)

### Community

- Join our Discord community for real-time help
- Follow us on Twitter for updates
- Check our blog for announcements and tips

---

## Reporting Bugs

If you believe you've found a bug:

1. Check existing GitHub issues to avoid duplicates
2. Use the bug report template in `.github/ISSUE_TEMPLATE/bug_report.md`
3. Include steps to reproduce, expected behavior, and actual behavior
4. Add screenshots or console logs if applicable
5. Tag with appropriate labels (bug, wallet, payments, etc.)

---

## Feature Requests

We welcome feature requests! To suggest improvements:

1. Check existing issues to avoid duplicates
2. Use the feature request template in `.github/ISSUE_TEMPLATE/feature_request.md`
3. Describe the problem you're trying to solve
4. Explain why this feature would be valuable
5. Consider if you can contribute the implementation

---

Last updated: September 29, 2026
