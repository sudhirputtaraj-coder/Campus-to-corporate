> **Student onboarding update:** After migration 036, college administrators can add students and manage access from **Students & Access**. Students verify their email and choose their own password at `/join`. See [the student access guide](COLLEGE_STUDENT_ACCESS.md). The Super Admin workflow below remains available for initial college administrator setup and reviewed account linking.

# College account setup

Apply migration 013_college_account_setup.sql in Supabase SQL Editor after 012.
It adds a restricted function, not a new table. Only an active Super Admin can
call it; profile, college assignment and audit entry are saved in one transaction.

1. Add the college through Manage Colleges and set its status to Active.
2. Have the person register and confirm their email. They keep their own password.
3. In Manage Users, find the account, open it and choose Set up college access.
4. Select College student or College administrator and the active college.
   A college student also needs a register number unique within the college.
5. Review the confirmation, save, and have the person sign out and use the matching
   College student or College administrator option on the sign-in page.

This is an onboarding workflow. It does not grant Super Admin or Trainer access,
send invitations, enrol students in courses, assign departments/batches, or transfer
existing college accounts between tenants. Independent students with purchases,
enrolments or assessment attempts require a separate transfer review. Their records
are not moved by this workflow. A new college administrator's unused independent
student profile is retained but deactivated. Existing Super Admins are protected.

Validation: TypeScript and tests/payment-database.cjs, including authorization,
atomic rollback, duplicate register numbers, confirmation, repeat submissions,
protected account history and cross-college isolation. Hosted migration application
and a real sign-in under the new role remain manual acceptance checks.
