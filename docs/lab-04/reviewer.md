# Lab 4 - Peer Review Record

**Author:** Thu Thu Wai - 67070503486 - GitHub: @thu734

**Peer reviewer:** Sai Bhone Myint Myat - 67070503479 - GitHub: @Kerris812

**Peer reviewer:** Lae Lae Kaung Nyunt - GitHub: @LaeLaeKaungNyunt (student ID not recorded in the available review evidence)

Human review evidence checked on 2026-10-28. An approval in a PR comment is distinguished from a formal GitHub approval. General positive feedback is not recorded as an approval.

## Pull Requests I authored (reviewed by my partner)

| PR | Branch | Reviewer verdict |
| --- | --- | --- |
| [#58](https://github.com/thu734/toktickit/pull/58) | feature/18-lab4-contract-baseline | No human review recorded |
| [#59](https://github.com/thu734/toktickit/pull/59) | feature/19-lab4-actions-data | Approved - formal GitHub review by @LaeLaeKaungNyunt |
| [#60](https://github.com/thu734/toktickit/pull/60) | feature/20-lab4-actions-api | No human review recorded |
| [#61](https://github.com/thu734/toktickit/pull/61) | feature/21-lab4-actions-ui | Approved in a PR comment by @Kerris812 |
| [#62](https://github.com/thu734/toktickit/pull/62) | feature/22-lab4-ticket-workflow | Positive feedback from @Kerris812; no explicit approval |
| [#64](https://github.com/thu734/toktickit/pull/64) | feature/23-lab4-requester-dashboard | No human review recorded |
| [#65](https://github.com/thu734/toktickit/pull/65) | feature/24-lab4-staff-dashboard | Positive feedback and issue-link reminder from @Kerris812; no explicit approval |
| [#66](https://github.com/thu734/toktickit/pull/66) | feature/25-lab4-regression-hardening | No human review recorded |
| [#67](https://github.com/thu734/toktickit/pull/67) | feature/26-lab4-accessibility-responsive | No human review recorded |
| [#68](https://github.com/thu734/toktickit/pull/68) | feature/27-lab4-e2e-artifacts | @Kerris812 reported no blocking issues; no formal GitHub approval |

Reviewer comment I received:

[#59 - @LaeLaeKaungNyunt, formal approval](https://github.com/thu734/toktickit/pull/59#pullrequestreview-5538621726):

> Approved. The changes appear to be within Issue #19's scope

[#61 - @Kerris812](https://github.com/thu734/toktickit/pull/61#issuecomment-6213004626):

> Approved. Reviewed the Issue 21 Actions Taken UI implementation against the Lab 4 requirements and approved specifications.

[#62 - @Kerris812](https://github.com/thu734/toktickit/pull/62#issuecomment-6216444111):

> Nice, the workflow revision check should help prevent conflicting updates.

[#65 - @Kerris812](https://github.com/thu734/toktickit/pull/65#issuecomment-6229793221):

> Looks good! Don't forget to link this PR to Issue #53 in the Development section.

[#68 - @Kerris812](https://github.com/thu734/toktickit/pull/68#issuecomment-6368682265):

> Reviewed the Issue 27 implementation, test results, and submission evidence. No blocking issues identified, good.

How I responded:

[#59](https://github.com/thu734/toktickit/pull/59#issuecomment-6372635267):

> Got it, thanks for the review.

[#61](https://github.com/thu734/toktickit/pull/61#issuecomment-6372654405):

> Got it!

[#62](https://github.com/thu734/toktickit/pull/62#issuecomment-6216480763), responding to the workflow revision comment:

> Thanks! That's the goal.

[#65](https://github.com/thu734/toktickit/pull/65#issuecomment-6372673751):

> Thanks for the reminder.

[#68](https://github.com/thu734/toktickit/pull/68#issuecomment-6372705708):

> Great, i will move forward to next step then.

## Pull Requests I reviewed for my partner

**My comment:**

[Kerris812/toktickit #51 - Actions Taken](https://github.com/Kerris812/toktickit/pull/51#issuecomment-6360034533):

> The Actions Taken implementation follows the engineering contract and integrates with the existing Ticket Detail workflow. The separation between Ticket Owner, action performer, and action assignee is appropriate.

[Kerris812/toktickit #52 - Ticket lifecycle](https://github.com/Kerris812/toktickit/pull/52#issuecomment-6360783145):

> The Ticket lifecycle changes address the required status transitions and resolution workflow.
> Pls make sure backend validation is there to prevent invalid transitions or unauthorized status changes.

[Kerris812/toktickit #53 - Dashboards](https://github.com/Kerris812/toktickit/pull/53#issuecomment-6363560748):

> Don't forget to add related pr issue to the development section.
>
> The dashboard implementation covers the main operational information required for Requesters and
> IT Staff. The separation of role-specific metrics and navigation is clear. Dashboard counts match the database, Requesters cannot access other users' Tickets, and drill-down links apply the correct filters.

[Kerris812/toktickit #54 - Final regression and hardening](https://github.com/Kerris812/toktickit/pull/54#issuecomment-6364968471):

> The regression and hardening work covers the important features developed across Labs 01-04.

Partner's response:

[Kerris812/toktickit #51](https://github.com/Kerris812/toktickit/pull/51#issuecomment-6360064610):

> okay, I'll continue doing next issue.

[Kerris812/toktickit #53](https://github.com/Kerris812/toktickit/pull/53#issuecomment-6363585766):

> Thank for the feedback, I will continue doing next step.

No partner response was recorded in the inspected PR discussions for #52 or #54. These four reviews were PR comments; no formal GitHub approval was recorded for them.
