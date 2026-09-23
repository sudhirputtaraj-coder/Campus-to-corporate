# Certificate printing and verification

Apply the complete migration 017_certificate_delivery.sql after 016. It is safe
to rerun. Existing certificates are retained, with recipient/course names filled
from current records at migration time. New certificates snapshot names at issuance.

Students open My Certificates → View / Print → Print / Save as PDF, using the
browser's print dialog to choose Save as PDF. The certificate is available only to
its owner on this page. Already issued certificates remain available after paid
access expires; new issuance still requires valid course access.

New issuance requires at least one active lesson, every active lesson completed,
and a GRADED passed attempt for every active formal assessment. Practice attempts
do not gate issuance. Stored 100% alone is insufficient. Old certificates are not
retroactively revoked. The list's sync process still starts from 100% enrolments.

Public verification defaults to off. The holder can enable it after reading the
disclosure, then share the verification page's URL. Only name, course title,
certificate number and issue date are public. Disabling sharing hides that record
at the same link. The verification page is dynamic and asks search engines not to
index it. Tokens are random UUIDs; anonymous users cannot read the certificate table.
Localhost verification links only work on this development computer. Use the
production site URL when sharing certificates outside local testing.

Automated checks cover eligibility, repeat issuance, ownership, public data
minimisation, frozen titles, sharing off/on/off, and repeat migration. Manual
acceptance: open an eligible certificate, print-preview it, enable verification,
open its link in a signed-out browser, then disable it and reload the link.
