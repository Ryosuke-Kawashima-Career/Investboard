# 🦀⚡ Tauri IPC & Native Bridge Debugging Reference

## 1. IPC Command Registration
- **Backend**: Every command function must be decorated with `#[tauri::command]`.
- **Handler Registration**: Commands must be passed to `tauri::generate_handler![cmd1, cmd2, ...]`.
- **Scope Requirement**: The command functions must be explicitly imported or defined in the scope where `generate_handler!` is called.

## 2. Serde Serialization Across IPC
- When returning structured data across the IPC bridge, the type must derive `serde::Serialize` (for Rust $\rightarrow$ Frontend) and `serde::Deserialize` (for Frontend $\rightarrow$ Rust).
- Attribute strings must be quoted: `#[serde(rename_all = "camelCase")]`. Missing quotes causes compiler rejection of Serde derives and downstream `IpcResponse` failures.

## 3. Frontend Invoke Contracts
- Frontend invocation command name strings must match the Rust function snake_case names:
  ```typescript
  import { invoke } from "@tauri-apps/api/core";
  const result = await invoke<T>("command_name", { argName: value });
  ```
- Tauri automatically converts JavaScript camelCase arguments (e.g. `{ filePath }`) to Rust snake_case parameters (e.g. `file_path: String`).

## 4. Verification Command
```bash
cargo check --manifest-path src-tauri/Cargo.toml
npm run build
```
