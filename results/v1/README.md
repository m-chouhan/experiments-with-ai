# v1 results (original mature baseline)

Produced with `projects/mature` as of commit 952e1d0, whose `Cli.handle()` validated word
count with one implicit check (`if (arg === undefined || extra.length)`). Haiku failed
"pass needs exactly one plate" on it in all 3 runs. The baseline was then changed to a
command table (each command declares its arguments) and the experiment rerun.

Branches: `exp/v1/<model>/<version>-<run>`.
