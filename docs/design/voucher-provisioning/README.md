# Voucher provisioning & redemption — UI/UX screens

Reference mockups for the voucher provisioning & redemption flow (PRD: GitHub issue #47;
spec: [`docs/voucher-provisioning-spec.md`](../../voucher-provisioning-spec.md); ADRs 0009-0011).

These PNGs are exported from the Paper design file **Areacodes**
(`https://app.paper.design/file/01KWCYN40197RZ2VMX4B9N2QGX/1-0`) and committed here so they are
versioned and readable without the design tool — including by automation (Sandcastle) running headless.
Paper is the source of truth; re-export here when the screens change.

On-brand throughout: pure black/white, zero border-radius (sharp stamp/sticker aesthetic), Poppins for
UI, Geist Mono for codes, the areacodes pin as the app mark.

## Screens

Desktop = business portal (1440-wide). Mobile = 390x844.

| # | File | Surface | Flow step |
|---|------|---------|-----------|
| 1 | [`wizard-1-provider.png`](./wizard-1-provider.png) | Business portal (desktop) | Creation wizard step 1 — choose Provider (connected Square / Manual). Skipped when Manual is the only option. |
| 2 | [`wizard-2-discount-kind.png`](./wizard-2-discount-kind.png) | Business portal (desktop) | Creation wizard step 2 — pick Discount Kind, capability-filtered by the chosen Provider. |
| 3 | [`wizard-3-details.png`](./wizard-3-details.png) | Business portal (desktop) | Creation wizard step 3 — details & validity window (auto-derived title/description, editable). |
| 4 | [`wizard-4-review.png`](./wizard-4-review.png) | Business portal (desktop) | Creation wizard step 4 — review & create. |
| 5 | [`vouchers-provisioning-status.png`](./vouchers-provisioning-status.png) | Business portal (desktop) | Vouchers list showing per-voucher provisioning state: Live / Publishing / Needs attention. |
| 6 | [`redemption-pin-setting.png`](./redemption-pin-setting.png) | Business portal (desktop) | Redemption PIN setting (set/rotate; rotating revokes unlocked devices). |
| 7 | [`staff-redemption-1-unlock.png`](./staff-redemption-1-unlock.png) | Staff web page (mobile) | Manual redemption — device PIN unlock (first use per device). |
| 8 | [`staff-redemption-2-confirm.png`](./staff-redemption-2-confirm.png) | Staff web page (mobile) | Manual redemption — offer + Redeem button (confirm-then-burn). |
| 9 | [`staff-redemption-3-redeemed.png`](./staff-redemption-3-redeemed.png) | Staff web page (mobile) | Manual redemption — redeemed confirmation. |
| 10 | [`customer-wallet-voucher.png`](./customer-wallet-voucher.png) | Customer wallet (mobile) | Revealed voucher with QR (Manual: redemption-URL QR; flips to Redeemed after server-side burn). |

## Related user stories (PRD #47)

- Wizard 1-4: stories 1-7.
- Provisioning status: stories 8-11.
- Redemption PIN: stories 16-17.
- Staff Manual redemption: stories 18-21.
- Customer wallet: stories 22-25, 32.
