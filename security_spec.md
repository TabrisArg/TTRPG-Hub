# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every document in `/characters/{characterId}` belongs exclusively to `resource.data.ownerId`. Only the authenticated owner (`request.auth.uid == resource.data.ownerId`) can read (`get`, `list`), update, or delete their character sheet.
2. **Verified Identity**: All writes (`create`, `update`, `delete`) require `request.auth != null && request.auth.token.email_verified == true`.
3. **Immutable Ownership & Creation Time**: During `update`, `ownerId`, `gameSystem`, and `createdAt` must remain strictly equal to `resource.data`.
4. **Temporal Integrity**: On `create`, `createdAt == request.time && updatedAt == request.time`. On `update`, `updatedAt == request.time`.
5. **Volumetric & Key Bounds**: Every string field enforces explicit `.size()` limits matching `firebase-blueprint.json`. No shadow keys are permitted (`hasAll` + `hasOnly` on create, `affectedKeys().hasOnly(...)` on update).

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Create**: `auth == null` attempting to create `/characters/char_1` -> `PERMISSION_DENIED`.
2. **Unverified Email Create**: `auth.token.email_verified == false` attempting to create `/characters/char_1` -> `PERMISSION_DENIED`.
3. **Identity Spoofing on Create**: `auth.uid == "user_a"` creating a character with `ownerId: "user_b"` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Create**: Adding `isAdmin: true` to `/characters/char_1` -> `PERMISSION_DENIED`.
5. **ID Poisoning**: Document ID containing invalid characters or length > 128 -> `PERMISSION_DENIED`.
6. **Client Timestamp Forgery on Create**: `createdAt` not matching `request.time` -> `PERMISSION_DENIED`.
7. **Unauthorized Read (`get`)**: `auth.uid == "user_b"` reading `/characters/char_owned_by_a` -> `PERMISSION_DENIED`.
8. **Blanket List Query**: `auth.uid == "user_b"` listing `/characters` without `where('ownerId', '==', 'user_b')` -> `PERMISSION_DENIED`.
9. **Owner Hijack on Update**: `auth.uid == "user_a"` updating `ownerId` to `"user_b"` -> `PERMISSION_DENIED`.
10. **Immutable `createdAt` Mutation**: `auth.uid == "user_a"` modifying `createdAt` on update -> `PERMISSION_DENIED`.
11. **Value Poisoning on Update**: Updating `fullNameAndAlias` with a boolean or 10KB string -> `PERMISSION_DENIED`.
12. **Unauthorized Delete**: `auth.uid == "user_b"` attempting to delete `/characters/char_owned_by_a` -> `PERMISSION_DENIED`.
