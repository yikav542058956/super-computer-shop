# Bug Prevention Checklist (Always Follow)

Before you say "done" on any task, go through this checklist. Do not skip steps.

## 1. Save / Persistence
- After ANY save/update/delete operation, verify the data actually persisted (re-read it back, or check the DB/file/state).
- Never assume a save succeeded just because no error was thrown — check the return value / response.
- If saving to a file or DB, wrap it in try/catch and log the actual error, don't fail silently.
- If there's async code involved in saving, make sure you `await` it — don't let the function return before the save finishes.

## 2. Consistency ("kabhi kuch, kabhi kuch" bugs)
- If a feature works sometimes and not other times, it's almost always:
  - A race condition (two things happening in wrong order)
  - Missing `await` / unhandled promise
  - State being read before it's updated
  - Cache showing stale data
- When you find such a bug, explicitly state which of these it is before fixing it.

## 3. State Management
- Don't mutate state directly — always create a new copy (especially in React/JS: no direct array/object mutation).
- After updating state, don't immediately read the old state value in the same function — it won't be updated yet.
- Double check every place the same data is stored (don't let two sources of truth go out of sync).

## 4. Error Handling
- Every network call / file operation / DB query must have error handling — no silent failures.
- Show a clear error message or log it — never just `catch (e) {}` and move on.
- If something fails, the user/system should know it failed, not think it succeeded.

## 5. Edge Cases (check every time)
- Empty input / empty list
- Very first time (no data exists yet)
- Duplicate submit / double click
- Network delay or offline
- Special characters or long text in input

## 6. Before Marking Task Complete
- [ ] Actually re-test the exact scenario the user described
- [ ] Test it twice in a row (to catch "sometimes it fails" bugs)
- [ ] Check console/logs for hidden errors, even if UI looks fine
- [ ] Confirm data is really saved by reloading/re-fetching, not just trusting the success message
- [ ] Explain in plain words what was actually fixed and why it was happening

## 7. Golden Rule
If you are not 100% sure why a bug happened, say so — do not guess-fix and claim it's resolved.