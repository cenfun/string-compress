# String Compression

```sh
npm install
npm run test
```

## The Winner is tiny-inflate
```sh
┌──────────────────────────────┬─────────────┬───────────┬─────────┬───────────┬──────────┬────────┐
│ name                         │    raw size │  b64 size │ js size │ dist size │   c time │ d time │
├──────────────────────────────┼─────────────┼───────────┼─────────┼───────────┼──────────┼────────┤
│ ├ case 1: fund-info.json     │  20,921,614 │           │         │           │          │        │
│ │ ├ lz-string                │     -91.4 % │ 1,805,888 │   2,445 │ 1,808,333 │ 6,941 ms │ 518 ms │
│ │ ├ pako                     │     -88.1 % │ 2,449,972 │  47,852 │ 2,497,824 │   744 ms │ 336 ms │
│ │ ├ uzip                     │     -88.4 % │ 2,418,716 │  15,704 │ 2,434,420 │   505 ms │ 318 ms │
│ │ ├ fflate                   │     -88.4 % │ 2,419,188 │   5,258 │ 2,424,446 │   505 ms │ 279 ms │
│ │ └ tiny-inflate             │     -88.3 % │ 2,449,625 │   3,953 │ 2,453,578 │   262 ms │ 329 ms │
├──────────────────────────────┼─────────────┼───────────┼─────────┼───────────┼──────────┼────────┤
│ ├ case 2: monocart-10m.json  │   4,259,406 │           │         │           │          │        │
│ │ ├ lz-string                │     -87.5 % │   528,440 │   2,445 │   530,885 │ 1,425 ms │  95 ms │
│ │ ├ pako                     │     -91.7 % │   305,660 │  47,852 │   353,512 │   101 ms │  65 ms │
│ │ ├ uzip                     │     -92.5 % │   305,436 │  15,704 │   321,140 │    93 ms │  71 ms │
│ │ ├ fflate                   │     -92.7 % │   305,552 │   5,258 │   310,810 │    88 ms │  58 ms │
│ │ └ tiny-inflate             │     -92.7 % │   305,660 │   3,953 │   309,613 │    37 ms │  48 ms │
├──────────────────────────────┼─────────────┼───────────┼─────────┼───────────┼──────────┼────────┤
│ ├ case 3: music.163.com.har  │   7,347,750 │           │         │           │          │        │
│ │ ├ lz-string                │     -40.2 % │ 4,393,148 │   2,445 │ 4,395,593 │ 2,948 ms │ 695 ms │
│ │ ├ pako                     │     -55.8 % │ 3,198,924 │  47,852 │ 3,246,776 │   439 ms │ 344 ms │
│ │ ├ uzip                     │     -55.0 % │ 3,289,232 │  15,704 │ 3,304,936 │   416 ms │ 347 ms │
│ │ ├ fflate                   │     -55.2 % │ 3,289,656 │   5,258 │ 3,294,914 │   333 ms │ 306 ms │
│ │ └ tiny-inflate             │     -56.4 % │ 3,198,408 │   3,953 │ 3,202,361 │   256 ms │ 347 ms │
├──────────────────────────────┼─────────────┼───────────┼─────────┼───────────┼──────────┼────────┤
│ ├ case 4: network-report.har │     747,558 │           │         │           │          │        │
│ │ ├ lz-string                │     -45.3 % │   406,572 │   2,445 │   409,017 │   375 ms │  66 ms │
│ │ ├ pako                     │     -59.2 % │   257,128 │  47,852 │   304,980 │    69 ms │  46 ms │
│ │ ├ uzip                     │     -62.4 % │   265,448 │  15,704 │   281,152 │    47 ms │  47 ms │
│ │ ├ fflate                   │     -63.8 % │   265,472 │   5,258 │   270,730 │    39 ms │  49 ms │
│ │ └ tiny-inflate             │     -65.1 % │   257,107 │   3,953 │   261,060 │    43 ms │  36 ms │
├──────────────────────────────┼─────────────┼───────────┼─────────┼───────────┼──────────┼────────┤
│ ├ case 5: report.json        │   2,767,667 │           │         │           │          │        │
│ │ ├ lz-string                │     -85.0 % │   413,724 │   2,445 │   416,169 │ 1,079 ms │  85 ms │
│ │ ├ pako                     │     -84.8 % │   373,152 │  47,852 │   421,004 │    86 ms │  69 ms │
│ │ ├ uzip                     │     -85.8 % │   377,400 │  15,704 │   393,104 │    69 ms │  77 ms │
│ │ ├ fflate                   │     -86.2 % │   377,392 │   5,258 │   382,650 │   113 ms │  84 ms │
│ │ └ tiny-inflate             │     -86.4 % │   372,952 │   3,953 │   376,905 │    46 ms │  64 ms │
├──────────────────────────────┼─────────────┼───────────┼─────────┼───────────┼──────────┼────────┤
│ └ case 6: simple.json        │           2 │           │         │           │          │        │
│   ├ lz-string                │  122550.0 % │         8 │   2,445 │     2,453 │    19 ms │   0 ms │
│   ├ pako                     │ 2393300.0 % │        16 │  47,852 │    47,868 │    20 ms │   2 ms │
│   ├ uzip                     │  785500.0 % │         8 │  15,704 │    15,712 │    18 ms │   1 ms │
│   ├ fflate                   │  264600.0 % │        36 │   5,258 │     5,294 │    24 ms │   0 ms │
│   └ tiny-inflate             │  198050.0 % │        10 │   3,953 │     3,963 │    21 ms │   0 ms │
└──────────────────────────────┴─────────────┴───────────┴─────────┴───────────┴──────────┴────────┘
```