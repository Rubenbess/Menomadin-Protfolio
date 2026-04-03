# Complete Platform Redesign & Feature Implementation Roadmap

## 🎨 Design System: Modern Professional

**Color Palette:** Soft professional blue primary + neutral grays
**Aesthetic:** Clean, sophisticated, data-focused, minimal decoration
**Typography:** System fonts, clear hierarchy
**Spacing:** Generous whitespace, consistent grid
**Shadows:** Subtle, only where needed

---

## 📋 Implementation Phases

### **Phase 15: Design System Foundation** (2-3 days)
- ✅ Design tokens created (`lib/design-tokens.ts`)
- ✅ Tailwind config updated with new colors
- [ ] Update Button component with new palette
- [ ] Update Card component with new design
- [ ] Update Input/Form components
- [ ] Update Modal/Dialog components
- [ ] Update Badge/Status components
- [ ] Dark mode refinement for new colors

### **Phase 16: Apply Design System Across Platform** (2-3 days)
Apply new design to all existing pages:
- [ ] Dashboard page
- [ ] Companies list & detail
- [ ] Contacts list & detail
- [ ] Pipeline page
- [ ] Analytics page
- [ ] Tasks page & related
- [ ] Navigation (header + sidebar)
- [ ] All modals and forms

**Outcome:** Consistent modern professional aesthetic across platform

---

### **Phase 17: Task Collaboration - Comments & Mentions** (2 days)
**Database changes:**
- Enhance `task_comments` table
- Add `mentions` JSONB field for @tagged users

**Components:**
- [ ] `TaskCommentInput.tsx` - Rich comment form with @mention dropdown
- [ ] `TaskCommentCard.tsx` - Display comment with author, timestamp, edit/delete
- [ ] `TaskCommentList.tsx` - Timeline of all comments
- [ ] Mention parser to detect @user patterns

**Features:**
- [ ] Type `@` to see team member suggestions
- [ ] Click to select mentioned user
- [ ] Render mentions as highlighted tags
- [ ] Notify @mentioned users
- [ ] Edit/delete own comments

**Integration:**
- [ ] Update TaskDetailModal to show comments
- [ ] Add comment count badge to task cards

---

### **Phase 18: Task Attachments** (1-2 days)
**Reuse existing:**
- Supabase Storage (already used in document vault)
- File upload patterns

**Components:**
- [ ] `TaskAttachmentUpload.tsx` - Drag-drop file upload
- [ ] `TaskAttachmentList.tsx` - Display attached files
- [ ] File preview for images/PDFs

**Features:**
- [ ] Upload files to task
- [ ] Show file name, size, upload date
- [ ] Download files
- [ ] Delete files (if owner)
- [ ] Preview images inline
- [ ] PDF preview (if possible)

**Integration:**
- [ ] Add attachments section to TaskDetailModal
- [ ] Show attachment count on task cards

---

### **Phase 19: Activity Feed & Audit Visualization** (1-2 days)
**Leverage existing:**
- `task_activities` table already tracks changes
- `logActivity()` server action

**Components:**
- [ ] `TaskActivityFeed.tsx` - Timeline view of all activities
- [ ] `ActivityItem.tsx` - Individual activity card with icons
- [ ] Color-coded by action type (status change, assignment, etc.)

**Features:**
- [ ] Show status changes with old → new value
- [ ] Show who assigned/completed task
- [ ] Show when due date changed
- [ ] Chronological timeline view
- [ ] Filter activities by type

**Integration:**
- [ ] Add Activity tab to TaskDetailModal
- [ ] Show latest 5 activities in task preview cards

---

### **Phase 20: Task Calendar View** (2 days)
**Components:**
- [ ] `TaskCalendar.tsx` - Full calendar grid view
- [ ] `CalendarDay.tsx` - Day cell with task count
- [ ] `CalendarSidebar.tsx` - Month selector, filters

**Features:**
- [ ] Show all tasks due on each date
- [ ] Color-code by priority/status
- [ ] Click date to see tasks that day
- [ ] Drag task to reschedule
- [ ] Month/week view toggle
- [ ] Show overdue tasks in red

**Integration:**
- [ ] Add Calendar view option to Tasks page (toggle with List/Board)
- [ ] Show team member's tasks on calendar
- [ ] Filter calendar by assignee/company

---

### **Phase 21: Task Dependencies & Blocking** (2 days)
**Database changes:**
- Add `depends_on` column to tasks table
- Add `task_dependencies` table for many-to-many

**Components:**
- [ ] `DependencyEditor.tsx` - Add/remove blocking tasks
- [ ] `DependencyGraph.tsx` - Visualize task relationships
- [ ] `BlockedBadge.tsx` - Show "Blocked by Task X"

**Features:**
- [ ] Set task as blocked by another task
- [ ] Visual indicator of blocked tasks
- [ ] Filter "Show only unblocked tasks"
- [ ] Cannot mark task complete if dependencies incomplete
- [ ] Show dependency count on task cards

**Integration:**
- [ ] Add Dependencies section to TaskDetailModal
- [ ] Show blocking tasks with links
- [ ] Warn before completing if other tasks depend on it

---

### **Phase 22: Saved Filters** (1-2 days)
**Database changes:**
- Add `saved_filters` table
- Store filter configuration as JSONB

**Components:**
- [ ] `SaveFilterDialog.tsx` - Save current filter as named filter
- [ ] `SavedFiltersList.tsx` - Show all saved filters
- [ ] Update TasksFilters to show saved filters

**Features:**
- [ ] Click "Save this filter" button
- [ ] Name the filter ("My overdue tasks", "Waiting on legal", etc.)
- [ ] Load saved filter with one click
- [ ] Delete saved filters
- [ ] Share filters with team (future)

**Integration:**
- [ ] Add "Save filter" button to tasks page
- [ ] Show saved filters in sidebar above manual filters
- [ ] Load filter on navigation

---

### **Phase 23: Company Task Integration** (1-2 days)
**Leverage existing:**
- Company detail page already exists
- Companies already linked to tasks

**Components:**
- [ ] `CompanyTasksTab.tsx` - New tab on company detail
- [ ] Show all tasks related to company
- [ ] Filter/sort company tasks

**Features:**
- [ ] New "Tasks" tab on company detail
- [ ] Show count of tasks by status
- [ ] Create new task from company view (pre-fill company_id)
- [ ] Link to task detail modal
- [ ] Show task due dates and assignees

**Integration:**
- [ ] Add Tasks tab to CompanyDetailClient
- [ ] Show task count badge
- [ ] Quick create button for company tasks

---

### **Phase 24: Team Productivity Dashboard** (2-3 days)
**New page:** `/dashboard/team-analytics` or section in main dashboard

**Components:**
- [ ] `TeamMetricsCard.tsx` - Key metrics (tasks completed, avg completion time, etc.)
- [ ] `TeamMemberCard.tsx` - Per-person metrics
- [ ] `CompletionRateChart.tsx` - Burndown-style chart
- [ ] `WorkloadDistribution.tsx` - Who has how many open tasks
- [ ] `OverdueAlerts.tsx` - Show overdue tasks per person

**Features:**
- [ ] Total tasks completed this week/month
- [ ] Completion rate trend
- [ ] Average time to complete task
- [ ] Per-team-member metrics:
  - Tasks completed
  - Current open tasks
  - Overdue count
- [ ] Workload visualization (who's overloaded?)
- [ ] Team velocity chart

**Integration:**
- [ ] Add dashboard widget or new analytics page
- [ ] Filter by date range
- [ ] Export metrics as CSV

---

### **Phase 25: Company Health Score** (2 days)
**Components:**
- [ ] `HealthScoreCard.tsx` - Visual health status (green/yellow/red)
- [ ] `HealthScoreDetailModal.tsx` - Breakdown of scoring factors
- [ ] `HealthScoreTrend.tsx` - Historical health chart

**Algorithm:**
- MOIC score (weighted)
- Task completion rate on company tasks (weighted)
- Recent activity/engagement (weighted)
- Days since last update (risk factor)

**Features:**
- [ ] Color-coded health indicator
- [ ] Show on company list as badge
- [ ] Click for detailed breakdown
- [ ] Alert if health drops below threshold
- [ ] Historical trend chart

**Integration:**
- [ ] Add health score to company cards
- [ ] Add health score filter to company list
- [ ] Show on company detail page
- [ ] Alert on dashboard if any company at risk

---

### **Phase 26: Smart Automations - Advanced Rules** (2-3 days)
**Expand on existing automation system**

**New triggers:**
- [ ] Time-based: "30 days after investment"
- [ ] Condition-based: "If MOIC < 1.5x"
- [ ] Recurring: "First Monday of month"

**New actions:**
- [ ] Create task from template
- [ ] Update task status
- [ ] Send email notification
- [ ] Trigger webhook

**Components:**
- [ ] Update TaskAutomationRuleForm with new options
- [ ] `AutomationScheduleEditor.tsx` - For time-based triggers
- [ ] `AutomationConditionEditor.tsx` - For condition-based triggers

**Features:**
- [ ] Rule execution history/logs
- [ ] Test rule button
- [ ] Dry-run before enabling
- [ ] Rule conflict detection

**Integration:**
- [ ] Add cron job to execute time-based rules
- [ ] Add event listeners for trigger detection
- [ ] Show automation logs in task activities

---

### **Phase 27: Advanced Reporting & Insights** (2-3 days)
**New section:** `/reports/portfolio` or expanded analytics

**Reports:**
- [ ] Portfolio health summary
- [ ] Exit pipeline status
- [ ] At-risk companies list
- [ ] Deployment cash flow
- [ ] Team capacity report
- [ ] Task completion metrics
- [ ] Monthly portfolio summary

**Components:**
- [ ] `ReportCard.tsx` - Individual report widget
- [ ] `ReportViewer.tsx` - Full report view
- [ ] Various charts for each report type

**Features:**
- [ ] Export reports as PDF
- [ ] Email reports on schedule
- [ ] Custom report builder
- [ ] Date range selection
- [ ] Drill-down into details

**Integration:**
- [ ] Add Reports section to main navigation
- [ ] Schedule reports to email stakeholders
- [ ] Dashboard widgets showing key metrics

---

### **Phase 28: Smart Notifications & Alerts** (1-2 days)
**Notification types:**
- [ ] Task due soon (1 day, 3 days, 1 week)
- [ ] Task overdue (daily digest)
- [ ] Task assigned to you
- [ ] Mentioned in comment
- [ ] Company at risk alert
- [ ] Automation rule triggered
- [ ] Team capacity alert

**Components:**
- [ ] Update notification system
- [ ] Notification preferences/settings page
- [ ] Notification digest email

**Features:**
- [ ] In-app notification bell
- [ ] Email notifications (configurable)
- [ ] Daily digest of important items
- [ ] Snooze notifications
- [ ] Mark as read
- [ ] Notification preferences per user type

**Integration:**
- [ ] Add notification bell to header
- [ ] Settings page for notification preferences
- [ ] Email delivery via Supabase functions

---

### **Phase 29: Task Templates Library** (1-2 days)
**Pre-built templates:**
- [ ] Post-investment diligence checklist
- [ ] Series A follow-up cadence
- [ ] Exit preparation tasks
- [ ] Board meeting prep
- [ ] Quarterly investor update
- [ ] Legal review workflow
- [ ] Financial audit tasks

**Components:**
- [ ] `TaskTemplateLibrary.tsx` - Browse templates
- [ ] `TemplatePreview.tsx` - See tasks before creating
- [ ] `CreateFromTemplateModal.tsx` - Create batch of tasks

**Features:**
- [ ] One-click task creation from template
- [ ] Customize tasks before creating
- [ ] Create custom templates
- [ ] Share templates with team
- [ ] Template usage analytics

**Integration:**
- [ ] Add Templates tab to Tasks page
- [ ] Use in automations (create task from template)
- [ ] Quick create button on company/deal pages

---

## 📊 Complete Timeline

| Phase | Feature | Days | Status |
|-------|---------|------|--------|
| 15 | Design System Foundation | 2-3 | Starting... |
| 16 | Apply Across Platform | 2-3 | Pending |
| 17 | Task Comments & Mentions | 2 | Pending |
| 18 | Task Attachments | 1-2 | Pending |
| 19 | Activity Feed | 1-2 | Pending |
| 20 | Calendar View | 2 | Pending |
| 21 | Task Dependencies | 2 | Pending |
| 22 | Saved Filters | 1-2 | Pending |
| 23 | Company Task Integration | 1-2 | Pending |
| 24 | Team Dashboard | 2-3 | Pending |
| 25 | Company Health Score | 2 | Pending |
| 26 | Smart Automations | 2-3 | Pending |
| 27 | Advanced Reports | 2-3 | Pending |
| 28 | Smart Notifications | 1-2 | Pending |
| 29 | Task Templates | 1-2 | Pending |
| | **TOTAL** | **~35-40 days** | |

---

## 🎯 Implementation Strategy

1. **Design Foundation First** (Phase 15-16)
   - All visual work happens now
   - Set aesthetic for entire platform
   - Build design component library

2. **Collaboration Features** (Phase 17-19)
   - Team needs comments, attachments, activity
   - Foundation for multi-user workflows

3. **User Experience** (Phase 20-22)
   - Calendar, dependencies, saved filters
   - Power user features

4. **Integration & Insights** (Phase 23-29)
   - Connect features together
   - Analytics and automation
   - Notifications and reporting

---

## ✅ Success Criteria

- [ ] Modern professional aesthetic across 100% of platform
- [ ] Task collaboration fully functional (comments, mentions, attachments)
- [ ] Team productivity visibility (dashboard, metrics)
- [ ] Automation system advanced and intuitive
- [ ] Zero bugs in critical paths
- [ ] Mobile responsive throughout
- [ ] Performance optimized (no slow loads)
- [ ] User onboarding smooth
