Run: issue-27-2026-10-23T12-37-24-458Z-3f77c2bd

| Metric / query predicate | Role | Database | API | Visible UI | Result |
| --- | --- | ---: | ---: | ---: | --- |
| All Active: requesterId=session.userId AND currentStatus IN (NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED) | REQUESTER | 5 | 5 | 5 | PASS |
| Open: requesterId=session.userId AND currentStatus='OPEN' | REQUESTER | 1 | 1 | 1 | PASS |
| Waiting for Requester: requesterId=session.userId AND currentStatus='WAITING_FOR_REQUESTER' | REQUESTER | 1 | 1 | 1 | PASS |
| Resolved: requesterId=session.userId AND currentStatus='RESOLVED' | REQUESTER | 1 | 1 | 1 | PASS |
| Unassigned Active: assignedStaffId IS NULL AND currentStatus IN active statuses | IT_STAFF | 4 | 4 | 4 | PASS |
| My Assigned Active: assignedStaffId=session.userId AND currentStatus IN active statuses | IT_STAFF | 2 | 2 | 2 | PASS |
| New: currentStatus='NEW' | IT_STAFF | 2 | 2 | 2 | PASS |
| Urgent: itPriority='URGENT' | IT_STAFF | 2 | 2 | 2 | PASS |
| My Planned Actions preview: assignedToId=session.userId AND status='PLANNED' ORDER BY createdAt,id LIMIT 5 | IT_STAFF | 5 | 5 | 5 | PASS |
| Unassigned Active: assignedStaffId IS NULL AND currentStatus IN active statuses | ADMINISTRATOR | 4 | 4 | 4 | PASS |
| My Assigned Active: assignedStaffId=session.userId AND currentStatus IN active statuses | ADMINISTRATOR | 0 | 0 | 0 | PASS |
| New: currentStatus='NEW' | ADMINISTRATOR | 2 | 2 | 2 | PASS |
| Urgent: itPriority='URGENT' | ADMINISTRATOR | 2 | 2 | 2 | PASS |
| My Planned Actions preview: assignedToId=session.userId AND status='PLANNED' ORDER BY createdAt,id LIMIT 5 | ADMINISTRATOR | 5 | 5 | 5 | PASS |
