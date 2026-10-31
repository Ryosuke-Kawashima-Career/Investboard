# 🟦 TypeScript & React Debugging Reference

## 1. Primitive Types vs Boxed Object Types
- Always use lowercase primitive types: `string`, `number`, `boolean`, `symbol`, `bigint`.
- Avoid uppercase wrapper types (`String`, `Number`, `Boolean`), as they refer to object wrapper instances that cannot be assigned to standard primitive values.

## 2. Common Diagnostics & Solutions

| Code | Message / Symptom | Root Cause | Solution |
|---|---|---|---|
| **TS2322** | `Type 'X' is not assignable to type 'Y'` | Type mismatch, boxed primitive type, or incorrect property typing. | Align variable and parameter types. Check function return signatures. |
| **TS2345** | `Argument of type 'X' is not assignable to parameter of type 'Y'` | Passing incompatible arguments or invalid state setter payload. | Verify caller arguments match expected function parameters. |
| **TS7006** | `Parameter 'x' implicitly has an 'any' type` | Missing type annotations in callback/map parameters when `noImplicitAny` is enabled. | Provide explicit type or ensure parent array is properly typed. |
| **TS2528** | `A module cannot have multiple default exports` | Multiple `export default` statements in the same file. | Consolidate to a single `export default` or use named exports. |
| **TS1005** | `',' expected` / syntax error in destructuring | Typos in array/object destructuring (e.g. `[a \| b]` instead of `[a, b]`). | Correct destructuring delimiters and commas. |

## 3. DOM & SVG Ref Typing in React
- SVGs: Use `useRef<SVGSVGElement | null>(null)` for `<svg>` elements.
- HTML Elements: Use specific element types (e.g., `HTMLDivElement`, `HTMLInputElement`, `HTMLCanvasElement`).

## 4. Verification Command
```bash
npm run build
# or
npx tsc --noEmit
```
