# Recovering an earlier learning record

The desktop app stores progress and Java files in `~/.pip-java/`. Earlier workspace-based versions stored progress separately from Java source. An app update does not automatically combine those records: a folder named `.demo-profile` can contain demonstration work, and importing it without review could award unrelated completions.

Use the recovery script only after identifying the actual student workspace and its matching progress file. It does not discover or import other profiles automatically.

## Preview first

From `workshop/`, run:

```sh
node tools/recover-progress.mjs \
  --workspace '/path/to/earlier/student/workspace' \
  --progress '/path/to/that/workspace/progress.json' \
  --target "$HOME/.pip-java"
```

Without `--apply`, this only reports completion IDs, missing Java files, existing-file conflicts and draft conflicts. Review the output before proceeding. A saved Java file alone never awards completion.

Quit Pip Workshop, then repeat the command with `--apply`. Keep the app closed until recovery finishes. The script refuses to apply while the native app process is running.

## What recovery preserves

- Creates a full backup of the desktop workspace before changing it. The returned `backup` path contains that snapshot; `reportFile` records the operation beside it.
- Unions recorded completion IDs and retains earned game progress. It does not run programs or infer missing passes.
- Keeps current nonempty drafts, notes, answers and other saved records when the older record conflicts.
- Creates only missing Java files in known lesson and game folders. Existing `Student.java`, `Robot.java` and other Java files are never replaced.
- Copies correctly packaged Java source byte for byte. A source without a package receives the expected package only in the new copy; a conflicting package stops recovery for review. Original files remain unchanged.
- Checks for unexpected desktop progress changes before committing the combined file, and writes that file atomically.

Backups contain student source and notes. Keep them private. To undo recovery, quit Pip Workshop and restore the **entire** recorded backup workspace to `~/.pip-java/`; replacing only `progress.json` would leave the newly recovered source files in place.

## Verify a recovery

Keep the preview, backup location and recovery report on the student's computer. These contain private learning records and must not be committed or included in a release bundle.

Before applying recovery, record which current Java files already exist and compare them byte for byte afterward. Check that current drafts win conflicts, missing sources retain their expected packages, saved game stars are preserved, and only completion IDs from the approved progress file are imported. Reopen the app and compare the visible learning record with that source record.

A multipart practice counts as complete only when every required part has a current pass. Imported completion IDs can therefore outnumber the completed practices shown in Course. Recovery does not invent missing passes or bypass project prerequisites.

Automated compatibility coverage is in `tests/recovery.test.js`. Recovery remains separate from development demo mode: neither recovery previews nor demo work may replace existing student Java or silently import an unrelated profile.
