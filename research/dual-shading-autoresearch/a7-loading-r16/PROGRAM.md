# R16 loading-only autoresearch program

## Question

Can the fixed public `keyboard-dye-areal-load-v1` field, without tuning a rate,
gain, capacity, palette, or initial fraction, repair the missing broad/wet and
overlap response seen in the terminal R15 study?

This is a profile-controlled synthetic Contact study. Its rounded centreline is
not a real font glyph and must not be presented as one.

## Immutable candidate

- Exactly one candidate identifies `keyboard-dye-areal-load-v1`.
- There is no candidate parameter, batch search, gain, rate, or Q sweep.
- Engine: `0.45.0-experimental.1`; dye recipe: `edge-dye-study@16`.
- R16 deliberately retains the capacity-free R14 two-dye transport rates and
  `two-dye-total-residual-v2` state shape. Only initial areal loading changes.
- Font size 28, DPR 2, fixed seed, source 112×80, Surface 56×40.

## Locked 99-case matrix

The main 81 cases are UEF/M/B × flow 30/58/85 × smooth/balanced/absorbent ×
single straight/exact double pass/cross junction.

The 18 flow-58 controls are:

- nine M-width length variants (three target constant-length UEF/M/B alpha
  areas × three papers), each within 1% of its target;
- nine actual-nib inverse-length controls (UEF/M/B × three papers), each within
  1% of the standard M constant-length alpha area.

The source mask starts from one synthetic rounded M-width centreline. Public
`getGlyphContactGeometry` and `morphAlpha` produce UEF/M/B contacts. The public
areal-load builder and public Surface state API own the calculation.

## Contract hard gates fixed before result inspection

- repeat-exact load bytes; finite, non-negative, and exactly zero outside
  Contact;
- M/58 single interior load equals 1; exact double load total and field equal
  2 within 2e-6; cross junction/arm ratio is at least 1.9;
- for a fixed mask, total load strictly increases from flow 30 to 58 to 85;
- both control families miss their target integrated alpha area by at most 1%;
- ordinary water/mobile clamp share is zero for single and at most 5% for
  double/cross;
- primary, secondary, and residual relative conservation error is at most
  5e-5; species are finite and non-negative;
- transported/well-mixed alpha delta is zero.

## Predeclared visual-hypothesis criteria

These are directional research criteria, not engine-contract theorems. A
failure records `contract-pass / visual-falsified`; it does not accuse the R16
implementation of violating its contract. Readability, connected-patch,
global-recolour, interior-outline, speckle, optical-area, and optical-delta
artifact criteria remain active, together with the following loading-only
hypothesis checks:

- B/UEF signed span ratio is at least 0.9;
- flow-85/flow-30 B signed span ratio is at least 1.10 and optical changed area
  rises by at least 0.015;
- double/cross occupancy rises by at least 0.05 over single and junction/body
  signed span ratio is at least 1.10;
- M length-only body span varies by no more than 10%;
- in equal-area controls B is no worse than UEF, and constant-length B exceeds
  the same-total-alpha M-length control.

The evaluator budget is 30 seconds. Any failed visual gate falsifies the
loading-only hypothesis; it is not an implementation failure. There is no
automatic nine-point claim and no automatic score increase.

## Predecessor and next method

The lock chains to the terminal A7-3 archive and requires that its R15 runtime
is rejected by R16. If loading algebra passes but fraction topology stays
scale-invariant, score remains 6.3. The next distinct method is ordered deposit
time plus surface-lifetime-gated pinned redistribution.
