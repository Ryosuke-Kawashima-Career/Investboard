# 🧑‍💻 Hand-Codable Engineering Mastery: `ShipHappens` (India Forward) Practice Module

Welcome to the interactive engineering workbook for **India Forward (`ShipHappens`)**. Every question below is grounded directly in the production architecture, algorithms, security boundaries, and frontend mechanics of this repository.

Attempt each problem on your own before toggling the solution!

---

## 📊 Level 1: Intuition, Domain Modeling & Data Integrity

### 🧩 Question 1: Non-Fabrication in Calendar OHLC Aggregation

#### 📝 Problem Statement
In [`src/chart-data.ts`](../src/chart-data.ts#L4-L36), `aggregateHistory(history, period)` rolls up daily observations into weekly (`6M`) or monthly (`1Y`) bars. 

Suppose a weekly bucket contains 5 trading days of closing prices (`close`), **4 of which** have full `open`, `high`, and `low` values, while **1 day** only has a `close` price (`open`, `high`, and `low` are `undefined`).

1. Why would it be dangerous in a financial research platform to compute the weekly `high` and `low` from the 4 available days and display a candlestick?
2. How does [`aggregateHistory`](../src/chart-data.ts#L24-L35) handle this exact edge case, and how does [`StockChart.tsx`](../src/StockChart.tsx#L19-L27) react?

---

<details>
<summary>💡 <b>Click to Reveal Answer & Step-by-Step Walkthrough</b></summary>

> **📌 Summary**: 
> A candlestick represents the complete price range (`open`, `high`, `low`, `close`) over an interval; computing high/low from partial intra-week data silently fabricates a tighter range than may have actually occurred.

#### 🔍 Step-by-Step Explanation
1. **Core Mechanism**: `aggregateHistory` checks whether **every** point in the bucket has `open`, `high`, and `low` defined using `Array.prototype.every()`:
   `const supplied = group.every(p => p.open !== undefined && p.high !== undefined && p.low !== undefined);`
2. **Key Insight / Calculation**: If even a single session in the group lacks OHLC values (`supplied === false`), the aggregated bar sets `open`, `high`, and `low` to `undefined` while still preserving `close: last.close`. In [`StockChart.tsx`](../src/StockChart.tsx#L19-L27), a `useEffect` detects missing OHLC data and automatically switches the chart mode to `"Line"` (and disables the `"Candles"` toggle button).
3. **Common Pitfall**: Using `group.filter(p => p.high !== undefined)` inside `Math.max(...)` or defaulting missing values to `p.close` (`p.high ?? p.close`). Both silently invent fake market bounds when a session's intraday range is unknown.

#### 🌍 Real-World Example / Analogy
- **Medical Vital Monitoring**: If a patient's hourly blood pressure monitor drops offline during hour 3 of a 6-hour shift, reporting the 6-hour "peak blood pressure" from the remaining 5 hours as a verified maximum could hide a critical spike during the missing hour.

#### 💻 Code Solution
```typescript
// From src/chart-data.ts
export function aggregateHistory(
  history: HistoryPoint[],
  period: string,
): HistoryBar[] {
  const groups = new Map<string, HistoryPoint[]>();
  for (const point of history) {
    let key = point.date;
    if (period === "1Y") key = point.date.slice(0, 7);
    else if (period === "6M") {
      // Snap to ISO Monday of that week in UTC
      const monday = new Date(`${point.date}T00:00:00Z`);
      monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
      key = monday.toISOString().slice(0, 10);
    }
    const group = groups.get(key) ?? [];
    group.push(point);
    groups.set(key, group);
  }

  return [...groups.values()].map((group) => {
    const first = group[0],
      last = group[group.length - 1];
    // Strict all-or-nothing check prevents fabricating partial-period wicks
    const supplied = group.every(
      (p) =>
        p.open !== undefined && p.high !== undefined && p.low !== undefined,
    );
    return {
      ...first,
      endDate: last.date,
      close: last.close,
      open: supplied ? first.open : undefined,
      high: supplied ? Math.max(...group.map((p) => p.high!)) : undefined,
      low: supplied ? Math.min(...group.map((p) => p.low!)) : undefined,
    };
  });
}
```

</details>

---

### 🧩 Question 2: Watchlist Schema Versioning & Cross-Mode ID Preservation

#### 📝 Problem Statement
Examine [`src/useWatchlist.ts`](../src/useWatchlist.ts#L4-L31). The hook accepts a boolean parameter `preserveUnsupported = false`.
- In synthetic demo mode ([`src/main.tsx`](../src/main.tsx#L130)), it is called as `useWatchlist()`.
- In real data mode ([`src/RealApp.tsx`](../src/RealApp.tsx#L50)), it is called as `useWatchlist(true)`.

1. Why does `useWatchlist` wrap the stored array in `{ version: 1, listingIds: [...] }` instead of storing a raw JSON array in `localStorage`?
2. If a user saves `NSE:TCS` in Demo mode and then switches to Real mode (which currently only covers `BSE:RELIANCE`), what happens to `NSE:TCS` in `localStorage` and in the UI, and why is `preserveUnsupported` designed this way?

---

<details>
<summary>💡 <b>Click to Reveal Answer & Step-by-Step Walkthrough</b></summary>

> **📌 Summary**: 
> Envelope versioning (`version: 1`) prevents silent state corruption across schema migrations, while `preserveUnsupported` ensures a user's saved symbols aren't destructively wiped when coverage changes or when switching between Demo and Real modes.

#### 🔍 Step-by-Step Explanation
1. **Core Mechanism**: When reading `arbor.watchlist.v1` from `localStorage`, `useWatchlist` validates `value.version === 1`, checks that `listingIds` is an array of strings, deduplicates with `new Set()`, and filters IDs based on `preserveUnsupported`.
2. **Key Insight / Calculation**:
   - When `preserveUnsupported === false` (Demo mode), it filters against the known in-memory `listings` fixture (`listings.some(l => l.id === id)`).
   - When `preserveUnsupported === true` (Real mode), it validates the ID format via regex `/^(NSE|BSE):[A-Z0-9&.-]{1,30}$/` even if the backend doesn't currently cover that listing. Then [`RealApp.tsx`](../src/RealApp.tsx#L424-L437) explicitly renders an *"Unavailable: listing is outside verified coverage"* card with a Remove button rather than silently deleting the user's saved item.
3. **Common Pitfall**: Filtering `localStorage` entries against the currently loaded API response on startup—if an API returns partial coverage or a user switches modes, their watchlist would be permanently overwritten on the next toggle.

#### 🌍 Real-World Example / Analogy
- **Music Streaming Playlists**: When a song in your playlist becomes temporarily unavailable in your region, Spotify greys out the track and lets you remove it manually rather than silently deleting it from your playlist behind your back.

#### 💻 Code Solution
```typescript
// From src/useWatchlist.ts
const value = JSON.parse(raw);
if (
  value.version !== 1 ||
  !Array.isArray(value.listingIds) ||
  !value.listingIds.every((id: unknown) => typeof id === "string")
) {
  throw new Error("invalid");
}
return {
  ids: [...new Set<string>(value.listingIds)].filter((id) =>
    preserveUnsupported
      ? /^(NSE|BSE):[A-Z0-9&.-]{1,30}$/.test(id)
      : listings.some((l) => l.id === id),
  ),
  warning: "",
};
```

</details>

---

## 🧮 Level 2: Mechanics, Date Math & Coordinate Geometry

### 🧩 Question 3: Calendar Date Arithmetic & The Month-End Overflow Trap

#### 📝 Problem Statement
Look at [`calendarFrom(today, period)`](../server/domain.ts#L85-L97) in `server/domain.ts` (and [`rangeStart`](../src/service.ts#L64-L80) in `src/service.ts`):

```typescript
export function calendarFrom(today: string, period: string) {
  const d = new Date(today + "T00:00:00Z");
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(
    d.getUTCMonth() - (period === "1M" ? 1 : period === "6M" ? 6 : 12),
  );
  const end = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, end));
  return d.toISOString().slice(0, 10);
}
```

1. What bug would happen if you removed `d.setUTCDate(1)` on line 88 and called `d.setUTCMonth(d.getUTCMonth() - 1)` directly when `today = "2026-03-31"` and `period = "1M"`?
2. How does `new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()` calculate the last day of the target month?
3. Why does [`validDate(value)`](../server/domain.ts#L30-L37) check **both** `/^\d{4}-\d{2}-\d{2}$/` **and** `new Date(value).toISOString().slice(0, 10) === value`?

---

<details>
<summary>💡 <b>Click to Reveal Answer & Step-by-Step Walkthrough</b></summary>

> **📌 Summary**: 
> JavaScript's `Date` rolls overflowing days into the next month (turning "Feb 31" into "March 3"). Anchoring to day `1` before shifting months—and clamping to the target month's actual length—prevents date-rollover bugs.

#### 🔍 Step-by-Step Explanation
1. **Core Mechanism (The Overflow Bug)**: If `d` is `2026-03-31` (`day = 31`) and you call `d.setUTCMonth(1)` (February, 0-indexed) while `UTCDate` is still `31`, JavaScript evaluates "February 31, 2026". Because 2026 is not a leap year (28 days in Feb), `Date` overflows by 3 days into **March 3, 2026** (`month = 2`)! Setting `d.setUTCDate(1)` first guarantees the month shift stays inside February.
2. **Key Insight / Calculation**: Passing day `0` to `Date.UTC(year, targetMonth + 1, 0)` asks for "one day before the 1st of the next month," which is always the exact last day (`28`, `29`, `30`, or `31`) of `targetMonth`. Clamping with `Math.min(day, end)` maps `2026-03-31` minus `1M` cleanly to `2026-02-28`.
3. **Common Pitfall (`validDate` Round-Trip)**: A regex like `/^\d{4}-\d{2}-\d{2}$/` and `Date.parse("2026-02-31")` both succeed in V8 because `Date.parse("2026-02-31")` silently rolls over to `2026-03-03`! Checking `new Date(value).toISOString().slice(0, 10) === value` catches impossible calendar dates like `2026-02-31` because `"2026-03-03" !== "2026-02-31"`.

#### 🌍 Real-World Example / Analogy
- **Billing & Subscription Cycles**: If a customer subscribes on January 31st and your billing cron subtracts or adds 1 month naively without clamping to month-end, their February invoice shifts to March 3rd, corrupting monthly cohort analytics.

#### 💻 Code Solution
```typescript
// Safe round-trip ISO calendar validation + clamped month subtraction
export function validDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    // Rejects rollover dates like "2026-02-31" -> "2026-03-03"
    new Date(value).toISOString().slice(0, 10) === value
  );
}
```

</details>

---

### 🧩 Question 4: SVG Coordinate Mapping & Pointer Hit-Testing in `StockChart`

#### 📝 Problem Statement
In [`src/StockChart.tsx`](../src/StockChart.tsx#L88-L100), the SVG chart maps price values and bar indices onto a `viewBox` of `width × height` (`height = 260`, `top = 14`, `bottom = 28`, `left = 58` on desktop, `right = 12`):

```typescript
const plotWidth = width - left - right,
  plotHeight = height - top - bottom;
const y = (value: number) =>
  top + ((high - value) / Math.max(high - low, 1)) * plotHeight;
const x = (i: number) => left + ((i + 0.5) / bars.length) * plotWidth;
```

1. In `y(value)`, why is the numerator `high - value` instead of `value - low`, and why is the denominator wrapped in `Math.max(high - low, 1)`?
2. Derive the inverse formula used in `onPointerMove` ([`StockChart.tsx`](../src/StockChart.tsx#L185-L197)) that converts a mouse event's `event.clientX` into the discrete bar index `cursor` in `[0, bars.length - 1]`.
3. Look at the candle `<rect>` on [lines 257–265](../src/StockChart.tsx#L257-L265):
   - Why is `y` set to `Math.min(y(p.open!), y(p.close))`?
   - Why is `height` wrapped in `Math.max(1.6, Math.abs(y(p.open!) - y(p.close)))`?

---

<details>
<summary>💡 <b>Click to Reveal Answer & Step-by-Step Walkthrough</b></summary>

> **📌 Summary**: 
> SVG y-coordinates grow **downward** from `0` at the top edge, so higher prices must map to smaller `y` pixel values, and flat-price edge cases (`open === close` or `high === low`) require lower-bound guards to prevent `NaN` division or invisible 0-height SVG rects.

#### 🔍 Step-by-Step Explanation
1. **Core Mechanism (Inverted Y-Axis)**: In SVG, `y = top` is the highest visual point on the chart and `y = top + plotHeight` is the lowest. When `value === high`, `(high - value)` is `0`, placing the point at `top`. If all bars have identical prices (`high === low`), `Math.max(high - low, 1)` prevents division by zero (`0 / 0 = NaN`).
2. **Key Insight / Calculation (Inverse X Hit-Testing)**:
   - First, convert DOM viewport coordinate `event.clientX` to SVG coordinate `svgX`:
     $$\text{svgX} = \frac{\text{clientX} - \text{rect.left}}{\text{rect.width}} \times \text{width}$$
   - Subtract the left axis gutter (`svgX - left`), normalize by `plotWidth`, multiply by `bars.length`, floor to an integer bucket, and clamp to `[0, bars.length - 1]`:
     $$\text{index} = \max\left(0, \min\left(N - 1, \left\lfloor \frac{\text{svgX} - \text{left}}{\text{plotWidth}} \times N \right\rfloor\right)\right)$$
3. **Common Pitfall (SVG `<rect>` Rendering)**: An SVG `<rect>` cannot have a negative `height`, and its `y` attribute must always be the **top** edge of the box. For a rising candle (`close > open`), `y(close) < y(open)`, so `Math.min(y(open), y(close))` picks `y(close)`. For a "doji" session where `open === close`, `Math.abs(...)` is `0`, which would make the candle body completely invisible without the `Math.max(1.6, ...)` floor.

#### 🌍 Real-World Example / Analogy
- **UI Slider Controls**: Just like an audio scrubber bar converts a mouse click pixel offset into a song timestamp and clamps drags outside the track to `0:00` or `end`, the chart inspector maps continuous pointer coordinates back into discrete time buckets.

#### 💻 Code Solution
```tsx
// Pointer hit-testing and candle body geometry from src/StockChart.tsx
onPointerMove={(event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  // Map DOM pixel X -> SVG viewBox X
  const svgX = ((event.clientX - rect.left) / rect.width) * width;
  // Invert x(i) bucket mapping and clamp to valid bar indices
  const index = Math.max(
    0,
    Math.min(
      bars.length - 1,
      Math.floor(((svgX - left) / plotWidth) * bars.length),
    ),
  );
  setCursor(index);
}}
```

</details>

---

## 🛠️ Level 3: Security, Concurrency & Debugging Under the Hood

### 🧩 Question 5: Defeating DNS Rebinding & SSRF in `safeProviderFetch`

#### 📝 Problem Statement
Inspect [`server/transport.ts`](../server/transport.ts#L4-L82). Instead of calling Node's global `fetch(url)` directly in [`server/provider.ts`](../server/provider.ts#L42), the backend passes `safeProviderFetch`.

Suppose a naive engineer replaced `safeProviderFetch` with the following two-step check:
```typescript
// ❌ FLAWED APPROACH
const { address } = await dns.promises.lookup(url.hostname);
if (!isPublicAddress(address)) throw new Error("UNSAFE_DNS_ADDRESS");
return fetch(url); // <-- Second DNS lookup happens inside fetch!
```

1. Explain the **Time-of-Check to Time-of-Use (TOCTOU) / DNS Rebinding** vulnerability in the flawed snippet above. How does [`safeProviderFetch`](../server/transport.ts#L39-L51) eliminate that window?
2. Look at `isPublicAddress(address)` in [`server/transport.ts`](../server/transport.ts#L4-L21). Why does an IPv4-mapped IPv6 address like `::ffff:127.0.0.1` or `fe80::1` get rejected by line 20:
   `return isIP(a) === 6 && /^[23]/.test(a) && !a.startsWith("2001:db8:");`?
3. Why does `safeProviderFetch` track `size += chunk.length` and destroy the request at `2_000_000` bytes instead of just checking `res.headers["content-length"]`?

---

<details>
<summary>💡 <b>Click to Reveal Answer & Step-by-Step Walkthrough</b></summary>

> **📌 Summary**: 
> Validating DNS before calling `fetch()` leaves a TOCTOU race where a second DNS lookup can resolve to `127.0.0.1` or cloud metadata (`169.254.169.254`). Passing a custom `lookup` callback to `https.request` validates and connects to the **exact same resolved IP** in a single step.

#### 🔍 Step-by-Step Explanation
1. **Core Mechanism (Eliminating DNS Rebinding)**: In `https.request(url, { lookup: ... })`, Node's socket layer delegates hostname resolution to our custom `lookup` hook. Inside that callback, we call `dns.lookup(hostname, { all: true })`, verify that **every** returned address satisfies `isPublicAddress(a.address)`, and pass the validated IP directly to the socket `callback(null, addresses[0].address, addresses[0].family)`. No second DNS query ever occurs, and TLS SNI (`url.hostname`) still verifies the certificate for `www.alphavantage.co`.
2. **Key Insight / Calculation (IPv6 Global Unicast Whitelist)**: Rather than playing whack-a-mole blacklisting `::1` (loopback), `::ffff:0:0/96` (IPv4-mapped IPv6), `fc00::/7` (unique local), and `fe80::/10` (link-local), line 20 uses a strict **allowlist**: IANA allocates global unicast IPv6 addresses exclusively in `2000::/3` (which start with hex digit `2` or `3`), minus the documentation prefix `2001:db8::/32`.
3. **Common Pitfall (`Content-Length` Spoofing)**: An upstream server (or chunked transfer encoding stream) can omit `Content-Length` or lie about it. Counting actual bytes in the `data` stream (`size > 2000000`) guarantees the process cannot be OOM-killed by an unbounded response body.

#### 🌍 Real-World Example / Analogy
- **Airport Security Check**: Checking a passenger's ID at the curb and then letting them walk unescorted through a public parking lot before boarding allows them to swap places with someone else; escorting them directly from the ID check onto the plane (custom socket `lookup`) closes the gap.

#### 💻 Code Solution
```typescript
// Custom DNS lookup hook inside https.request (from server/transport.ts)
lookup: (hostname, options, callback) => {
  lookup(hostname, { all: true }, (error, addresses) => {
    if (error) return callback(error, "", 4);
    if (
      !addresses.length ||
      addresses.some((a) => !isPublicAddress(a.address))
    ) {
      return callback(new Error("UNSAFE_DNS_ADDRESS"), "", 4);
    }
    // Validate and connect to the exact same resolved address; no second DNS lookup.
    if (options.all) (callback as any)(null, addresses);
    else callback(null, addresses[0].address, addresses[0].family);
  });
}
```

</details>

---

### 🧩 Question 6: Two-Tier Concurrency Control & Atomic SQLite Transactions

#### 📝 Problem Statement
Examine [`server/provider.ts`](../server/provider.ts#L104-L114) and [`server/store.ts`](../server/store.ts#L53-L81):

```typescript
// In Provider (server/provider.ts)
refresh() {
  if (this.running) return this.running;
  this.running = this.perform().finally(() => {
    this.running = null;
  });
  return this.running;
}
```
And inside `perform()`:
```typescript
if (!this.store.acquireRefresh())
  throw new ProviderError("REFRESH_ALREADY_RUNNING");
```
Meanwhile, `Store.reserve(now, budget)` and `Store.acquireRefresh()` both start with `this.db.exec("BEGIN IMMEDIATE")`.

1. Why does the system have **both** `this.running` (an in-memory `Promise`) **and** `this.store.acquireRefresh()` (a SQLite lease `refreshLeaseUntil` with a 60-second TTL)? When does each one trigger?
2. Why is `BEGIN IMMEDIATE` required in `reserve()` and `acquireRefresh()` instead of a default `BEGIN` (deferred) transaction in SQLite?
3. Why does `acquireRefresh()` use a timestamp lease (`Date.now() + 60000`) instead of a boolean flag (`isRefreshing = true`) in the database?

---

<details>
<summary>💡 <b>Click to Reveal Answer & Step-by-Step Walkthrough</b></summary>

> **📌 Summary**: 
> `this.running` coalesces concurrent callers within the **same Node.js instance** onto a single shared Promise, whereas the SQLite `refreshLeaseUntil` lease prevents **separate OS processes** (e.g., `npm run data:refresh` CLI vs. background server daemon) from colliding.

#### 🔍 Step-by-Step Explanation
1. **Core Mechanism (In-Process vs. Cross-Process)**:
   - **In-Process Coalescing (`this.running`)**: If two callers inside the same process invoke `provider.refresh()` simultaneously (tested in [`service-resilience.test.ts`](../tests/integration/service-resilience.test.ts#L14)), the second caller receives the exact same `Promise` reference and awaits its completion without throwing an error or firing duplicate HTTP calls.
   - **Cross-Process Mutual Exclusion (`acquireRefresh`)**: If the HTTP server ([`server/index.ts`](../server/index.ts)) is refreshing while an operator runs `npm run data:refresh` ([`server/cli.ts`](../server/cli.ts)) in another terminal, they do not share memory, so `acquireRefresh()` serializes them through `.local/research.sqlite`.
2. **Key Insight (`BEGIN IMMEDIATE`)**: In SQLite WAL mode, a standard `BEGIN` (deferred) transaction does not acquire a write lock until the first `INSERT`/`UPDATE` statement. If two processes both ran `SELECT` under a deferred transaction, both would see `count < budget` (or `refreshLeaseUntil == 0`), and the second one would either fail with `SQLITE_BUSY` on write or race. `BEGIN IMMEDIATE` acquires the reserved write lock **at the start of the transaction**, before the `SELECT` executes, guaranteeing linearizable read-modify-write semantics.
3. **Common Pitfall (Dead Boolean Locks)**: If a process crashes (`SIGKILL` or power loss) before `finally { this.store.releaseRefresh(); }` runs, a boolean `isRefreshing = true` row in SQLite would permanently wedge the database forever. A time-bounded lease (`Date.now() + 60000`) automatically self-heals after 60 seconds.

#### 🌍 Real-World Example / Analogy
- **Carpooling vs. Single-Lane Bridge**: Sharing `this.running` is like two coworkers getting into the same car so only one vehicle drives (`Promise` coalescing); `acquireRefresh()` with a 60-second lease is the traffic light on a one-lane bridge between separate cars, with a timeout sensor in case a car stalls.

#### 💻 Code Solution
```typescript
// Atomic read-modify-write rate limiter using BEGIN IMMEDIATE (server/store.ts)
reserve(now: number, budget: number) {
  this.db.exec("BEGIN IMMEDIATE");
  try {
    // Prune sliding 24-hour window (86,400,000 ms)
    this.db.prepare("DELETE FROM requests WHERE at <= ?").run(now - 86400000);
    const n = Number(
      this.db.prepare("SELECT COUNT(*) AS n FROM requests").get()!.n,
    );
    if (n >= budget) throw new Error("REQUEST_BUDGET_EXHAUSTED");
    this.db.prepare("INSERT INTO requests VALUES (?)").run(now);
    this.db.exec("COMMIT");
  } catch (e) {
    this.db.exec("ROLLBACK");
    throw e;
  }
}
```

</details>

---

### 🧩 Question 7: Path Traversal Defense in the Zero-Dependency Static Server

#### 📝 Problem Statement
In [`server/index.ts`](../server/index.ts#L29-L41), the static file server serves compiled frontend assets from `dist/` without Express or third-party middleware:

```typescript
const root = resolve("dist");
const target = resolve(
  root,
  "." +
    decodeURIComponent(
      url.pathname === "/" ? "/index.html" : url.pathname,
    ),
);
if (!target.startsWith(root + sep)) {
  res.writeHead(403);
  res.end();
  return;
}
```

1. Why is `"." + decodeURIComponent(...)` passed as the second argument to `resolve(root, ...)` instead of passing `decodeURIComponent(url.pathname)` directly?
2. Why is it critical to check `!target.startsWith(root + sep)` (with `path.sep` appended) rather than `!target.startsWith(root)`?

---

<details>
<summary>💡 <b>Click to Reveal Answer & Step-by-Step Walkthrough</b></summary>

> **📌 Summary**: 
> `path.resolve(root, "/etc/passwd")` treats a leading `/` as an absolute root path (discarding `root`), and checking `target.startsWith(root)` without `path.sep` allows sibling directory escapes like `dist-secrets/key.pem`.

#### 🔍 Step-by-Step Explanation
1. **Core Mechanism**: `url.pathname` always starts with `/`. In Node's `path.resolve(a, b)`, if `b` starts with `/`, `a` is ignored (on POSIX, or resolved to the drive root on Windows). Prepending `"."` turns `"/index.html"` into `"./index.html"`, making it relative to `root`.
2. **Key Insight / Calculation (The Sibling Prefix Trap)**: Suppose `root` is `/app/dist`. If an attacker requests `/../dist-private/secret.txt`, `target` resolves to `/app/dist-private/secret.txt`.
   - Does `"/app/dist-private/secret.txt".startsWith("/app/dist")` return `true`? **Yes!**
   - Does `"/app/dist-private/secret.txt".startsWith("/app/dist/")` (`root + sep`) return `true`? **No (`false`)!** Appending `sep` enforces a strict directory boundary.
3. **Common Pitfall**: Calling `decodeURIComponent` *after* checking for `..` or failing to catch malformed percent-encoding like `/%E0%A4%A` (which throws a `URIError`—handled here by the outer `try / catch` returning `404`).

#### 🌍 Real-World Example / Analogy
- **Building Room Access**: Checking if a badge grants access to `"Building 10"` using a string prefix without a delimiter would accidentally grant access to `"Building 101"` and `"Building 102"`.

#### 💻 Code Solution
```typescript
// Canonical static file boundary check in server/index.ts
const root = resolve("dist");
const target = resolve(
  root,
  "." +
    decodeURIComponent(
      url.pathname === "/" ? "/index.html" : url.pathname,
    ),
);
// Trailing `sep` prevents sibling-prefix bypasses (e.g., dist-backup/)
if (!target.startsWith(root + sep)) {
  res.writeHead(403);
  res.end();
  return;
}
```

</details>

---

## ⚖️ Level 4: Real-World Architecture & Production Trade-Offs

### 🧩 Question 8: Stale-While-Error Resilience, Budget Conservation & Secret Sanitization

#### 📝 Problem Statement
Review [`server/provider.ts`](../server/provider.ts#L25-L155), [`server/api.ts`](../server/api.ts#L3-L63), and [`tests/integration/service-resilience.test.ts`](../tests/integration/service-resilience.test.ts#L1-L59).

Alpha Vantage's free tier enforces a strict limit of ~25 requests/day, and the API key (`ALPHA_VANTAGE_API_KEY`) must be passed as a query parameter (`?apikey=...`) in the request URL.

1. **Failure Isolation**: Suppose `.local/research.sqlite` already holds 100 days of valid `BSE:RELIANCE` price history. On the next scheduled refresh, Alpha Vantage returns a corrupted candle where `low > open`, or returns HTTP `429`. Trace how `Provider.perform()`, `Store.saveHistory()`, and `snapshot()` ensure the user still sees the last known good data **while** also knowing the refresh failed.
2. **Retry & Quota Strategy**: When `Provider.request()` encounters an error, which failures are marked `retryable = true` vs. `retryable = false`, and why does Alpha Vantage returning HTTP `200 OK` with `{ "Note": "Thank you for using Alpha Vantage! Our standard API call frequency is..." }` trigger a 24-hour `blockedUntil` cooldown?
3. **Secret Leakage Prevention**: Since `apikey` is in the URL query string, many HTTP/network errors include the full request URL in `error.message` or `error.stack`. How does `Provider` guarantee that `ALPHA_VANTAGE_API_KEY` never leaks into SQLite state or `/api/*` JSON responses?

---

<details>
<summary>💡 <b>Click to Reveal Answer & Step-by-Step Walkthrough</b></summary>

> **📌 Summary**: 
> By validating the entire payload in memory (`normalizeDaily`) before opening a SQLite write transaction—and mapping all thrown errors to an allowlisted enum of uppercase error codes—the server preserves last-known-good state, protects scarce API quota, and prevents API key leakage.

#### 🔍 Step-by-Step Explanation
1. **Core Mechanism (Stale-While-Error)**:
   - `normalizeDaily(raw)` validates all 22–10,000 data points in memory **before** `this.store.saveHistory(...)` is called. If any point violates `low <= Math.min(open, close)`, `normalizeDaily` throws `"INVALID_OHLC"`, leaving the `observations` table and `lastSuccessfulRefresh` completely untouched.
   - The `catch` block in `perform()` writes `{ code: "INVALID_OHLC", retryable: false }` to the `state` table under `"error"`, while `lastAttemptedRefresh` was updated before the request.
   - `snapshot()` returns `status: "cached"`, `data.history` (the previous good observations), and `meta.error: { code: "INVALID_OHLC" }`. [`RealApp.tsx`](../src/RealApp.tsx#L205-L210) renders a non-blocking banner: *"Refresh unavailable: INVALID_OHLC. Last good observations are retained."*
2. **Key Insight (Quota Conservation)**:
   - Only transient transport errors (`PROVIDER_NETWORK_FAILURE`) and HTTP `5xx` without a `Retry-After` header (`PROVIDER_OUTAGE`) set `retryable = true` (capped at 1 retry with 250–750ms jitter).
   - Alpha Vantage famously returns HTTP `200 OK` with a JSON `Note` or `Information` field when rate-limited. `Provider.request()` inspects `if (data.Note || data.Information)`, sets `blockedUntil = Date.now() + 86400000` (24h), and throws a non-retryable `PROVIDER_LIMIT_OR_ENTITLEMENT` error so the app stops burning its daily 20-request budget.
3. **Common Pitfall (Credential Leakage in Error Messages)**:
   - In `Provider.request()`, any unexpected exception from `this.transport(url)` (which might contain `https://www.alphavantage.co/query?...&apikey=secret`) is discarded and replaced with `new ProviderError("PROVIDER_NETWORK_FAILURE", true)`.
   - As a second defense-in-depth layer in `perform()`, `const code = e instanceof Error && /^[A-Z_]+$/.test(e.message) ? e.message : "REFRESH_FAILED"` guarantees that only clean `SCREAMING_SNAKE_CASE` error codes can ever be persisted to SQLite or returned in `/api/*` responses.

#### 🌍 Real-World Example / Analogy
- **Aviation Cockpit Instruments**: If a GPS satellite signal momentarily drops or sends a garbled packet, the flight display keeps showing the plane's last verified position alongside an amber `"POS STALE / GPS FAULT"` flag—and logs a numeric fault code rather than dumping raw internal bus memory onto the screen.

#### 💻 Code Solution
```typescript
// Defense-in-depth error sanitization & last-good-data retention (server/provider.ts)
try {
  // ... symbol verification & TIME_SERIES_DAILY fetch ...
  const raw = await this.request({
    function: "TIME_SERIES_DAILY",
    symbol: manifest.providerSymbol,
    outputsize: "compact",
  });
  // normalizeDaily() runs in-memory; saveHistory() only commits if 100% valid
  this.store.saveHistory(normalizeDaily(raw), new Date().toISOString());
} catch (e) {
  // Strict regex whitelist ensures raw URLs/keys in Error.message never leak
  const code =
    e instanceof Error && /^[A-Z_]+$/.test(e.message)
      ? e.message
      : "REFRESH_FAILED";
  this.store.set("error", {
    code,
    retryable: e instanceof ProviderError && e.retryable,
  });
  throw new ProviderError(code);
} finally {
  this.store.releaseRefresh();
}
```

</details>

---

### 🧩 Question 9: Evidence Provenance, Deterministic Hashing & The 30-Day IST Discovery Signal

#### 📝 Problem Statement
Examine [`server/evidence.ts`](../server/evidence.ts#L4-L79) and [`discovery()`](../server/domain.ts#L98-L132) in `server/domain.ts`.

1. **Deterministic ID & URL Canonicalization**: In [`validateEvidence()`](../server/evidence.ts#L21-L56), why does the code reject URLs with query strings (`url.search`), strip URL fragments (`url.hash = ""`), restrict hostnames/paths to specific regexes on `www.ril.com` and `nsearchives.nseindia.com`, and compute:
   `id: createHash("sha256").update(url.href).digest("hex").slice(0, 16)`?
2. **Timezone-Aware Windowing**: In [`discovery(evidence, now)`](../server/domain.ts#L98-L132), how is the 30-calendar-day window calculated in `Asia/Kolkata` (`IST`), and why are items with `publishedAt === null` or `publishedAt > asOf` explicitly recorded in `exclusions` with human-readable reasons rather than silently dropped?

---

<details>
<summary>💡 <b>Click to Reveal Answer & Step-by-Step Walkthrough</b></summary>

> **📌 Summary**: 
> Content-addressing disclosures by their canonicalized `https://` URL makes imports idempotent, while computing the 30-day window in `Asia/Kolkata` with explicit exclusion tracking makes the `recent-disclosure-v1` signal auditable and deterministic.

#### 🔍 Step-by-Step Explanation
1. **Core Mechanism (Canonical Idempotency)**:
   - Stripping `url.hash = ""` ensures that `https://.../report.pdf#page=4` and `https://.../report.pdf#page=10` resolve to the same underlying document URL (`url.href`) and generate the exact same 16-hex-character SHA-256 `id`.
   - Rejecting `url.search` blocks tracking parameters (`?utm_source=...`) from creating duplicate records for the same filing, and strict domain/path allowlisting prevents arbitrary external links from being imported as "official company disclosures."
2. **Key Insight (30-Day IST Window & Auditability)**:
   - `indiaDate(now)` formats `now` in `"en-CA"` (`YYYY-MM-DD`) using `timeZone: "Asia/Kolkata"`.
   - Subtracting `29` days (`start.setUTCDate(start.getUTCDate() - 29)`) creates an inclusive 30-calendar-day window `[from, asOf]` (since `asOf - (asOf - 29) + 1 = 30` days, including today).
   - Recording `exclusions` (`"Publication date unknown"`, `"Future publication"`, `"Outside window or unverified"`) lets engineers and auditors verify *why* a company did or didn't trigger the discovery signal on any given date.
3. **Common Pitfall**: Using `new Date().toISOString().slice(0, 10)` for `asOf`—between `00:00` and `05:30 IST`, UTC is still on the previous calendar day, which would reject a valid same-day morning filing on NSE/BSE as a `"Future publication"`!

#### 🌍 Real-World Example / Analogy
- **Academic Citation Indexing**: Libraries index papers by their canonical DOI rather than a URL with browser scroll fragments, and regulatory compliance systems log *why* a filing was excluded from a reporting period rather than silently omitting it.

#### 💻 Code Solution
```typescript
// Deterministic ID generation & 30-day Asia/Kolkata window (server/domain.ts)
export function discovery(evidence: any[], now = new Date()) {
  const asOf = indiaDate(now); // YYYY-MM-DD in Asia/Kolkata
  const start = new Date(asOf);
  start.setUTCDate(start.getUTCDate() - 29); // Inclusive 30-day window
  const from = start.toISOString().slice(0, 10);

  // Deduplicate by deterministic id
  evidence = [...new Map(evidence.map((e) => [e.id, e])).values()];
  const eligible = evidence.filter(
    (e) =>
      e.companyId === manifest.companyId &&
      e.verifiedAt &&
      e.type === "company-disclosure" &&
      validDate(e.publishedAt) &&
      e.publishedAt >= from &&
      e.publishedAt <= asOf,
  );
  // ... returns signal with evidenceIds and exclusions
}
```

</details>

---

### 🧩 Question 10: Keyboard-First Accessibility & Lifecycle Hygiene in React

#### 📝 Problem Statement
Inspect [`src/StockChart.tsx`](../src/StockChart.tsx#L127-L184) and [`src/RealApp.tsx`](../src/RealApp.tsx#L51-L64):

1. In [`RealApp.tsx`](../src/RealApp.tsx#L51-L64), trace what happens when a user clicks the **Retry** button twice in rapid succession (`setRevision(r => r + 1)`). How does `AbortController` prevent a slow, earlier failed request from overwriting a newer successful request?
2. In [`StockChart.tsx`](../src/StockChart.tsx#L127-L184), how do `tabIndex={0}`, `onKeyDown` (`ArrowLeft`, `ArrowRight`, `Home`, `End`), `aria-live="polite"`, and `ResizeObserver` work together so a keyboard-only or screen-reader user has the exact same analytical power as a mouse user?

---

<details>
<summary>💡 <b>Click to Reveal Answer & Step-by-Step Walkthrough</b></summary>

> **📌 Summary**: 
> `AbortController` cancels in-flight `fetch` calls and guards state updates on unmount/re-trigger, while combining roving index state (`cursor`) with `onKeyDown` and an `aria-live="polite"` OHLC readout makes custom SVG charts fully accessible without external charting libraries.

#### 🔍 Step-by-Step Explanation
1. **Core Mechanism (`AbortController` Race Prevention)**:
   - Every time `revision` changes, React runs the cleanup function `() => controller.abort()` from the previous effect before starting the new `useEffect`.
   - `controller.signal` is passed directly into `fetch("/api/companies", { signal })`, immediately cancelling the older network request at the browser level.
   - Even if the promise rejection handler fires after aborting, `if (!controller.signal.aborted)` prevents calling `setError(true)` or `setLoading(false)` on a superseded request.
2. **Key Insight (Accessible SVG Charting)**:
   - Standard `<svg>` elements are not keyboard-focusable and opaque to screen readers beyond their `aria-label`.
   - Wrapping the SVG in `<div className="chart-inspector" tabIndex={0} role="group" onKeyDown={...}>` allows keyboard users to Tab into the chart and step bar-by-bar using `ArrowLeft`/`ArrowRight` or jump to the first/last bar with `Home`/`End` (calling `event.preventDefault()` so the page doesn't scroll).
   - Both keyboard navigation and pointer movement update the exact same `cursor` state, which updates the `<div className="ohlc-readout" aria-live="polite" aria-atomic="true">` region—announcing the date range and OHLC prices to assistive technologies without stealing focus.
3. **Common Pitfall**: Attaching `ResizeObserver` without disconnecting it on cleanup (`return () => observer.disconnect()`), or forgetting `event.preventDefault()` on `Home`/`End`/`Arrow` keys, which causes the browser window to jump while the user is trying to inspect candles.

#### 🌍 Real-World Example / Analogy
- **Hardware Oscilloscope Knobs**: Whether you tap a touchscreen oscilloscope directly (pointer hit-testing) or turn the physical rotary encoder click-by-click (`ArrowLeft`/`ArrowRight`), both drive the same cursor readout on the display.

#### 💻 Code Solution
```tsx
// Abort-safe async data loading in src/RealApp.tsx
useEffect(() => {
  const controller = new AbortController();
  setLoading(true);
  setError(false);
  loadResearch(controller.signal)
    .then(setResult)
    .catch(() => {
      if (!controller.signal.aborted) setError(true);
    })
    .finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
  return () => controller.abort();
}, [revision]);
```

</details>
