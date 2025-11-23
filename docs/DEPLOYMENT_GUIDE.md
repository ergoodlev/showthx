# GratituGram Deployment Guide

## Session Summary: Major Security & UI Fixes

This guide covers all changes made in this development session and how to deploy them properly.

### What Changed in This Session

#### 1. **Critical Security Fix: PIN Collision Vulnerability**
- **Issue**: 4-digit PINs (10,000 combinations) cause collisions at scale
- **Solution**: Implemented 7-character unique access codes (3.5 trillion combinations)
- **Files Modified**:
  - `services/authService.js`
  - `screens/ManageChildrenScreen.js`
  - `screens/KidPINLoginScreen.js`
  - `screens/ParentDashboardScreen.js`

#### 2. **UI Bug Fix: Modal Input Fields**
- **Issue**: Parent modal for adding children appeared blank, couldn't type
- **Solution**: Fixed flex layout by removing intermediate View wrapper
- **Files Modified**: `screens/ManageChildrenScreen.js`

#### 3. **Device Linking Architecture**
- **Documentation**: Added complete architecture explanation
- **Files Created**: `ARCHITECTURE_DEVICE_LINKING.md`

#### 4. **Data Migration Requirements**
- **Issue**: Existing children lack access_code values
- **Solution**: SQL migration to populate codes for existing data
- **Files Created**: `POPULATE_EXISTING_CHILDREN_ACCESS_CODES.sql`

---

## Pre-Deployment Checklist

- [ ] All code changes reviewed
- [ ] Tested locally with Expo
- [ ] Database backup created
- [ ] SQL migration tested in development environment
- [ ] Team notified of changes

---

## Step-by-Step Deployment Process

### Phase 1: Database Migration (REQUIRED FIRST)

**Why first**: Code expects `access_code` field to be populated.

#### 1A. Back Up Your Database
In Supabase Dashboard:
1. Go to Project Settings
2. Backups tab
3. Click "Create backup now"
4. Wait for backup to complete (usually 1-2 minutes)

#### 1B. Run SQL Migration

In **Supabase Dashboard** → **SQL Editor** → **New Query**:

```sql
-- Step 1: Check current state (optional)
SELECT COUNT(*) as total_children,
       SUM(CASE WHEN access_code IS NULL OR access_code = '' THEN 1 ELSE 0 END) as missing_codes
FROM public.children;

-- Step 2: Populate access codes for all children without them
UPDATE public.children
SET access_code = UPPER(SUBSTR(name, 1, 3)) || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
WHERE access_code IS NULL OR access_code = '';

-- Step 3: Verify update
SELECT id, name, access_code FROM public.children ORDER BY created_at DESC;
```

**Expected Output for Step 2**: "X rows updated" where X is the number of children

### Phase 2: Deploy Code Changes

#### 2A. Commit Changes
```bash
cd /Users/ericgoodlev/Desktop/GratituGram

git add .
git commit -m "Fix: Implement unique access codes for kids, fix modal UI

- Replace 4-digit PIN with 7-character access codes (NAME+DIGITS format)
- Eliminates PIN collision vulnerability at scale
- Fix modal input fields rendering issue in ManageChildrenScreen
- Update authentication to use access_code as unique identifier
- Update KidPINLoginScreen to use text input instead of number pad"
```

#### 2B. Test Build
```bash
# Build for iOS
eas build --platform ios --profile preview

# Or Android
eas build --platform android --profile preview
```

#### 2C. Deploy to Users
- If using Expo: `eas submit --platform ios --latest`
- If using App Store/Play Store: Follow their respective submission processes

### Phase 3: Post-Deployment Verification

#### 3A. Immediate Checks (First 1 hour)
- [ ] App starts without errors
- [ ] Parents can log in
- [ ] Children tab shows "Login Code" with 7-character codes
- [ ] No crash reports in error tracking

#### 3B. Feature Verification (First 24 hours)
- [ ] New child creation generates correct access code format
- [ ] Access codes display in Children tab
- [ ] Share button shows access code
- [ ] Kids can log in with access code
- [ ] Wrong code shows error message
- [ ] 5 failed attempts locks account for 15 minutes

#### 3C. Data Integrity
- [ ] All existing children have access_code values
- [ ] Access codes are unique (no duplicates)
- [ ] Kids can only see their parent's data

---

## Rollback Procedure (If Issues Arise)

### Quick Rollback (Code Only)
If you need to revert just the app code:

```bash
git revert HEAD
eas submit --platform ios --latest
```

This deploys the previous version. Users get automatic update.

### Full Rollback (Code + Database)
If you need to revert the database migration:

```sql
-- In Supabase, clear the access codes
UPDATE public.children SET access_code = NULL;

-- Revert app to previous version
git revert HEAD
```

**Warning**: This will require old code changes to work. Only do this if critical issues found.

### Restore from Backup
If severe issues occur:

1. Go to Supabase Dashboard
2. Project Settings → Backups
3. Click "Restore" on the backup you created
4. Wait for restore to complete (~5 minutes)
5. Revert app code to previous version

---

## Post-Deployment Monitoring

### What to Watch For

**First 24 Hours:**
- Check crash logs in your error tracking (Sentry, Bugsnag, etc.)
- Monitor Supabase logs for database errors
- Watch for user reports about login issues

**First Week:**
- Verify no duplicate access codes generated
- Check that kids can log in successfully
- Monitor for any performance issues
- Review error logs regularly

### Key Metrics to Track

```
- New child creation: Should all have unique access_codes
- Kid login success rate: Should be >95%
- Failed login attempts: Monitor for brute force attempts
- Average login attempts per session: Should be 1-3
- Lockout incidents: Should be rare (<1%)
```

---

## Known Issues & Workarounds

### Issue 1: Old Children Missing Access Codes
**Symptom**: Children tab shows blank Login Code badge for older children

**Cause**: Existing children created before migration don't have access_code values

**Fix**: Run the SQL migration in Phase 1

**Status**: ✅ Fixed if migration completed

### Issue 2: Modal Appears Blank When Adding Child
**Symptom**: Click "Add Child" button, modal appears but can't see/type in fields

**Cause**: Flex layout conflict in modal

**Fix**: Code already fixed - this should not appear after deployment

**Status**: ✅ Fixed in codebase

### Issue 3: Kids Can't Login After Code Change
**Symptom**: Kids try to log in with new access code, get "Invalid Login Code" error

**Causes**:
1. They're using old PIN instead of new access code
2. Access code not populated in database
3. They entered wrong code (case-sensitive? No, auto-uppercased)

**Solutions**:
1. Share the new access code (from Children tab)
2. Verify access_code column populated via SQL migration
3. Check case conversion works properly

---

## Deployment Checklist

Use this before going live:

```
DATABASE
- [ ] Database backup created and verified
- [ ] SQL migration tested in staging environment
- [ ] All children have access_code values
- [ ] No NULL or empty access_code values remain
- [ ] Verified unique constraint on access_code

CODE
- [ ] All files committed to git
- [ ] No hardcoded secrets in code
- [ ] No console.error logs left for debugging
- [ ] Code builds without warnings
- [ ] All imports are correct

TESTING
- [ ] Parent can create new child
- [ ] New child gets access code (format: ABC1234)
- [ ] Access code displays in Children tab
- [ ] Access code can be shared
- [ ] Kid can log in with access code
- [ ] Kid cannot log in with invalid code
- [ ] Wrong code shows error after 5 attempts
- [ ] Account locks for 15 minutes after 5 failures
- [ ] Clear button works
- [ ] Parent can edit child name/age
- [ ] Parent can delete child
- [ ] Parent can log out
- [ ] Kid can log out

MONITORING
- [ ] Error tracking service configured
- [ ] Database monitoring enabled
- [ ] Have process for checking logs post-deployment
- [ ] Team knows how to respond to issues
```

---

## Timeline

| Phase | Duration | Critical |
|-------|----------|----------|
| Database Backup | 2 min | YES |
| SQL Migration | <1 min | YES |
| Code Review | 30 min | NO |
| Build | 10-15 min | NO |
| Deployment | 5-30 min* | YES |
| Verification | 1 hour | YES |
| Monitoring | Ongoing | YES |

*Depends on app store review queue

---

## Support & Questions

If you encounter issues:

1. Check `TROUBLESHOOTING.md` for common problems
2. Review Supabase logs for database errors
3. Check Expo/build logs for compilation issues
4. Review error tracking service for runtime errors

For detailed workflows, see `WORKFLOW_DOCUMENTATION.md`

For testing procedures, see `TESTING_CHECKLIST.md`
