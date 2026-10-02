# Foodeez — QR ordering web app

Customers scan a QR → menu opens → add momos to cart (login optional) → checkout → pay by UPI (or at counter) → the order is sent to your WhatsApp **+91 73038 59375**.
It works on any phone and can be added to the home screen as an app.

## Before going live (2 minutes)
Open `menu.js` and fill in:
- `upiId` — already set to your Google Pay for Business ID **8941927137@okbizaxis** (Foodeez). It came from your GPay QR. The app makes a fresh QR code with the exact order amount for each order.
- `razorpayKey` *(optional)* — your Razorpay Key ID, for card, netbanking and wallet payments.
- `deliveryFee` *(optional)*.

You can change prices and items in the same file. After changing anything, also bump `VERSION` in `sw.js` (e.g. `foodeez-v2`) so phones pick up the new version.

## Put it online (free)
It's plain HTML with no build step. Upload the whole folder to any static host:
- **Netlify Drop**: drag this folder onto https://app.netlify.com/drop
- or Cloudflare Pages / GitHub Pages / Vercel.

HTTPS is required for “Add to Home Screen”, and all of these hosts provide it.

## Make the QR codes
Open `https://YOUR-SITE/qr.html`, paste your site link, and pick the menu:
- **Foodeez Cart** → `?loc=cart` (with Popcorn Momos and cart prices)
- **Foodeez Shop** → `?loc=shop` (shop prices)

Then print the poster.

## How payment confirmation works
UPI is paid directly into your account, so no money passes through any server. The customer can enter the UTR number, and the WhatsApp message says “customer says PAID”. **Check your UPI app for the payment before cooking.** If you want automatic payment verification, the next step is Razorpay with a small backend.

## Coupons & 10% off for Follow / Review
At checkout, under **Offers & coupons**:
- **Follow us on Instagram** (@foodeez_on_wheels): code `FOLLOW10`, 10% off.
- **Review us on Google**: code `REVIEW10`, 10% off.
- How it works:
  1. The customer taps **Follow** or **Review**, which opens Instagram or Google.
  2. They do the task and come back.
  3. They tap **Done ✓**.
  The code applies only if they spent at least 8 seconds away for Instagram, or 15 seconds for a Google review. Tapping Done straight away is refused. You can change these times with `offerWaitSec` in `menu.js`.
- Customers can also type a code. Only one coupon applies per order.

The same Follow and Review buttons are in the page footer and on the order-confirmed screen.
To add or change codes, edit `coupons` in `menu.js`. For example, add `WELCOME10: { pct: 10 }`, or set `minOrder` or `maxOff`.

⚠️ A website can't check whether someone really followed or reviewed. The waiting time stops people tapping straight through, but it isn't proof. The WhatsApp order shows the coupon used, so you can ask for a screenshot if you want proof.

## Login
Login saves the customer's name and phone **on their own phone**. This gives 1-tap checkout, order history and reorder. There is no OTP or server yet.

## Files
- `index.html`, `styles.css`, `app.js` — the app
- `menu.js` — **settings + menu + prices (edit this)**
- `img/` — food photos and icons. Replace `steam.jpg`, `fried.jpg` and `kurkure.jpg` with real photos, and add photos for gravy, tandoori and butter in `IMG` inside `menu.js`.
- `qr.html` — QR poster maker
- `sw.js`, `manifest.webmanifest` — home-screen app and offline support
- `menu-images/` — your original menu photos

Test locally: `python3 -m http.server 8080` → http://localhost:8080
