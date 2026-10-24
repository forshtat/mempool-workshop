# reset_reputation

**Not a workshop step.** Undoes [step 9](steps/step_9_reputation_burn.md) so your wallet can send again.

```sh
npm run reset_reputation      # add --json for one JSON object
```

**Needs:** step 6 (it reads your wallet from the state file; there is no address argument)

**What it does:** Writes `opsSeen 0, opsIncluded 0` for **your wallet only** with the devnet's open `debug_bundler_setReputation` (a shortcut, like step 9), and waits until the explorer shows `OK`.

**If it fails:** `STATE_MISSING` means step 6 has not run; `REPUTATION_NOT_APPLIED` means the explorer is disabled or the debug method is closed, as in step 9.
