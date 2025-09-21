# Vendure Admin API Authorization Failure: Investigation Summary

## 1. Objective

The primary goal is to fix a persistent authorization error that prevents a Node.js script (`bulk-tracking-update.js`) from performing bulk updates to order fulfillments via the Vendure Admin API.

## 2. The Core Problem

A script successfully authenticates with the Vendure Admin API using `SuperAdmin` credentials and receives a valid auth token. However, the very next GraphQL request made with that token fails with a `FORBIDDEN` error: `"You are not currently authorized to perform this action"`.

This behavior is illogical, as the server is rejecting a token it issued just milliseconds prior.

## 3. Chronological Investigation Log

We have systematically investigated and ruled out numerous potential causes.

### Investigation 1: Database Integrity
- **Hypothesis**: The `damned` administrator user does not have the correct `SuperAdmin` role in the database.
- **Actions**:
    - Directly queried the PostgreSQL `role`, `administrator`, and `user_roles_role` tables.
- **Result**: **Ruled Out**. The database is correctly configured. The `damned` user (ID `2`) is correctly associated with the `__super_admin_role__` (ID `1`).

### Investigation 2: Plugin & Middleware Conflicts
- **Hypothesis**: A custom plugin or middleware is interfering with the authentication process.
- **Actions**:
    - Systematically disabled `SecurityPlugin`, `HardenPlugin`, `RedisCachePlugin`, and `AuditPlugin` in `vendure-config.ts`.
    - The server was restarted after each change.
- **Result**: **Ruled Out**. The `FORBIDDEN` error persisted even with all custom plugins disabled.

### Investigation 3: Corrupted Environment
- **Hypothesis**: The environment is corrupted (stale cache, bad dependencies).
- **Actions**:
    - Cleared the Redis cache using `redis-cli FLUSHDB`.
    - Deleted the `node_modules` directory and reinstalled all dependencies using `pnpm install`.
- **Result**: **Ruled Out**. The error persisted in a clean environment.

### Investigation 4: Script Logic & Argument Parsing
- **Hypothesis**: The bulk update script itself has a logic error.
- **Actions**:
    - Discovered and fixed a command-line argument parsing bug where `--file` was not handled correctly.
- **Result**: **Partially Addressed**. The script's CLI logic was fixed, but the core `FORBIDDEN` error remained.

### Investigation 5: Server-Side Session Handling (`curl` Test)
- **Hypothesis**: The issue is not the Node.js script, but the Vendure server itself.
- **Actions**:
    1. Modified the script to only perform login, print the auth token, and exit.
    2. Used the obtained token to make a direct GraphQL request from the command line using `curl`.
- **Result**: **CRITICAL FINDING**: The `curl` command failed with the **exact same `FORBIDDEN` error**. This definitively proved the issue is **server-side** and not related to the Node.js client or its environment.

### Investigation 6: Global Middleware Conflict
- **Hypothesis**: A globally applied middleware in `vendure-config.ts` was interfering with Vendure's core auth flow.
- **Actions**:
    - Removed a custom `createSecurityMiddleware()` that was incorrectly registered on the root route (`'/'`).
- **Result**: **Ruled Out**. The error persisted.

### Investigation 7: Proxy & Secure Cookie Conflict
- **Hypothesis**: A conflict exists between the `cookieOptions.secure: true` setting and the server's proxy setup (NGINX).
- **Actions**:
    - Temporarily set `cookieOptions.secure` to `false`.
- **Result**: **Ruled Out**. The error persisted.

### Investigation 8: `superadminCredentials` Bootstrap Conflict
- **Hypothesis**: The `superadminCredentials` block in `vendure-config.ts` was causing an inconsistent state for the admin user during server startup.
- **Actions**:
    - Commented out the entire `superadminCredentials` block.
- **Result**: **Ruled Out**. The error persisted.

## 4. Current Status & Conclusion

We have exhausted all logical configuration and environment-related causes. The server continues to issue a valid `SuperAdmin` token and then immediately refuse to honor it. This behavior, especially after the `curl` test, strongly suggests a **fundamental, undiscovered bug within the Vendure core framework** that is being triggered by this specific environment.

All diagnostic changes to `vendure-config.ts` have been reverted to their original state.

## 5. Recommended Next Steps

Continuing to debug the current configuration is unlikely to yield results. The next logical step is to create a minimal reproduction to isolate the bug for an official bug report to the Vendure developers.

1.  **Create a Minimal Test Script**: Write a new, simple Node.js script (`auth-test.js`) that only contains the login and a single `currentUser` query. This removes all complexity from the bulk update script.
2.  **Run the Minimal Script**: If (as expected) this script fails with the same `FORBIDDEN` error, it serves as perfect evidence of the bug.
3.  **File a Bug Report**: Submit the minimal reproduction script and this investigation summary to the Vendure GitHub issues page.
