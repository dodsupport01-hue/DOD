# Team Member Section Dropdown - Troubleshooting Guide

## Issue: Section Dropdown Not Showing Selected After Save

If the section dropdown appears empty even after saving, here's what to check:

---

## Debugging Steps

### Step 1: Check Browser Console
1. Open Admin Panel
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. Add a new team member and check for these logs:
   - `"Saving team member: { name, designation, section, email }"`
   - `"Creating new team member"` or `"Updating team member ID: ..."`

**Expected Output:**
```
Saving team member: {name: "Dr. John Doe", designation: "CMO", section: "leadership", email: "john@example.com"}
Creating new team member
```

If section is missing or shows `section: ""`, the dropdown wasn't properly selected.

---

### Step 2: Verify Backend API Response
After adding a team member:

1. Open **Network Tab** in Developer Tools
2. Look for the POST request to `/api/team` or PUT request to `/api/team/:id`
3. Click on the request and check the **Response**
4. The response should include:
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Dr. John Doe",
    "designation": "Chief Medical Officer",
    "section": "leadership",
    "email": "john@example.com",
    "order": 0,
    "isActive": true
  }
}
```

**If section is missing in response**, your backend API is not saving the section field.

---

### Step 3: Check Database Directly
If you have database access, verify the team collection:

```javascript
// MongoDB example
db.teams.findOne({ name: "Dr. John Doe" })

// Should show:
{
  _id: ObjectId("..."),
  name: "Dr. John Doe",
  designation: "Chief Medical Officer",
  section: "leadership",  // <-- This should be present
  email: "john@example.com",
  imageUrl: "...",
  description: "...",
  order: 0,
  isActive: true,
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

If `section` field is missing, the backend isn't storing it.

---

## Common Causes & Fixes

### ❌ Issue 1: Form-Data Not Being Sent
**Symptom:** Console shows section value but API doesn't receive it

**Check:** Open Network tab and inspect POST body
- Should contain: `section=leadership` (or whichever was selected)

**Fix if missing:**
- Make sure `fd.append('section', section);` is in the code (✅ already fixed)

---

### ❌ Issue 2: Backend API Not Accepting Section Field
**Symptom:** API returns 400 error or ignores section

**Fix needed on Backend:**
Make sure your backend endpoint accepts and saves the section field:

```javascript
// Backend API example (Node.js/Express)
router.post('/team', async (req, res) => {
  const { name, designation, section, email, description, order, isActive } = req.body;
  
  // section MUST be in the destructure
  const team = new Team({
    name,
    designation,
    section,  // <-- Make sure this is included
    email,
    description,
    order,
    isActive
  });
  
  await team.save();
  res.json({ success: true, data: team });
});

// And for PUT:
router.put('/team/:id', async (req, res) => {
  const { name, designation, section, email, description, order, isActive } = req.body;
  
  const team = await Team.findByIdAndUpdate(req.params.id, {
    name,
    designation,
    section,  // <-- Make sure this is included
    email,
    description,
    order,
    isActive
  }, { new: true });
  
  res.json({ success: true, data: team });
});
```

---

### ❌ Issue 3: Database Schema Missing Section Field
**Symptom:** API saves but section doesn't appear in database

**Fix needed on Backend:**
Add section to your Team schema:

```javascript
// MongoDB Schema example
const teamSchema = new Schema({
  name: { type: String, required: true },
  designation: { type: String, required: true },
  section: { 
    type: String, 
    enum: ['founders', 'leadership', 'advisory', 'board'],
    required: true 
  },
  email: String,
  imageUrl: String,
  description: String,
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

---

### ❌ Issue 4: Dropdown Value Not Setting Correctly
**Symptom:** When editing, dropdown appears empty

**This is now fixed in the admin panel!**

The updated `openTeamModal()` function now properly sets the section dropdown:

```javascript
const sectionSelect = document.getElementById('teamSection');
if (member && member.section) {
  sectionSelect.value = member.section;
} else {
  sectionSelect.value = '';
}
```

---

## What Should Happen (Correct Flow)

1. **Admin adds team member:**
   - Fills all fields including Section dropdown
   - Clicks "Save Member"

2. **Frontend validation:**
   - ✅ Name is required
   - ✅ Designation is required
   - ✅ Section is required (NEW)
   - Email is optional
   - Description is optional

3. **Data sent to API:**
   ```
   name: "Dr. John Doe"
   designation: "Chief Medical Officer"
   section: "leadership"  ← Must be sent
   email: "john@example.com"
   description: "20+ years..."
   order: 0
   isActive: true
   ```

4. **Backend saves to database:**
   - All fields including `section` stored
   - Returns member with all fields

5. **Frontend displays in admin:**
   - Card shows section badge: **LEADERSHIP** (purple)
   - When editing, dropdown shows selected value

6. **Website display:**
   - Member appears in "Our Leadership" section
   - (or Founders/Advisory/Board depending on section value)

---

## Testing Checklist

- [ ] Add new team member with section = "leadership"
- [ ] Check browser console for log messages
- [ ] Check Network tab for API request body (has section)
- [ ] Check API response (has section)
- [ ] Verify section badge shows in admin panel
- [ ] Edit the member and check dropdown is selected
- [ ] Check website - member appears in correct section

---

## Need More Help?

Check these files:
- **Frontend:** `admin/dashboard.html` (lines 1380-1445)
- **Backend:** Your API endpoint for POST/PUT /api/team
- **Database:** Your team collection schema

The frontend is now correct. If section dropdown still doesn't work:
1. **Check backend is saving the section field**
2. **Check database schema includes section field**
3. **Check API returns section in response**

Once backend is fixed, everything will work perfectly! ✅
