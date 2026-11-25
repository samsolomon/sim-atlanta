# Brookwood one-neighbor study on Galaxy A16

Samsung Galaxy A16 SM-S166V, Android 16, Chrome 157.0.8103.78 over USB. The display is 1080 × 2340. Chrome reported 384 × 692 CSS pixels at DPR 2.8125 in all six sessions. Three runs per arm used the same frozen [fixture source](https://github.com/samsolomon/sim-atlanta/commit/eac573555d16fe32f4079a42405c7138eafc5987) and artifact SHA-256 `2de7f578723b48501c8241797ba6a0815e846551049c64310732f7a75b07c405`. These are fresh fixture tabs with cache bypass through first Station entry in an existing Chrome process. Resident returns used the same document. The route was South → Station → South → Station at Low, frozen 14:00 Eastern and clear weather.

| Physical measurement, median of three runs | Stock | Deferred |
| --- | ---: | ---: |
| Navigation to first usable South frame | 32.135 s | 29.279 s |
| First Station request to usable frame | 24.3 ms | 2,532.0 ms |
| Resident Station return to usable frame | 15.4 ms | 20.1 ms |
| Station fetch and decode stage | 1,259.3 ms | 729.3 ms |
| Station construction | 1,262.4 ms | 1,232.3 ms |
| Station connect through tree commit | 0.3 ms | 0.2 ms |
| Station synchronous scene attachment | 292.9 ms | 300.3 ms |
| Longest rAF gap during first entry through one second after usable | 55.5 ms | 1,722.3 ms |
| First entry CPU update + render submission p50 / p95 | 7.3 / 11.6 ms | 7.3 / 23.6 ms |
| First entry rAF spacing p50 / p95 | 11.1 / 22.3 ms | 11.2 / 100.0 ms |
| Resident entry CPU update + render submission p50 / p95 | 6.8 / 16.6 ms | 6.6 / 10.5 ms |
| Resident entry rAF spacing p50 / p95 | 11.1 / 22.3 ms | 11.1 / 22.3 ms |
| Settled South geometry / texture counts | 546 / 81 | 522 / 72 |
| First Station geometry / texture counts | 547 / 81 | 595 / 80 |
| Resident Station geometry / texture counts | 550 / 81 | 596 / 81 |
| Pan input to sampled target change | 62.2 ms | 54.2 ms |
| Pinch input to sampled distance change | 58.1 ms | 53.5 ms |

Deferral saved 2.856 s at cold South entry and added 2.508 s at the first Station visit, with a 1.71–1.81 s frame gap in every deferred run. At 90 Hz, one, two and three refreshes take 11.1, 22.2 and 33.3 ms. First-entry p95 CPU submission exceeded two refreshes for deferred. Its p95 rAF spacing exceeded three in all three runs. The CPU frame samples omit work between callbacks, including synchronous row construction. Frame spacing captures that stall. The usable marker is the first submitted City frame at the destination with its row mounted and the loading cover hidden. GPU completion and physical display presentation were unavailable.

Each arm fetched exactly three Station files per session, totaling 688,688 encoded body bytes and 689,588 Resource Timing transfer bytes. Stock started all three before the first Station request. Deferred started them 1–4 ms after it. Neither arm fetched a Station file on resident return. Renderer counters count objects, not allocated bytes. JavaScript heap reported exactly 10,000,000 bytes throughout and gives no usable allocation delta.

Native pan and pinch changed the camera in all six runs. The search-result tap failed the destination check in all six. After input the camera was near (-104, -5056) at 206 m, while the expected Five Points view was (-60, 60) at 700 m. Selection latency is unavailable. These inputs followed resident return, so their latency does not measure interaction during the cold-approach stall.

The p50/p95 entries are medians of per-run percentiles from request through one second after usable. With three runs per arm, these values describe this fixture and route. The deferred first-entry delay and stall make this version unsuitable for seamless boundary crossing on this handset.

A separate physical Galaxy diagnostic verified selection in each arm. The original tap coordinates hit the developer performance overlay. Tapping an exposed portion of the same Five Points result reached (-60, 60) at 700 m in both arms. The six original selection latency samples remain unscored.
