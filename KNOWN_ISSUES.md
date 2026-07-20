# Known Issues - v2.5.0

This document lists known issues, warnings, and technical debt items for the Download Manager v2.5.0 release.

## 📊 Summary

| Category | Count | Severity | Status |
|----------|-------|----------|--------|
| Security Vulnerabilities | 1 | High | Pending |
| ESLint Warnings | 249 | Low | Pending |
| React 19 Deprecations | 32 | Medium | Pending |
| Technical Debt | 5 | Low | Pending |

---

## 🔒 Security Vulnerabilities

### 1. form-data CRLF Injection (High)

**Package**: `form-data` (via `axios`)
**Version**: 4.0.0 - 4.0.5
**CVE**: GHSA-hmw2-7cc7-3qxx
**Impact**: CRLF injection in form-data via unescaped multipart field names and filenames
**Status**: Pending - blocked by `react-window` peer dependency conflict with React 19
**Workaround**: 
- Update `axios` to a version that includes fixed `form-data`
- Currently blocked due to peer dependency conflicts in the dependency tree
- Recommended to fix in next iteration after resolving React 19 compatibility

---

## ⚠️ ESLint Warnings (249 total)

### React 19 Deprecations (32 warnings)

| Warning | Count | Location |
|---------|-------|----------|
| `forwardRef` is deprecated in React 19 | 28 | Various components |
| `useContext` behavior changes | 4 | Context providers |

**Affected files**:
- `src/components/ContextMenu.tsx`
- `src/components/ModalExample.tsx`
- `src/components/SettingsPanel.tsx`
- `src/components/ui/*` (multiple files)

### Other Warnings (217 warnings)

| Type | Count |
|------|-------|
| `no-console` | 45 | Development logging |
| `unused-vars` | 38 | Unused imports/variables |
| `react-hooks/exhaustive-deps` | 22 | Missing dependency array items |
| `@typescript-eslint/no-explicit-any` | 15 | Unsafe type assertions |
| `prettier/prettier` | 97 | Formatting inconsistencies |

---

## 🛠 Technical Debt

### 1. Backend JavaScript to TypeScript Migration

**Description**: Backend is currently written in JavaScript, lacking type safety
**Priority**: Medium
**Recommendation**: Migrate to TypeScript incrementally

### 2. Missing ORM Layer

**Description**: Backend uses raw SQL queries, making maintenance difficult
**Priority**: Medium
**Recommendation**: Consider introducing Prisma or TypeORM

### 3. react-window React 19 Compatibility

**Description**: `react-window@1.8.10` has peer dependency conflict with React 19
**Priority**: High
**Impact**: Blocks dependency updates and security fixes
**Recommendation**: Update to `@react-window/react-window` or find alternative

### 4. Redis Dependency

**Description**: Redis is optional but recommended for production
**Priority**: Low
**Impact**: Without Redis, caching and rate limiting are disabled
**Recommendation**: Document Redis requirements clearly

### 5. Docker Containerization

**Description**: No Docker configuration exists
**Priority**: Medium
**Recommendation**: Add Dockerfile and docker-compose.yml

---

## 📝 Release Notes Note

These issues are documented for transparency. The v2.5.0 release is considered stable for production use, but these items should be addressed in future iterations.

---

**Last Updated**: 2026-07-20  
**Version**: v2.5.0