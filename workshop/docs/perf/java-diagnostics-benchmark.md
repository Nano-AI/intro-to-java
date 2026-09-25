# Java diagnostics benchmark

Date: 2026-09-25 (runs between 14:54 and 15:12:45 PDT)

Purpose: measure lighter alternatives to the Eclipse JDT Language Server (redhat.java), which Pip Workshop depends on and which is too heavy for 4 GB-RAM student laptops. Only software already installed on the machine was used. Nothing was downloaded or built from external code.

## Machine

| Item | Value |
|---|---|
| CPU | Apple M4, 10 cores (4 performance + 6 efficiency) |
| RAM | 24 GB (25769803776 bytes) |
| OS | macOS 26.4.1 (build 25E253), Darwin 25.4.0 |
| Memory state | Under pressure during the runs: `vm_stat` showed about 4.4k free 16 KB pages (~70 MB free). macOS compresses idle pages, which makes RSS jump around, so the idle phys_footprint row is the more reliable memory number. |
| Python (harness) | 3.14.6 |

## Versions

| Component | Version |
|---|---|
| vscode-java (redhat.java) | 1.56.0, darwin-arm64 |
| JDT-LS core bundle | org.eclipse.jdt.ls.core 1.61.0.202609021834 |
| JDT core | org.eclipse.jdt.core 3.47.0.v20260828-1141 |
| Equinox launcher | 1.8.0.v20260804-1928 |
| Lombok agent (added by vscode-java by default) | lombok-1.18.39-4050.jar |
| JRE running JDT-LS | JRE bundled with redhat.java, 21.0.12.1 (macosx-aarch64) |
| JDK running the javac daemon | `workshop/runtime/jdk`, Eclipse Adoptium Temurin-21.0.12.1+1 |

## Configurations

| Key | Description | Status |
|---|---|---|
| `jdt_std_default` (BASELINE) | JDT-LS in Standard mode with the default vmargs from vscode-java's package.json: `-XX:+UseParallelGC -XX:GCTimeRatio=4 -XX:AdaptiveSizePolicyWeight=90 -Dsun.zip.disableMemoryMapping=true -Xmx2G -Xms100m -Xlog:disable`. It also gets the args that `prepareParams()` in `dist/extension.js` adds: `--add-modules=ALL-SYSTEM`, the `--add-opens` flags, `-DDetectVMInstallationsJob.disabled=true`, `-Dfile.encoding=UTF-8`, the lombok `-javaagent`, `-XX:+HeapDumpOnOutOfMemoryError`, `-Daether.dependencyCollector.impl=bf`, and `config_mac_arm`. Maven and Gradle import are on. AppCDS is off, which is what `java.jdt.ls.appcds.enabled: "auto"` resolves to on a stable release. | measured, 5 runs |
| `jdt_std_tuned` | Same launch with the vmargs replaced by `-XX:+UseSerialGC -Xmx256m -XX:TieredStopAtLevel=1 -Dsun.zip.disableMemoryMapping=true -Xlog:disable`. `java.import.maven.enabled=false` and `java.import.gradle.enabled=false` are passed in the initialize settings. AppCDS uses the extension's own flag set (`-XX:+UnlockDiagnosticVMOptions -XX:+AllowArchivingWithJavaAgent -XX:+AutoCreateSharedArchive -XX:SharedArchiveFile=…`), the same flags that `java.jdt.ls.appcds.enabled: "on"` adds. The warm-up run wrote a 63 MB archive. A separate launch with `-Xlog:cds` showed the "dynamic region" mapped. | measured, 5 runs |
| `jdt_std_tuned_nocds` | The tuned configuration without AppCDS, to separate the effect of the archive. | not measured (time-boxed) |
| `jdt_lightweight` | JDT-LS LightWeight mode (syntax server: `syntaxserver=true`, `config_ss_mac_arm`). | not measured (time-boxed) |
| `diag` | DIY javac daemon `DiagD.java` (javax.tools, in process, one `JavacTask.analyze()` per edit, shared `StandardJavaFileManager`). It runs on `workshop/runtime/jdk` with `-XX:+UseSerialGC -Xmx256m -XX:TieredStopAtLevel=1`. | measured, 3 runs |
| `diag_appcds` | `diag` plus `-XX:+AutoCreateSharedArchive -XX:SharedArchiveFile=diagd-dyn.jsa`. The warm-up run wrote an 11 MB archive, and a check with `-Xlog:cds` showed it mapped. | measured, 3 runs |
| JEP 483 AOT cache | Needs JDK 24 or later. The only JDKs on the machine are 21.0.12.1 (the bundled JRE and runtime/jdk) and Zulu 8. | skipped: no JDK 24+ installed |
| georgewfraser/java-language-server | Needs external code that has not been approved. | out of scope |

## Method

The harness is `bench.py`, an extension of the earlier `client.py`, and a copy is in `java-diagnostics-harness/`.

- **Workspace.** `lesson_ws/src/lesson/Student.java` (package `lesson`) uses `Scanner`, `String`, `Math.sqrt` and a static helper `square(int)`, and calls a stub `Robot` class in `lesson/Robot.java`. The clean file compiles with `javac` without errors. JDT-LS gets `rootUri`, `workspaceFolders` and `triggerFiles=[Student.java]` the way vscode-java sends them. Without `triggerFiles`, the invisible project took `src/lesson` as its source root and reported a false "declared package does not match" error.
- **Transport.** JDT-LS uses LSP over stdio, and the harness answers server-to-client requests with `null`. The javac daemon uses its own framing: `<byteLength>\n<source>` in, one JSON line of diagnostics out. The same Python code drives both and times both. Each run starts from fresh `-data` and `-configuration` directories, which is a first-open workspace.
- **Warm-up and shutdown.** Each configuration gets one warm-up launch that is thrown away. It warms the OS file cache and writes the CDS archive. Then come N measured launches. The shutdown is graceful (LSP `shutdown`/`exit`, or EOF for the daemon) so that the dynamic CDS archive can be written.
- **Order of each launch:**
  1. `initialize` → `initialized` → `didOpen(clean)`. **Cold start** is the time from process launch to the first `publishDiagnostics` for Student.java (for the daemon, the first reply).
  2. An immediate edit to `int total = "x";`. **Launch → first semantic error** is the time from launch to the first publish that contains that error. It shows that type checking is actually live, not just an empty publish.
  3. One unrecorded warm-up pass over all 7 error cases, then one measured pass. Each case is a full-text `didChange` of the clean file. **Edit latency** is the time from `didChange` to the next `publishDiagnostics`. The harness then waits for 1 s of quiet ("settled"), reverts to clean, and settles again.
  4. Completion (JDT-LS only): a line `"abc".` and then a line `Math.` are inserted after `String name = "pip";`, and `textDocument/completion` is requested at the end of each. The harness records latency, item count and the first 5 labels.
  5. Revert to clean, settle, record the clean-file diagnostics, idle 10 s, then record **idle RSS** (summed over the process tree via `ps`) and **idle phys_footprint** (`footprint`, which includes compressed pages).
  6. **Peak RSS** is the largest process-tree RSS seen by a sampler that polls every 200 ms through the whole launch.
- **Statistics.** Each cell below is median (min–max, n = runs). The delta is the change in the median compared with the baseline.
- **Environment.** `JAVA_TOOL_OPTIONS` (set in the shell profile) was removed from the environment of every launched JVM.

## Results

Baseline first. Deltas compare medians with `jdt_std_default`.

| Metric | jdt_std_default (baseline) | jdt_std_tuned | jdt_lightweight | diag | diag_appcds |
|---|---|---|---|---|---|
| Cold start, launch → first diagnostics (s) | 3.70 (3.57–6.38, n=5) | 3.19 (3.15–3.27) **-14%** | not measured (time-boxed) | 0.17 (0.16–0.17, n=3) **-96%** | 0.11 (0.10–0.12, n=3) **-97%** |
| Launch → first semantic error shown (s) | 4.12 (4.00–6.81) | 3.62 (3.57–3.76) **-12%** | not measured (time-boxed) | 0.19 (0.18–0.19) **-95%** | 0.13 (0.12–0.14) **-97%** |
| Idle RSS, process tree (MB) | 588 (379–609) | 481 (384–485) **-18%** | not measured (time-boxed) | 150 (130–150) **-75%** | 142 (60–142) **-76%** |
| Idle phys_footprint (MB) | 610 (584–631) | 389 (387–389) **-36%** | not measured (time-boxed) | 121 (121–122) **-80%** | 119 (119–119) **-80%** |
| Peak RSS, process tree (MB) | 700 (689–713) | 487 (480–492) **-30%** | not measured (time-boxed) | 150 (150–150) **-79%** | 142 (142–142) **-80%** |
| Edit latency: missing semicolon (ms) | 441 (422–487) | 431 (419–440) -2% | not measured (time-boxed) | 9 (8–9) **-98%** | 7 (7–7) **-98%** |
| Edit latency: `int total = "x";` (ms) | 432 (419–478) | 444 (425–492) +3% | not measured (time-boxed) | 7 (7–8) **-98%** | 7 (7–7) **-98%** |
| Edit latency: undefined variable (ms) | 432 (422–498) | 432 (427–481) 0% | not measured (time-boxed) | 7 (7–10) **-98%** | 7 (7–8) **-98%** |
| Edit latency: missing return (ms) | 440 (426–443) | 440 (425–447) 0% | not measured (time-boxed) | 7 (7–8) **-98%** | 7 (7–7) **-98%** |
| Edit latency: nonexistent Robot method (ms) | 432 (423–492) | 451 (420–489) +4% | not measured (time-boxed) | 8 (7–8) **-98%** | 8 (7–8) **-98%** |
| Edit latency: unclosed brace (ms) | 439 (423–480) | 474 (432–484) +8% | not measured (time-boxed) | 7 (7–8) **-98%** | 7 (6–7) **-98%** |
| Edit latency: `system.out.println` (ms) | 434 (424–444) | 473 (442–479) +9% | not measured (time-boxed) | 8 (7–8) **-98%** | 8 (7–8) **-98%** |
| Completion `"abc".` latency (ms) | 172 (143–178) | 161 (149–162) -7% | not measured (time-boxed) | not supported | not supported |
| Completion `"abc".` items | 61 | 61 | not measured (time-boxed) | not supported | not supported |
| Completion `Math.` latency (ms) | 88 (79–94) | 84 (78–95) -4% | not measured (time-boxed) | not supported | not supported |
| Completion `Math.` items | 50 | 50 | not measured (time-boxed) | not supported | not supported |

`jdt_std_tuned_nocds` is not measured (time-boxed), so the AppCDS share of the tuned cold-start gain is unknown.

Completion quality: both JDT-LS configurations returned the same lists in every run. `"abc".` gave `charAt(int arg0) : char`, `chars() : IntStream`, `codePointAt…` (61 items). `Math.` gave `E`, `PI`, `TAU`, `class`, `IEEEremainder…` (50 items). Only the top 5 labels were recorded, so whether specific members such as `length()` or `max` appear lower in the list was not checked. The 50-item `Math.` list looks like the server's result cap, but that was not verified.

## Correctness

The table shows how many runs reported an error on or near the expected line, with the message text. It uses the settled diagnostics. In every run the first publish after an edit matched the settled set.

| Case (edit) | jdt_std_default | jdt_std_tuned | jdt_lightweight | diag / diag_appcds |
|---|---|---|---|---|
| Missing semicolon (`int total = 0`) | 5/5, L10 `Syntax error, insert ";" to complete LocalVariableDeclarationStatement` | 5/5, same | not measured (time-boxed) | 3/3 + 3/3, L10 `';' expected` |
| `int total = "x";` | 5/5, L10 `Type mismatch: cannot convert from String to int` | 5/5, same | not measured (time-boxed) | 3/3 + 3/3, L10 `incompatible types: java.lang.String cannot be converted to int` |
| Undefined variable (`totl`) | 5/5, L15 `totl cannot be resolved to a variable` | 5/5, same | not measured (time-boxed) | 3/3 + 3/3, L15 `cannot find symbol` / `symbol: variable totl` / `location: class lesson.Student` |
| Missing return in `square` | 5/5, L22 (method header) `This method must return a result of type int`; also warning L7 `Resource leak: 'console' is never closed` | 5/5, same | not measured (time-boxed) | 3/3 + 3/3, L24 (closing brace) `missing return statement` |
| Nonexistent Robot method (`robot.jump`) | 5/5, L18 `The method jump(int) is undefined for the type Robot` | 5/5, same | not measured (time-boxed) | 3/3 + 3/3, L18 `cannot find symbol` / `symbol: method jump(int)` / `location: variable robot of type lesson.Robot` |
| Unclosed brace (for-loop `}` removed) | 5/5, L18 `Syntax error, insert "}" to complete Block` | 5/5, same | not measured (time-boxed) | 3/3 + 3/3, L21 `illegal start of expression` |
| `system.out.println` | 5/5, L15 `system cannot be resolved` | 5/5, same | not measured (time-boxed) | 3/3 + 3/3, L15 `package system does not exist` |
| Clean file (false positives) | 0 errors; 1 warning in 5/5 runs: L7 `Resource leak: 'console' is never closed` | same | not measured (time-boxed) | 0 diagnostics |

Both backends caught all 7 error cases in every run.

- **Message wording.** JDT's messages are more beginner-friendly for the undefined variable and the nonexistent method, where javac's first line is only `cannot find symbol`. javac's `package system does not exist` is misleading for a capitalisation mistake.
- **Line placement.** For the unclosed brace, JDT points at the block that is missing its brace (L18). javac points at where parsing failed (L21, the next method). For the missing return, JDT points at the method header (L22) and javac at the closing brace (L24).
- **Resource-leak warning.** JDT gives a resource-leak warning for `new Scanner(System.in)` on an otherwise clean lesson file. The same warning is also in the diagnostics CSV for the missing-return case in every run, and never appears alongside the other six errors.

## Failures and notes

- **Time box.** LightWeight mode (`jdt_lightweight`) and the tuned-without-AppCDS control were not measured. The coordinator ended the session to fit the user's ~2 h window and skipped LightWeight on purpose. The javac daemon got 3 runs per configuration instead of 5.
- **CPU contamination check.** Heavy cargo/npm builds by other agents began at about 15:15 PDT. Every measured run and the CDS check finished by 15:12:45 PDT (file timestamps), so no run overlapped that window. Whether other background load was present earlier is not known.
- **Discarded javac-daemon runs.** The first `diag`/`diag_appcds` runs (15:08–15:10) were thrown away. With a directory on `-cp`, `-XX:+AutoCreateSharedArchive` fails with "non-empty directory" and no archive is written. DiagD was repackaged as `diagd.jar`, and both configurations were re-run on the jar (15:10–15:12).
- **Baseline outlier.** Run 1 of the baseline was slow (6.38 s cold start); the other runs were 3.57–3.74 s. The median is robust to it.
- **RSS under memory pressure.** The machine had very little free RAM, so macOS compressed idle JVM pages and RSS dropped. Examples: 379 MB in one baseline run, 60 MB in one `diag_appcds` run. phys_footprint counts compressed pages and was stable (for example 387–389 MB tuned), so it is the better number for comparing footprint.
- **JDT-LS edit-latency floor.** Every JDT-LS edit latency sits at about 420–500 ms regardless of the error type or the JVM flags. This points to a fixed reconcile/publish scheduling delay inside JDT-LS rather than compute time. JVM tuning does not change it.
- **Tuned AppCDS.** Dynamic CDS archives only classes loaded by the built-in class loaders. Most JDT-LS code is loaded by OSGi bundle class loaders, which limits how much the 63 MB archive can help. The no-CDS control was not measured, so the archive's own contribution is unknown.
- **Comparison caveats.**
  - The javac daemon only does diagnostics. It has no completion, hover or quick fixes, and it has no project model: Robot is resolved through `-sourcepath`.
  - Its transport is a line protocol rather than LSP, so its latency leaves out LSP JSON framing costs, which are expected to be small next to 7 ms.
  - JDT-LS was driven by a minimal client, not VS Code. vscode-java sends many more settings and client capabilities, so absolute numbers inside VS Code may differ.
- **Measurement commands outside the sandbox.** `ps` and `footprint` are blocked by the Claude Code sandbox, so the benchmark runs were executed with the sandbox disabled. No other commands needed it.

## Raw data

- `java-diagnostics-benchmark-raw.csv`: one row per run and metric (`config,run,metric,case,value,unit`), including the completion top-5 labels.
- `java-diagnostics-benchmark-diagnostics.csv`: every diagnostic received per run and case, both the first publish and the settled set (`config,run,case,phase,severity,line,message`). Severity 1 is error and 2 is warning; lines are 1-based.
- `java-diagnostics-harness/`: `bench.py`, `summarize.py`, `DiagD.java`, `run_all.sh`, and the lesson workspace.

## Reproduce

Run from a scratch copy of the harness directory, outside the Claude Code sandbox (needed for `ps`/`footprint`). The paths assume redhat.java 1.56.0 in `~/.vscode/extensions` and the JDK at `workshop/runtime/jdk`.

```sh
cp -R workshop/docs/perf/java-diagnostics-harness /tmp/jbench && cd /tmp/jbench
J=/Users/grootbeat/Documents/suhas_java/workshop/runtime/jdk/bin
env -u JAVA_TOOL_OPTIONS $J/javac --release 21 -d diagd_cls DiagD.java
env -u JAVA_TOOL_OPTIONS $J/jar cf diagd.jar -C diagd_cls .
rm -f jdtls-tuned.jsa diagd-dyn.jsa
python3 bench.py jdt_std_default 5 results
python3 bench.py jdt_std_tuned 5 results
python3 bench.py diag 3 results
python3 bench.py diag_appcds 3 results
# not run on 2026-09-25 (time-boxed):
python3 bench.py jdt_std_tuned_nocds 5 results
python3 bench.py jdt_lightweight 5 results
python3 summarize.py results out   # prints the tables and writes the combined CSVs to out/
```

`run_all.sh` runs all six configurations in sequence (`RUNS=5 ./run_all.sh`).
