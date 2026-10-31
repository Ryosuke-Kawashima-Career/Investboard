# 🦀 Rust Debugging Reference

## 1. Module System & Visibility (`mod` vs `use`)
- **Root Declaration**: Files in `src/` (e.g. `foo.rs` or `foo/mod.rs`) do not compile automatically. They must be declared in the root crate file (`lib.rs` or `main.rs`) via `pub mod foo;` or `mod foo;`.
- **Importing Items**: Use `use crate::foo::Bar;` or `use foo::Bar;` only after the module is declared.
- **Visibility**: Struct fields, enum variants, and functions must be declared `pub` to be accessible outside their immediate module.

## 2. Common Compiler Errors & Resolutions

| Code | Message / Symptom | Root Cause | Solution |
|---|---|---|---|
| **E0432** | `unresolved import crate::xyz` | Module `xyz` not declared in root crate. | Add `pub mod xyz;` to `lib.rs` or `main.rs`. |
| **E0425** | `cannot find value xyz in this scope` | Typo in variable name or variable out of scope. | Check parameter and local variable spellings. |
| **E0308** | `mismatched types` / `? operator has incompatible types` | Return type does not match function signature or `?` unwrapped to unit `()`. | Ensure the final expression returns `Ok(value)` or match expected types. |
| **E0277** | `the trait bound T: Trait is not satisfied` | Missing `#[derive(...)]` or missing trait implementation. | Add required derives (e.g., `#[derive(Debug, Clone, Serialize, Deserialize)]`). |
| **E0599** | `no method named xyz found for type T in the current scope` | Missing trait import in scope or typo in method call. | Import the trait defining the method or fix method call syntax (e.g., `trim()`). |

## 3. Macro Syntax & Invocations
- Macro calls require delimiters: `format!("...", ...)`, `vec![...]`, `println!("...")`.
- Missing delimiters (e.g. `format!"..."`) result in parsing errors (`expected one of (, [, or {`).

## 4. Verification Command
```bash
cargo check --manifest-path src-tauri/Cargo.toml
# or
cargo test --manifest-path src-tauri/Cargo.toml
```
