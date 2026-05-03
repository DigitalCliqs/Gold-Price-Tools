# AdSense Action Items — GoldPriceTools
> Blocking AdSense resubmission | Owner: Slavko

---

## 🔴 Required Before Resubmission

### 1. W-8BEN Tax Form (#27)
**Why:** Avoids 30% US withholding tax on all AdSense earnings (you're UK-based, not US).  
**Where:** AdSense → Payments → Settings → Tax info

Steps:
1. Go to https://adsense.google.com → **Payments** → **Manage settings**
2. Under **United States tax info**, click **Add tax info**
3. Select **Individual** (not business, since your AdSense account is personal)
4. Select **Non-US person** → Choose **W-8BEN**
5. Fill in:
   - Name: Slavko Filipovich
   - Country of citizenship: United Kingdom
   - Permanent address: Your Barking, England address
   - Tax treaty: UK/US treaty — claim exemption on **Article 12** (royalties)
   - Leave SSN/ITIN blank (not required for W-8BEN)
6. Sign and submit
7. **Result:** Reduces withholding from 30% to 0% under UK/US tax treaty

---

### 2. Identity Verification + GBP BACS Payment (#48)
**Why:** Required for AdSense to issue any payments. Without this, earnings accumulate but can never be paid out.

**Identity verification:**
1. AdSense → **Payments** → **Payments info**
2. Click **Verify your identity**
3. Upload: UK passport or driving licence (front + back)
4. Verification typically takes 1–3 business days

**GBP BACS bank transfer setup:**
1. AdSense → **Payments** → **Add payment method**
2. Select **Wire transfer (EFT)**
3. Enter your UK bank details:
   - Account holder: Slavko Filipovich
   - Sort code: [your sort code]
   - Account number: [your account number]
   - SWIFT/BIC: [your bank's BIC]
4. Google will make a test deposit of a few pence to verify — check your statement in 1–3 days
5. Once confirmed, set as primary payment method

**Note:** UK payment threshold is £60. Current balance: £2.64. Payment will be issued automatically once threshold is reached.

---

### 3. Link GA4 to AdSense (#24)
**Why:** Enables traffic source breakdown in AdSense and combined revenue + traffic reporting in GA4.

**GA4 Property ID:** 534363962

Steps:
1. Go to **Google Analytics** → Admin (gear icon) → **Property** → **AdSense linking**
2. Click **Link**
3. Select your AdSense account (pub-8849494330640886)
4. Enable data sharing both ways
5. In AdSense: Reports → Advanced reports → add **Traffic source breakdown** dimension
6. Save as custom report named: "Traffic Source RPM"

---

### 4. Request AdSense Review
Once #27 and #48 are done:
1. Go to https://adsense.google.com → **Sites** → goldpricetools.com
2. Click **Request review**
3. Use the following supporting note: 
   > "Site fully rebuilt with 9 blog articles (1,700–2,000 words each), 16 editorial content pages (1,400–2,100 words), FAQPage schema on all pages, full E-E-A-T infrastructure (editorial standards page, author bio page, editorial team bylines), internal linking throughout. W-8BEN and payment method configured. Ready for review."

---

## 📊 AdSense Current Status (as of 3 May 2026)

| Metric | Value |
|--------|-------|
| Account state | READY (ads serving, but site flagged) |
| Balance | £2.64 |
| UK payment threshold | £60.00 |
| April RPM | £1.42 |
| YTD earnings (2026) | £1.82 |
| 28-day page views | 460 |

*Data pulled via AdSense API, 3 May 2026*
