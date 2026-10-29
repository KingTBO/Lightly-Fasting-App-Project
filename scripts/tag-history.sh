#!/bin/sh
# Creates the version tags for the history up to 0.19.3 and pushes them.
# Run once from a clone with push access: sh scripts/tag-history.sh
# (Versions up to 0.19.2 were assigned afterwards, so they are approximate.)
set -e
git tag -a v0.1.0 -m "v0.1.0 feature" ad0213f
git tag -a v0.2.0 -m "v0.2.0 feature" c0cce62
git tag -a v0.2.1 -m "v0.2.1 chore" 9b39478
git tag -a v0.2.2 -m "v0.2.2 fix" 2e3cdd4
git tag -a v0.3.0 -m "v0.3.0 design" 48c45bc
git tag -a v0.4.0 -m "v0.4.0 design" f7f274a
git tag -a v0.4.1 -m "v0.4.1 fix" 56d67e8
git tag -a v0.5.0 -m "v0.5.0 feature" 0608a98
git tag -a v0.5.1 -m "v0.5.1 docs" 8add621
git tag -a v0.5.2 -m "v0.5.2 docs" e5879df
git tag -a v0.5.3 -m "v0.5.3 fix" 79de577
git tag -a v0.5.4 -m "v0.5.4 chore" 9aac783
git tag -a v0.6.0 -m "v0.6.0 feature" bc861d0
git tag -a v0.7.0 -m "v0.7.0 feature" 61e7d88
git tag -a v0.7.1 -m "v0.7.1 fix" 481f110
git tag -a v0.7.2 -m "v0.7.2 fix" 3a9f08b
git tag -a v0.7.3 -m "v0.7.3 fix" a24bc7f
git tag -a v0.7.4 -m "v0.7.4 copy" b3f4df1
git tag -a v0.7.5 -m "v0.7.5 copy" 2b23cda
git tag -a v0.8.0 -m "v0.8.0 feature" 3573d66
git tag -a v0.9.0 -m "v0.9.0 feature" 29f4134
git tag -a v0.10.0 -m "v0.10.0 design" 96774a5
git tag -a v0.11.0 -m "v0.11.0 design" 4574cdd
git tag -a v0.12.0 -m "v0.12.0 design" 9fe7aee
git tag -a v0.13.0 -m "v0.13.0 feature" 40b15b8
git tag -a v0.13.1 -m "v0.13.1 chore" 12ef375
git tag -a v0.13.2 -m "v0.13.2 fix" da5ba83
git tag -a v0.13.3 -m "v0.13.3 fix" bb7f45f
git tag -a v0.13.4 -m "v0.13.4 fix" 861c194
git tag -a v0.14.0 -m "v0.14.0 feature" 1cfcd72
git tag -a v0.14.1 -m "v0.14.1 docs" 901c401
git tag -a v0.15.0 -m "v0.15.0 feature" b456df8
git tag -a v0.15.1 -m "v0.15.1 docs" c532ddb
git tag -a v0.16.0 -m "v0.16.0 design" 90a9918
git tag -a v0.17.0 -m "v0.17.0 design" 448655a
git tag -a v0.18.0 -m "v0.18.0 design" 7391f02
git tag -a v0.19.0 -m "v0.19.0 design" 836163e
git tag -a v0.19.1 -m "v0.19.1 fix" 60993a9
git tag -a v0.19.2 -m "v0.19.2 docs" 3ccf32e
git tag -a v0.19.3 -m "v0.19.3 docs" 9277561
git push origin --tags
