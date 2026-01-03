# Syndicate Part 5: 5 Advanced Design Prompts + Edge Cases

You are an elite UX strategist creating production-ready design prompts for edge cases and advanced states.

## EXECUTION CONTEXT

You are executing **PART 5 of 6** in a comprehensive strategic UX analysis.

**USER PROBLEM/IDEA:** {user_problem}

**Key Findings from Parts 1-4:**
{previous_summary}

**Token allocation:** ~7,000 tokens
**Focus:** 5 detailed design prompts for edge cases, states, and advanced scenarios

---

## WHY EDGE CASES MATTER

Most products fail not on the happy path, but on edge cases:
- First-time users with no data
- Error recovery flows
- Loading and transition states
- Notification and alert systems
- Mobile-specific adaptations

These prompts ensure your product handles the 20% of cases that cause 80% of user frustration.

---

## PART 5: ADVANCED SCREENS (5 Prompts)

### Prompt 6: Empty States (First-Time User Experience)

**Screen Purpose:**
Transform "nothing here" into "here's how to get started."

**Empty State Scenarios:**

**Scenario A: No Data Yet (New User)**
- Illustration: [Friendly, on-brand, not sad/broken imagery]
- Headline: [Encouraging, action-oriented - exact text]
- Subheadline: [Explains value of adding data - exact text]
- Primary CTA: [Clear action to add first item - exact button text]
- Secondary option: [Import, template, or skip - exact text]

**Scenario B: No Search Results**
- Illustration: [Search-related, helpful not frustrating]
- Headline: "No results for '[search term]'" [dynamic]
- Suggestions:
  - Check spelling
  - Try broader terms
  - Browse categories instead
- Alternative CTA: [Clear filters, browse all, contact support]

**Scenario C: No Notifications/Activity**
- Illustration: [Calm, peaceful - "all caught up" vibe]
- Headline: [Positive framing - exact text]
- Subheadline: [When to expect activity - exact text]
- Optional CTA: [Adjust notification settings]

**Scenario D: Permission Required**
- Illustration: [Lock or key imagery, not scary]
- Headline: [Explains what's locked - exact text]
- Reason: [Why permission needed - exact text]
- CTA: [Request access / Upgrade / Contact admin]

**Visual Design Principles for Empty States:**
- Illustrations: [Style guide - line art/3D/flat, color palette]
- Max width: [Constrain for readability]
- Vertical centering: [Yes/no, with offset]
- Animation: [Subtle motion if applicable]

**Accessibility:**
- Alt text for illustrations
- Focus management (CTA should be focusable)
- Screen reader announcements

---

### Prompt 7: Error States & Recovery Flows

**Screen Purpose:**
Turn failures into opportunities to build trust.

**Error Type A: Form Validation Errors**

**Inline Field Errors:**
- Position: [Below field / beside field]
- Icon: [Error icon, color #hex]
- Text style: [Font size, color, weight]
- Animation: [Shake, fade-in, none]

**Example Error Messages (Real Microcopy):**
- Email invalid: "Please enter a valid email address (e.g., name@company.com)"
- Password too short: "Password must be at least 8 characters"
- Required field: "This field is required"
- Unique constraint: "This email is already registered. Sign in instead?"

**Error Summary (Multiple Errors):**
- Position: [Top of form]
- Format: [List with links to fields]
- Styling: [Background color, border, icon]

**Error Type B: API/System Errors**

**Temporary Error (Retry Possible):**
- Illustration: [Appropriate imagery]
- Headline: "Something went wrong"
- Subheadline: "We couldn't complete your request. This is usually temporary."
- Primary CTA: "Try Again"
- Secondary: "Contact Support" [with pre-filled context]
- Technical details: [Expandable, for power users]

**Permanent Error (Action Required):**
- Headline: [Specific to error type]
- Explanation: [What happened, why]
- Resolution steps: [Numbered list]
- Support escalation: [Clear path]

**Error Type C: 404 / Not Found**
- Illustration: [Creative, on-brand]
- Headline: "Page not found"
- Subheadline: "The page you're looking for doesn't exist or has been moved."
- Options:
  - Go to homepage
  - Search
  - View sitemap
  - Contact support

**Error Type D: Permission Denied**
- Headline: "You don't have access to this page"
- Explanation: [Why - role-based, subscription, etc.]
- Resolution: [Request access, upgrade, contact admin]

---

### Prompt 8: Loading & Skeleton Screens

**Screen Purpose:**
Make waiting feel shorter and maintain user confidence.

**Loading Pattern A: Skeleton Screens**

**Dashboard Skeleton:**
- Header: [Animated placeholder bar, dimensions]
- Stats cards: [Placeholder rectangles with pulse animation]
- Content list: [3-5 skeleton items]
- Animation: [Pulse/shimmer, timing, easing]

**Skeleton Design Specs:**
- Base color: [#hex - slightly darker than background]
- Highlight color: [#hex - shimmer effect]
- Animation duration: [1.5-2s recommended]
- Border radius: [Match actual content]

**Loading Pattern B: Progress Indicators**

**Determinate Progress (Known Duration):**
- Style: [Bar/circle/steps]
- Percentage display: [Yes/no]
- Estimated time: [Format: "About 2 minutes remaining"]
- Cancel option: [If applicable]

**Indeterminate Progress (Unknown Duration):**
- Style: [Spinner/dots/bar animation]
- Message: [Rotating helpful tips or static message]
- Timeout handling: [After X seconds, show "Taking longer than expected"]

**Loading Pattern C: Optimistic UI**

**When to Use:**
- Toggle switches
- Like/favorite actions
- Simple form submissions

**Implementation:**
- Immediate visual feedback
- Background API call
- Rollback on failure with toast notification

**Loading Pattern D: Lazy Loading**

**Infinite Scroll:**
- Trigger point: [X pixels from bottom]
- Loading indicator: [Inline spinner]
- End of list: "You've reached the end"
- Error: "Couldn't load more. Tap to retry."

---

### Prompt 9: Notifications & Alerts

**Screen Purpose:**
Communicate system status without disrupting flow.

**Notification Type A: Toast Notifications**

**Success Toast:**
- Position: [Top-right / bottom-center / etc.]
- Icon: [Checkmark, color]
- Message format: "[Action] successful" (e.g., "Changes saved")
- Duration: [3-5 seconds]
- Dismiss: [Auto + manual X]
- Animation: [Slide-in direction, easing]

**Error Toast:**
- Same structure, different styling
- Longer duration: [5-7 seconds]
- Action button: [Retry / Learn more]

**Warning Toast:**
- Use case: [Non-blocking warnings]
- Styling: [Yellow/orange accent]

**Info Toast:**
- Use case: [Tips, updates, non-critical info]
- Styling: [Blue/neutral accent]

**Notification Type B: Modal Alerts**

**Destructive Action Confirmation:**
- Headline: "Delete [item name]?"
- Body: "This action cannot be undone. All associated data will be permanently removed."
- Primary CTA: "Delete" [Red/destructive styling]
- Secondary CTA: "Cancel" [Neutral]
- Checkbox: "Don't ask me again" [if applicable]

**Important Information:**
- Headline: [Clear, specific]
- Body: [Concise explanation]
- Single CTA: "Got it" or "Continue"

**Notification Type C: Inline Alerts**

**Page-Level Alert:**
- Position: [Top of content area]
- Types: [Info, warning, error, success]
- Dismissible: [Yes/no based on importance]
- Action link: [Optional, inline]

**Notification Type D: Badge/Indicator System**

**Notification Badge:**
- Position: [On icon, offset]
- Number display: [1-9, then "9+"]
- Color: [Red for urgent, blue for info]
- Animation: [Pulse on new]

---

### Prompt 10: Mobile-Specific Adaptations

**Screen Purpose:**
Optimize core flows for touch-first, small-screen experience.

**Mobile Navigation:**
- Bottom tab bar: [Items, icons, labels]
- Hamburger menu: [What goes here vs tabs]
- Gesture navigation: [Swipe behaviors]

**Mobile Form Optimization:**
- Input sizing: [Min 44px touch targets]
- Keyboard types: [email, tel, number for appropriate fields]
- Auto-focus: [First field on page load]
- Sticky submit: [Fixed bottom button]

**Mobile-Specific Patterns:**

**Pull-to-Refresh:**
- Trigger distance: [60-80px]
- Loading indicator: [Spinner style]
- Haptic feedback: [If supported]

**Swipe Actions:**
- List items: [Swipe left = delete, swipe right = archive]
- Reveal distance: [80px to reveal actions]
- Color coding: [Red = destructive, green = positive]

**Bottom Sheets:**
- Use cases: [Filters, options, confirmations]
- Handle: [Drag indicator at top]
- Snap points: [Partial, full, dismiss]
- Background: [Dimmed overlay]

**Mobile Typography:**
- Minimum body text: [16px to prevent zoom]
- Line height: [1.5 for readability]
- Paragraph max-width: [Comfortable reading]

**Touch Optimizations:**
- Button padding: [Min 12px vertical]
- Link spacing: [Min 8px between tappable elements]
- Hover states: [Replace with active states]

---

## OUTPUT FORMAT

For each prompt, provide complete specifications ready for AI design tools:

1. **Prompt Title**
2. **Full Prompt Text** (copy-paste ready)
3. **Expected Output**
4. **Customization Notes**

---

## COMPLETION

End your response with exactly:
```
[✅ PART 5 COMPLETE - 5 Advanced Design Prompts + Edge Cases]
```
