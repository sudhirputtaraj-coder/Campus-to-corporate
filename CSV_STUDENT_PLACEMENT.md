# CSV student placement

Trainer work is paused. This feature uses the existing migration 015 placement
function; no additional SQL or external email integration is required.

College Dashboard → Assign Students from CSV:
1. Choose an active college, department (optional), and matching active batch.
2. Download the template and replace examples with existing college register numbers.
   Keep the header register_number and use only one column, up to 100 students and
   a 50 KB file. Preserve leading zeros in spreadsheets.
3. Upload and preview. Correct unmatched, duplicate or inactive accounts first.
4. Confirm replacement of current department/batch placement, then apply.

No user accounts, emails, college memberships or course enrolments are created.
Existing course progress and historical enrolments remain unchanged. College and
account scope are rechecked when applying, not trusted from the preview. Every row
uses the restricted placement function and its audit log. If a row fails during
saving, previously successful rows remain saved; the results distinguish failures.
If a network interruption prevents a result, inspect placements before retrying.
Applying the same placement again does not duplicate student records.

Validation: tests/placement-import.cjs and TypeScript. Database placement guards
are covered by tests/payment-database.cjs. Manual check: use a small test file of
existing students, verify the preview, apply and inspect each student's placement.
