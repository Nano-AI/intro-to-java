#!/bin/sh
# Runs every configuration sequentially. Must run outside the Claude Code sandbox (ps/footprint).
cd "$(dirname "$0")"
rm -f jdtls-tuned.jsa diagd-dyn.jsa
for c in jdt_std_default jdt_std_tuned jdt_std_tuned_nocds jdt_lightweight diag diag_appcds; do
  python3 bench.py $c ${RUNS:-5} results || echo "FAILED $c"
done
ls -la jdtls-tuned.jsa diagd-dyn.jsa
