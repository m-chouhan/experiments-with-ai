Support Python's "compatible release" operator `~=` in ranges: the last component given may increase, the ones before it are fixed.

- `~=1.2` means `>=1.2.0 <2.0.0-0`
- `~=1.2.3` means `>=1.2.3 <1.3.0-0`
- `~=1` means `>=1.0.0 <2.0.0-0`
- `~= 1.2` (with a space) works too

Prereleases and bounds follow the same conventions as `~` and `^`: the upper bound excludes its own prereleases (`-0`), a prerelease on the lower bound is kept (`~=1.2.3-beta.1` means `>=1.2.3-beta.1 <1.3.0-0`), and with `includePrerelease` the lower bound gets `-0`.

`~`, `~>` and `^` keep their current meaning. Keep the README up to date.
