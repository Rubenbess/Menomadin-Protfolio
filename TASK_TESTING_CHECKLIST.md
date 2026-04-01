# Task Management System - Testing Checklist

## ✅ Task Creation Testing

### Basic Creation
- [ ] Click "Add task" button
- [ ] Fill in title (required field)
- [ ] Fill in description (optional)
- [ ] Select priority (low/medium/high)
- [ ] Select due date (optional)
- [ ] Select company (optional)
- [ ] Click "Create Task" button
- [ ] Verify task appears in list immediately (without refresh)
- [ ] Verify task has correct title, priority, due date

### Creation Validation
- [ ] Try creating task without title - should show error "Title is required"
- [ ] Fill title, leave description empty - should create successfully
- [ ] Create multiple tasks in sequence - all should appear

## ✅ Task Editing Testing

### Opening Edit Modal
- [ ] Click on a task to open detail modal
- [ ] Click the Edit (pencil) icon in the header
- [ ] TaskEditModal should open with current task values pre-filled
- [ ] All fields should be editable

### Editing Fields
- [ ] **Title**: Change title → Save → Verify in detail modal and list
- [ ] **Description**: Add/change description → Save → Verify displays
- [ ] **Status**: Change status (To do → In progress → Done) → Save → Verify badge updates
- [ ] **Priority**: Change priority (low ↔ medium ↔ high) → Save → Verify badge updates
- [ ] **Due Date**: Set/change due date → Save → Verify date displays correctly
- [ ] **Company**: Select/change company → Save → Verify in linked items section

### Edit Validation
- [ ] Try removing title and saving - should show error "Title is required"
- [ ] Make changes, click Cancel - changes should not be saved
- [ ] Edit modal should close after successful save

### Real-time Updates
- [ ] Change task status in edit → Save → Status badge in detail modal updates
- [ ] Change task title → Save → Title updates in both modal header and list
- [ ] Change due date → Save → Due date displays with correct formatting
- [ ] Edit multiple fields → Save → All changes reflect

## ✅ Task Deletion Testing

- [ ] Click on task to open detail modal
- [ ] Click "Delete" button (in red at bottom)
- [ ] Confirm deletion dialog appears
- [ ] Click confirm → Task should be removed from list immediately
- [ ] Create new task to verify deletion worked (not just filtered)

## ✅ Task Completion Testing

- [ ] Open task detail modal
- [ ] Click "Mark Complete" button
- [ ] Task should be removed from filtered view (if "Include Completed" is toggled off)
- [ ] If "Include Completed" is on, task status should change to "Done"
- [ ] Task should not show "Mark Complete" button anymore

## ✅ Task Cancellation Testing

- [ ] Open task in "To do", "In progress", or "Waiting" status
- [ ] Click "Cancel" button
- [ ] Task status should change to "Cancelled"
- [ ] "Mark Complete" and "Cancel" buttons should hide for cancelled task

## ✅ Assignee Management Testing

- [ ] Open task detail modal
- [ ] Click "+ Add assignee" dropdown
- [ ] Select a team member
- [ ] Assignee should appear in the Assignees list
- [ ] Click X next to assignee to remove
- [ ] Assignee should be removed immediately
- [ ] Assign same task to multiple team members
- [ ] All assignees should display in stack

## ✅ UI/UX Testing

### Detail Modal
- [ ] Modal opens/closes smoothly
- [ ] Scrolling works when content overflows
- [ ] All sections are visible and properly formatted
- [ ] Header shows task title and edit/close buttons

### Edit Modal
- [ ] Edit modal opens from detail modal
- [ ] All form fields are visible and functional
- [ ] Form has proper spacing and styling
- [ ] Error messages display correctly
- [ ] Loading state works during save

### List/Board Display
- [ ] Task cards show key info: title, priority, due date, assignees
- [ ] Color coding for priority works
- [ ] Status badges display correctly
- [ ] Tasks update without page refresh

## ✅ Refresh Button Testing

- [ ] Manually change a task in edit modal
- [ ] Click refresh button (in top right)
- [ ] List should reload from server
- [ ] Task should show updated values

## ✅ Edge Cases

- [ ] Create task with only title
- [ ] Edit task to remove all optional fields
- [ ] Create task, edit it multiple times quickly
- [ ] Edit task with very long title (100+ chars)
- [ ] Edit task with very long description
- [ ] Set due date to today
- [ ] Set due date to past (should show "Overdue")
- [ ] Set due date to future months away

## ✅ Filter Testing

- [ ] After creating task, verify it appears in correct filter
- [ ] Edit task status → verify it moves between filters
- [ ] Edit company → verify company filter shows updated task
- [ ] Edit priority → verify priority filter shows updated task

## ✅ Integration Testing

### Company Linking
- [ ] Create task with company A
- [ ] Go to company A detail page
- [ ] Verify task appears in company's Tasks tab
- [ ] Click task to open detail
- [ ] Verify "Related Items" section shows the company

### Dashboard Integration
- [ ] Create a task due today
- [ ] Go to dashboard
- [ ] Verify task appears in "Due Today" widget
- [ ] Edit task to be due tomorrow
- [ ] Return to dashboard
- [ ] Verify task no longer in "Due Today"

## ✅ Performance Testing

- [ ] Create 20+ tasks
- [ ] Open and edit a task
- [ ] Verify modal opens without delay
- [ ] Save edit should be instant (with 100ms refresh)
- [ ] List updates should be smooth

## Summary

**Total Checks**: 80+

### Must Pass
- Task creation without refresh ✓
- Task editing all fields ✓
- Task deletion ✓
- Status/Priority updates ✓
- Validation errors ✓
- Modal interactions smooth ✓

### Nice to Have
- 20+ tasks performance smooth
- All edge cases handle gracefully
- Mobile responsive

---

## Common Issues to Watch For

1. **Task not appearing after creation** → Check if setTasks was called
2. **Edit modal not opening** → Check if TaskEditModal is imported
3. **Changes not saving** → Check browser console for errors
4. **Old data showing** → May need hard refresh if updateTask fails silently
5. **Assignees not updating** → Separate action, may need to refresh task

