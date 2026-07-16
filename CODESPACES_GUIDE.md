# GitHub Codespaces Guide - Step by Step

## What is GitHub Codespaces?

GitHub Codespaces is a **cloud-based code editor** that runs in your web browser. You don't need to install anything - everything happens online!

Think of it like:
- Google Docs, but for code
- Edit files directly on GitHub
- Changes sync automatically

---

## Step 1: Open GitHub Codespaces

### Instructions:

1. **Go to GitHub**
   - Open: https://github.com/MostafaLotfy91/education-hub

2. **Click the Green "Code" Button**
   - Look for the green button at the top right of the page
   - It says "Code" with a download icon

3. **Click "Codespaces" Tab**
   - You'll see three tabs: Local, HTTPS, SSH
   - Click the "Codespaces" tab (if you don't see it, scroll right)

4. **Click "Create codespace on main"**
   - A new button will appear
   - Click it to create your Codespace
   - Wait 30-60 seconds for it to load

5. **You're In!**
   - You'll see VS Code (code editor) open in your browser
   - On the left: File explorer
   - In the middle: Code editor
   - At the bottom: Terminal

---

## Step 2: Find the Files to Edit

### The Files You Need to Edit:

#### **File 1: Course Detail Page** (ALREADY EDITED ✅)
```
src/routes/course.$courseId.tsx
```

**What changed:**
- Line 24: Query updated to use explicit FK syntax
- Line 94: Template updated to use `instructor` instead of `profiles`

**Status:** ✅ Already done - you can view it

---

#### **File 2: Migration File** (NEW FILE ✅)
```
supabase/migrations/20260716065049_211ed782-7110-441c-8804-1f54dd8ef319.sql
```

**What it does:**
- Fixes the foreign key relationship
- Drops old FK pointing to auth.users(id)
- Adds new FK pointing to profiles(id)

**Status:** ✅ Already created - you can view it

---

#### **File 3: Documentation** (NEW FILE ✅)
```
SUPABASE_FK_FIX.md
```

**What it contains:**
- Problem explanation
- Solution details
- Testing instructions
- Deployment steps

**Status:** ✅ Already created - you can view it

---

## Step 3: View the Files in Codespaces

### How to Find Files:

1. **Look at the Left Panel** (File Explorer)
   - You'll see a folder tree
   - Folders have `>` arrows to expand

2. **Navigate to Each File:**

   **To view File 1 (Course Detail Page):**
   ```
   src/
     └─ routes/
        └─ course.$courseId.tsx
   ```
   - Click on `src` folder to expand
   - Click on `routes` folder to expand
   - Click on `course.$courseId.tsx` to open

   **To view File 2 (Migration):**
   ```
   supabase/
     └─ migrations/
        └─ 20260716065049_211ed782-7110-441c-8804-1f54dd8ef319.sql
   ```
   - Click on `supabase` folder to expand
   - Click on `migrations` folder to expand
   - Click on the `.sql` file to open

   **To view File 3 (Documentation):**
   ```
   SUPABASE_FK_FIX.md
   ```
   - Scroll to the top of the file list
   - Click on `SUPABASE_FK_FIX.md`

---

## Step 4: Review the Changes

### File 1: course.$courseId.tsx

**Find this line (around line 24):**
```typescript
// BEFORE (old code - with error)
.select("*, profiles:instructor_id(full_name)")

// AFTER (new code - fixed)
.select("*, instructor:profiles!courses_instructor_id_fkey(full_name)")
```

**Find this line (around line 94):**
```typescript
// BEFORE
{(course as any).profiles?.full_name ?? "Instructor"}

// AFTER
{(course as any).instructor?.full_name ?? "Instructor"}
```

### File 2: Migration SQL

**The migration does:**
```sql
-- Step 1: Remove old foreign key
ALTER TABLE public.courses
DROP CONSTRAINT courses_instructor_id_fkey;

-- Step 2: Add new foreign key pointing to profiles
ALTER TABLE public.courses
ADD CONSTRAINT courses_instructor_id_fkey
FOREIGN KEY (instructor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
```

### File 3: Documentation

**Contains:**
- Problem analysis
- Solution explanation
- Testing procedures
- Deployment instructions

---

## Step 5: Commit and Push Changes

### In Codespaces:

1. **Click the Source Control Icon**
   - Left sidebar has icons
   - Click the icon that looks like a **branch** (3 circles connected)
   - It's usually the 3rd icon from the top

2. **You'll See Your Changes**
   - All modified files are listed
   - Files show with a dot or "M" indicator

3. **Type a Commit Message**
   - Find the text box that says "Message"
   - Type: `fix: resolve Supabase FK relationship error on course detail page`

4. **Commit the Changes**
   - Click the **checkmark icon** (✓) or "Commit" button
   - Changes are now committed

5. **Push to GitHub**
   - Look for "Sync Changes" button
   - Or click the "..." menu and select "Push"
   - Your changes go to GitHub!

---

## Visual Guide: What You'll See

```
┌─────────────────────────────────────────────────────────┐
│  GitHub Codespaces Interface                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  LEFT PANEL          │  MIDDLE PANEL      │  RIGHT     │
│  (File Explorer)     │  (Code Editor)     │  (Preview) │
│                      │                    │            │
│  📁 src              │  course.$courseId  │            │
│  📁 supabase         │  .tsx              │            │
│  📄 SUPABASE_FK_FIX  │                    │            │
│  📄 GIT_GUIDE        │  Line 24:          │            │
│  📄 CODESPACES_GUIDE │  .select("*,       │            │
│                      │  instructor:       │            │
│                      │  profiles!courses_ │            │
│                      │  instructor_id_fk  │            │
│                      │  ey(full_name)")   │            │
│                      │                    │            │
│                      │                    │            │
│  BOTTOM PANEL: Terminal (for commands)                 │
└─────────────────────────────────────────────────────────┘
```

---

## Step 6: Verify on GitHub

After pushing:

1. **Go to GitHub**
   - https://github.com/MostafaLotfy91/education-hub

2. **Check the Commit**
   - Click on "Code" tab
   - You should see your commit message
   - Click on it to see the changes

3. **Verify the Files**
   - Navigate to each file
   - Confirm the changes are there

---

## Important Notes

### ✅ What's Already Done:
- All 3 files are already created/modified
- Changes are already committed locally
- You just need to push them

### ⚠️ Don't Delete or Modify:
- Don't delete any of the 3 files
- Don't change the migration SQL
- Don't change the query syntax

### ✅ Safe to Do:
- View all files
- Read the documentation
- Review the changes
- Commit and push

---

## Troubleshooting

### "I can't find the files"
- Make sure you're in the right folder
- Use Ctrl+P (or Cmd+P on Mac) to search for files
- Type the filename to find it quickly

### "The Codespace is loading slowly"
- Wait a minute or two
- Refresh the page if needed
- Close and reopen if it's stuck

### "I accidentally deleted something"
- Don't worry! Click "Undo" (Ctrl+Z)
- Or close without saving and reopen

### "I can't find the Source Control icon"
- Look at the left sidebar
- It's the icon that looks like a **branch** (3 circles)
- If you can't find it, press Ctrl+Shift+G (or Cmd+Shift+G on Mac)

---

## Summary

1. ✅ Go to GitHub
2. ✅ Click "Code" → "Codespaces" → "Create codespace on main"
3. ✅ Wait for it to load
4. ✅ Review the 3 files in the file explorer
5. ✅ Click Source Control icon
6. ✅ Type commit message
7. ✅ Click checkmark to commit
8. ✅ Click "Sync Changes" to push
9. ✅ Done! Your changes are on GitHub 🎉

---

## Next Steps After Pushing

Once your changes are on GitHub:

1. **Deploy to Supabase**
   ```bash
   supabase db push
   ```

2. **Test the Course Detail Page**
   - Navigate to `/course/$courseId`
   - Verify instructor name displays
   - Check browser console for errors

3. **Verify All Queries Work**
   - Homepage loads ✓
   - Catalog displays courses ✓
   - Course detail shows instructor ✓

---

## Questions?

If you get stuck at any point, let me know:
- Which step you're on
- What error you see
- A screenshot if possible

I'm here to help! 🚀
