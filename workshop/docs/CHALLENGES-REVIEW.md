# Independent challenges: review packet

This packet contains answer keys and is for instructor/agent review. Student-facing problems and starter code appear in [CHALLENGES.md](CHALLENGES.md) and are included below so this packet can be reviewed alone.

## Review criteria

- Is the task unambiguous, with only prerequisite topics needed?
- Do both examples follow the stated rules?
- Can a beginner finish both tasks in the estimated 10–20 minutes? Timing has not been calibrated with a student.
- Do varied and boundary inputs reject fixed-output shortcuts?
- Are helper methods and unchanged arrays checked directly?
- Does the UI retain compiler feedback while removing hints, autocomplete and solution insertion?

## Assessment and compatibility

These are optional challenges: they are appended to the lesson registry but excluded from module.ids and orderedLessons. The guided path remains 35 entries / 39 coding practices. The ten challenge IDs and source packages stay unchanged. Assessment version 2 adds a second result or related method to every challenge. Existing Java files, drafts and prior pass records are retained. A version 1 pass does not complete the strengthened challenge: extend the saved code to meet the new contract and submit again. Guided lesson completion remains compatible with older versions.

The existing console runner executes main and direct method calls. It tests both substituted input variables and standard input. All supplied cases must pass. Basic and loop problems keep input variables unchanged. Direct helper probes prevent a hardcoded main from satisfying a methods problem. Each array helper has a return-value probe and a caller-data preservation check for every supplied array. Main output checks both result lines. Loop and method-signature checks run before execution.

## Grading limits

**Passing tests does not prove that the required loop or helper caused the answer.** An empty loop followed by a correct arithmetic formula can pass. A helper can be called with its return value ignored while another calculation produces the answer. The existing checker verifies loop presence in the named scope and calls outside a helper's own body; it does not evaluate semantic dependence or enforce that each new helper contains its own loop. In Trip cost and Match score, inspect the requested helper-to-helper calls during review. No semantic evaluator is included.

Cases are fixed, varied and include boundaries. They catch the reviewed hardcoded-answer shortcuts, but they are a teaching assessment, not an anti-cheating proof. Each array argument has a separate return-value check and an unchanged-array check, including empty and singleton arrays. A reviewer should inspect the code when loop or helper use is the learning objective.

## Sources and adaptation

These prompts, starters, examples and checks were written for Pip. The short function format is informed by [CodingBat Java warmups](https://codingbat.com/java/Warmup-1). Array traversal practice is informed by [CodingBat Array-2](https://codingbat.com/java/Array-2). Positive gains extends the positive-sum exercise with a count; the original pattern is represented by [Codewars: Sum of positive](https://www.codewars.com/kata/5715eaedb436cf5606000381). The other combined requirements are Pip extensions, not claims that those sites publish these exact problems. No source solution or prompt text is reproduced. These sites do not endorse Pip. Source pages were checked on October 11, 2026.

## Answer keys and checks

### Battery budget

**ID:** `challenge-battery-budget` · **Version:** 2 · **Unit:** `basics` · **Prerequisites:** `hello-java`, `java-declare`, `java-types`, `java-variables`, `java-expressions`

#### Reference solution

```java
public class Student {
    public static void main(String[] args) {
        int energy = 50;
        int moves = 6;
        int costPerMove = 3;
        int spent = moves * costPerMove;
        int remaining = energy - spent;
        System.out.println(spent);
        System.out.println(remaining);
    }
}
```

#### Cases

| Check | Input / invocation | Expected output |
|---|---|---|
| energy = 50, moves = 6, costPerMove = 3 | {"energy":50,"moves":6,"costPerMove":3} | 18<br>32 |
| energy = 24, moves = 8, costPerMove = 3 | {"energy":24,"moves":8,"costPerMove":3} | 24<br>0 |
| energy = 0, moves = 0, costPerMove = 0 | {"energy":0,"moves":0,"costPerMove":0} | 0<br>0 |
| energy = 43, moves = 0, costPerMove = 7 | {"energy":43,"moves":0,"costPerMove":7} | 0<br>43 |
| energy = 200, moves = 20, costPerMove = 10 | {"energy":200,"moves":20,"costPerMove":10} | 200<br>0 |
| energy = 79, moves = 7, costPerMove = 4 | {"energy":79,"moves":7,"costPerMove":4} | 28<br>51 |
| energy = 12, moves = 9, costPerMove = 0 | {"energy":12,"moves":9,"costPerMove":0} | 0<br>12 |
| energy = 40, moves = 1, costPerMove = 1 | {"energy":40,"moves":1,"costPerMove":1} | 1<br>39 |
| energy = 47, moves = 2, costPerMove = 2 | {"energy":47,"moves":2,"costPerMove":2} | 4<br>43 |
| energy = 54, moves = 3, costPerMove = 3 | {"energy":54,"moves":3,"costPerMove":3} | 9<br>45 |
| energy = 61, moves = 4, costPerMove = 4 | {"energy":61,"moves":4,"costPerMove":4} | 16<br>45 |
| energy = 68, moves = 5, costPerMove = 5 | {"energy":68,"moves":5,"costPerMove":5} | 25<br>43 |
| energy = 75, moves = 6, costPerMove = 1 | {"energy":75,"moves":6,"costPerMove":1} | 6<br>69 |
| energy = 82, moves = 7, costPerMove = 2 | {"energy":82,"moves":7,"costPerMove":2} | 14<br>68 |
| energy = 89, moves = 8, costPerMove = 3 | {"energy":89,"moves":8,"costPerMove":3} | 24<br>65 |
| energy = 96, moves = 9, costPerMove = 4 | {"energy":96,"moves":9,"costPerMove":4} | 36<br>60 |
| energy = 103, moves = 10, costPerMove = 5 | {"energy":103,"moves":10,"costPerMove":5} | 50<br>53 |
| energy = 110, moves = 11, costPerMove = 1 | {"energy":110,"moves":11,"costPerMove":1} | 11<br>99 |
| energy = 117, moves = 12, costPerMove = 2 | {"energy":117,"moves":12,"costPerMove":2} | 24<br>93 |
| energy = 124, moves = 13, costPerMove = 3 | {"energy":124,"moves":13,"costPerMove":3} | 39<br>85 |

#### Source requirements

```json
{
  "variables": {
    "energy": "int",
    "moves": "int",
    "costPerMove": "int",
    "spent": "int",
    "remaining": "int"
  },
  "prints": [
    "spent",
    "remaining"
  ],
  "unchanged": [
    "energy",
    "moves",
    "costPerMove"
  ]
}
```

### Prize tokens

**ID:** `challenge-prize-tokens` · **Version:** 2 · **Unit:** `basics` · **Prerequisites:** `hello-java`, `java-declare`, `java-types`, `java-variables`, `java-expressions`

#### Reference solution

```java
public class Student {
    public static void main(String[] args) {
        int score = 29;
        int pointsPerToken = 6;
        int tokens = score / pointsPerToken;
        int leftover = score - tokens * pointsPerToken;
        System.out.println(tokens);
        System.out.println(leftover);
    }
}
```

#### Cases

| Check | Input / invocation | Expected output |
|---|---|---|
| score = 29, pointsPerToken = 6 | {"score":29,"pointsPerToken":6} | 4<br>5 |
| score = 5, pointsPerToken = 8 | {"score":5,"pointsPerToken":8} | 0<br>5 |
| score = 0, pointsPerToken = 1 | {"score":0,"pointsPerToken":1} | 0<br>0 |
| score = 30, pointsPerToken = 6 | {"score":30,"pointsPerToken":6} | 5<br>0 |
| score = 500, pointsPerToken = 1 | {"score":500,"pointsPerToken":1} | 500<br>0 |
| score = 499, pointsPerToken = 50 | {"score":499,"pointsPerToken":50} | 9<br>49 |
| score = 83, pointsPerToken = 7 | {"score":83,"pointsPerToken":7} | 11<br>6 |
| score = 17, pointsPerToken = 2 | {"score":17,"pointsPerToken":2} | 8<br>1 |
| score = 48, pointsPerToken = 3 | {"score":48,"pointsPerToken":3} | 16<br>0 |
| score = 79, pointsPerToken = 4 | {"score":79,"pointsPerToken":4} | 19<br>3 |
| score = 110, pointsPerToken = 5 | {"score":110,"pointsPerToken":5} | 22<br>0 |
| score = 141, pointsPerToken = 6 | {"score":141,"pointsPerToken":6} | 23<br>3 |
| score = 172, pointsPerToken = 7 | {"score":172,"pointsPerToken":7} | 24<br>4 |
| score = 203, pointsPerToken = 8 | {"score":203,"pointsPerToken":8} | 25<br>3 |
| score = 234, pointsPerToken = 9 | {"score":234,"pointsPerToken":9} | 26<br>0 |
| score = 265, pointsPerToken = 10 | {"score":265,"pointsPerToken":10} | 26<br>5 |
| score = 296, pointsPerToken = 11 | {"score":296,"pointsPerToken":11} | 26<br>10 |
| score = 327, pointsPerToken = 12 | {"score":327,"pointsPerToken":12} | 27<br>3 |
| score = 358, pointsPerToken = 13 | {"score":358,"pointsPerToken":13} | 27<br>7 |
| score = 389, pointsPerToken = 14 | {"score":389,"pointsPerToken":14} | 27<br>11 |

#### Source requirements

```json
{
  "variables": {
    "score": "int",
    "pointsPerToken": "int",
    "tokens": "int",
    "leftover": "int"
  },
  "prints": [
    "tokens",
    "leftover"
  ],
  "unchanged": [
    "score",
    "pointsPerToken"
  ]
}
```

### Round points

**ID:** `challenge-round-points` · **Version:** 2 · **Unit:** `loops` · **Prerequisites:** `java-declare`, `java-variables`, `java-expressions`, `java-for`, `java-accumulator`

#### Reference solution

```java
public class Student {
    public static void main(String[] args) {
        int rounds = 4;
        int total = 0;
        int readingSum = 0;
        for (int round = 1; round <= rounds; round++) {
            total += round;
            readingSum += total;
        }
        System.out.println(total);
        System.out.println(readingSum);
    }
}
```

#### Cases

| Check | Input / invocation | Expected output |
|---|---|---|
| rounds = 4 | {"rounds":4} | 10<br>20 |
| rounds = 2 | {"rounds":2} | 3<br>4 |
| rounds = 0 | {"rounds":0} | 0<br>0 |
| rounds = 1 | {"rounds":1} | 1<br>1 |
| rounds = 9 | {"rounds":9} | 45<br>165 |
| rounds = 17 | {"rounds":17} | 153<br>969 |
| rounds = 30 | {"rounds":30} | 465<br>4960 |
| rounds = 3 | {"rounds":3} | 6<br>10 |
| rounds = 5 | {"rounds":5} | 15<br>35 |
| rounds = 6 | {"rounds":6} | 21<br>56 |
| rounds = 7 | {"rounds":7} | 28<br>84 |
| rounds = 8 | {"rounds":8} | 36<br>120 |
| rounds = 10 | {"rounds":10} | 55<br>220 |
| rounds = 11 | {"rounds":11} | 66<br>286 |
| rounds = 12 | {"rounds":12} | 78<br>364 |
| rounds = 13 | {"rounds":13} | 91<br>455 |
| rounds = 14 | {"rounds":14} | 105<br>560 |
| rounds = 15 | {"rounds":15} | 120<br>680 |
| rounds = 16 | {"rounds":16} | 136<br>816 |
| rounds = 18 | {"rounds":18} | 171<br>1140 |

#### Source requirements

```json
{
  "variables": {
    "rounds": "int",
    "total": "int",
    "readingSum": "int"
  },
  "prints": [
    "total",
    "readingSum"
  ],
  "loops": {
    "for": 1
  },
  "unchanged": [
    "rounds"
  ]
}
```

### Square total

**ID:** `challenge-square-total` · **Version:** 2 · **Unit:** `loops` · **Prerequisites:** `java-declare`, `java-variables`, `java-expressions`, `java-for`, `java-accumulator`

#### Reference solution

```java
public class Student {
    public static void main(String[] args) {
        int rounds = 3;
        int total = 0;
        int net = 0;
        for (int i = 1; i <= rounds; i++) {
            total += i * i;
            net += i * i - i;
        }
        System.out.println(total);
        System.out.println(net);
    }
}
```

#### Cases

| Check | Input / invocation | Expected output |
|---|---|---|
| rounds = 3 | {"rounds":3} | 14<br>8 |
| rounds = 5 | {"rounds":5} | 55<br>40 |
| rounds = 0 | {"rounds":0} | 0<br>0 |
| rounds = 1 | {"rounds":1} | 1<br>0 |
| rounds = 2 | {"rounds":2} | 5<br>2 |
| rounds = 8 | {"rounds":8} | 204<br>168 |
| rounds = 20 | {"rounds":20} | 2870<br>2660 |
| rounds = 4 | {"rounds":4} | 30<br>20 |
| rounds = 6 | {"rounds":6} | 91<br>70 |
| rounds = 7 | {"rounds":7} | 140<br>112 |
| rounds = 9 | {"rounds":9} | 285<br>240 |
| rounds = 10 | {"rounds":10} | 385<br>330 |
| rounds = 11 | {"rounds":11} | 506<br>440 |
| rounds = 12 | {"rounds":12} | 650<br>572 |
| rounds = 13 | {"rounds":13} | 819<br>728 |
| rounds = 14 | {"rounds":14} | 1015<br>910 |
| rounds = 15 | {"rounds":15} | 1240<br>1120 |
| rounds = 16 | {"rounds":16} | 1496<br>1360 |
| rounds = 17 | {"rounds":17} | 1785<br>1632 |
| rounds = 18 | {"rounds":18} | 2109<br>1938 |

#### Source requirements

```json
{
  "variables": {
    "rounds": "int",
    "total": "int",
    "net": "int"
  },
  "prints": [
    "total",
    "net"
  ],
  "loops": {
    "for": 1
  },
  "unchanged": [
    "rounds"
  ]
}
```

### Trip cost

**ID:** `challenge-trip-cost` · **Version:** 2 · **Unit:** `methods` · **Prerequisites:** `java-expressions`, `java-methods`, `java-returns`

#### Reference solution

```java
public class Student {
    public static void main(String[] args) {
        System.out.println(tripCost(4, 3));
        System.out.println(roundTripCost(4, 6, 3));
    }
    public static int tripCost(int tiles, int costPerTile) {
        return tiles * costPerTile;
    }

    public static int roundTripCost(int outboundTiles, int returnTiles, int costPerTile) {
        return tripCost(outboundTiles, costPerTile) + tripCost(returnTiles, costPerTile);
    }
}
```

#### Cases

| Check | Input / invocation | Expected output |
|---|---|---|
| tripCost(4, 3)<br>roundTripCost(4, 6, 3) | main with starting values | 12<br>30 |
| tripCost(4, 3) | System.out.println(Student.tripCost(4, 3)); | 12 |
| tripCost(0, 8) | System.out.println(Student.tripCost(0, 8)); | 0 |
| tripCost(8, 0) | System.out.println(Student.tripCost(8, 0)); | 0 |
| tripCost(1, 1) | System.out.println(Student.tripCost(1, 1)); | 1 |
| tripCost(100, 10) | System.out.println(Student.tripCost(100, 10)); | 1000 |
| tripCost(17, 6) | System.out.println(Student.tripCost(17, 6)); | 102 |
| roundTripCost(4, 6, 3) | System.out.println(Student.roundTripCost(4, 6, 3)); | 30 |
| roundTripCost(0, 5, 8) | System.out.println(Student.roundTripCost(0, 5, 8)); | 40 |
| roundTripCost(5, 0, 8) | System.out.println(Student.roundTripCost(5, 0, 8)); | 40 |
| roundTripCost(0, 0, 0) | System.out.println(Student.roundTripCost(0, 0, 0)); | 0 |
| roundTripCost(100, 100, 10) | System.out.println(Student.roundTripCost(100, 100, 10)); | 2000 |
| roundTripCost(17, 2, 6) | System.out.println(Student.roundTripCost(17, 2, 6)); | 114 |
| tripCost(1, 2) | System.out.println(Student.tripCost(1, 2)); | 2 |
| roundTripCost(1, 9, 2) | System.out.println(Student.roundTripCost(1, 9, 2)); | 20 |
| tripCost(11, 0) | System.out.println(Student.tripCost(11, 0)); | 0 |
| roundTripCost(11, 7, 0) | System.out.println(Student.roundTripCost(11, 7, 0)); | 0 |
| tripCost(100, 10) | System.out.println(Student.tripCost(100, 10)); | 1000 |
| roundTripCost(100, 100, 10) | System.out.println(Student.roundTripCost(100, 100, 10)); | 2000 |
| tripCost(38, 4) | System.out.println(Student.tripCost(38, 4)); | 152 |
| roundTripCost(38, 17, 4) | System.out.println(Student.roundTripCost(38, 17, 4)); | 220 |

#### Source requirements

```json
{
  "methods": [
    {
      "name": "tripCost",
      "returns": "int",
      "parameters": [
        "int",
        "int"
      ],
      "used": true
    },
    {
      "name": "roundTripCost",
      "returns": "int",
      "parameters": [
        "int",
        "int",
        "int"
      ],
      "used": true
    }
  ]
}
```

### Match score

**ID:** `challenge-match-score` · **Version:** 2 · **Unit:** `methods` · **Prerequisites:** `java-expressions`, `java-for`, `java-accumulator`, `java-methods`, `java-returns`

#### Reference solution

```java
public class Student {
    public static void main(String[] args) {
        System.out.println(matchScore(3, 5));
        System.out.println(rematchScore(3, 5));
    }
    public static int roundPoints(int round) {
        return 3 * round;
    }

    public static int matchScore(int rounds, int bonus) {
        int total = 0;
        for (int round = 1; round <= rounds; round++) {
            total += roundPoints(round);
        }
        return total + bonus;
    }

    public static int rematchScore(int rounds, int bonus) {
        return matchScore(rounds, bonus) + matchScore(rounds + 1, 0);
    }
}
```

#### Cases

| Check | Input / invocation | Expected output |
|---|---|---|
| matchScore(3, 5)<br>rematchScore(3, 5) | main with starting values | 23<br>53 |
| roundPoints(0) | System.out.println(Student.roundPoints(0)); | 0 |
| roundPoints(1) | System.out.println(Student.roundPoints(1)); | 3 |
| roundPoints(7) | System.out.println(Student.roundPoints(7)); | 21 |
| roundPoints(21) | System.out.println(Student.roundPoints(21)); | 63 |
| matchScore(3, 5) | System.out.println(Student.matchScore(3, 5)); | 23 |
| matchScore(0, 7) | System.out.println(Student.matchScore(0, 7)); | 7 |
| matchScore(0, 0) | System.out.println(Student.matchScore(0, 0)); | 0 |
| matchScore(1, 0) | System.out.println(Student.matchScore(1, 0)); | 3 |
| matchScore(21, 100) | System.out.println(Student.matchScore(21, 100)); | 793 |
| matchScore(6, 13) | System.out.println(Student.matchScore(6, 13)); | 76 |
| rematchScore(3, 5) | System.out.println(Student.rematchScore(3, 5)); | 53 |
| rematchScore(0, 7) | System.out.println(Student.rematchScore(0, 7)); | 10 |
| rematchScore(0, 0) | System.out.println(Student.rematchScore(0, 0)); | 3 |
| rematchScore(1, 0) | System.out.println(Student.rematchScore(1, 0)); | 12 |
| rematchScore(20, 100) | System.out.println(Student.rematchScore(20, 100)); | 1423 |
| rematchScore(6, 13) | System.out.println(Student.rematchScore(6, 13)); | 160 |
| matchScore(2, 11) | System.out.println(Student.matchScore(2, 11)); | 20 |
| rematchScore(2, 11) | System.out.println(Student.rematchScore(2, 11)); | 38 |
| matchScore(8, 0) | System.out.println(Student.matchScore(8, 0)); | 108 |
| rematchScore(8, 0) | System.out.println(Student.rematchScore(8, 0)); | 243 |
| matchScore(17, 30) | System.out.println(Student.matchScore(17, 30)); | 489 |
| rematchScore(17, 30) | System.out.println(Student.rematchScore(17, 30)); | 1002 |

#### Source requirements

```json
{
  "methods": [
    {
      "name": "roundPoints",
      "returns": "int",
      "parameters": [
        "int"
      ],
      "used": true
    },
    {
      "name": "matchScore",
      "returns": "int",
      "parameters": [
        "int",
        "int"
      ],
      "used": true
    },
    {
      "name": "rematchScore",
      "returns": "int",
      "parameters": [
        "int",
        "int"
      ],
      "used": true
    }
  ],
  "loops": {
    "for": 1
  },
  "scope": "matchScore"
}
```

### Battery signal

**ID:** `challenge-battery-signal` · **Version:** 2 · **Unit:** `decisions` · **Prerequisites:** `java-variables`, `java-expressions`, `java-conditionals`, `java-scanner`

#### Reference solution

```java
import java.util.Scanner;

public class Student {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);
        int battery = input.nextInt();
        int needed = 0;
        if (battery < 20) {
            System.out.println("CHARGE");
        } else if (battery < 80) {
            System.out.println("READY");
        } else {
            System.out.println("FULL");
        }
        if (battery < 80) {
            needed = 80 - battery;
        }
        System.out.println(needed);
    }
}
```

#### Cases

| Check | Input / invocation | Expected output |
|---|---|---|
| Input: 19 | 19 | CHARGE<br>61 |
| Input: 80 | 80 | FULL<br>0 |
| Input: 0 | 0 | CHARGE<br>80 |
| Input: 20 | 20 | READY<br>60 |
| Input: 79 | 79 | READY<br>1 |
| Input: 100 | 100 | FULL<br>0 |
| Input: 1 | 1 | CHARGE<br>79 |
| Input: 54 | 54 | READY<br>26 |
| Input: 99 | 99 | FULL<br>0 |
| Input: 2 | 2 | CHARGE<br>78 |
| Input: 10 | 10 | CHARGE<br>70 |
| Input: 18 | 18 | CHARGE<br>62 |
| Input: 21 | 21 | READY<br>59 |
| Input: 30 | 30 | READY<br>50 |
| Input: 40 | 40 | READY<br>40 |
| Input: 60 | 60 | READY<br>20 |
| Input: 70 | 70 | READY<br>10 |
| Input: 78 | 78 | READY<br>2 |
| Input: 81 | 81 | FULL<br>0 |
| Input: 90 | 90 | FULL<br>0 |

#### Source requirements

```json
{
  "variables": {
    "battery": "int",
    "needed": "int"
  },
  "calls": [
    "nextInt"
  ],
  "prints": [
    "needed"
  ]
}
```

### Charge time

**ID:** `challenge-charge-time` · **Version:** 2 · **Unit:** `decisions` · **Prerequisites:** `java-variables`, `java-conditionals`, `java-while`, `java-scanner`

#### Reference solution

```java
import java.util.Scanner;

public class Student {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);
        int charge = input.nextInt();
        int target = input.nextInt();
        int perMinute = input.nextInt();
        int minutes = 0;
        while (charge < target) {
            charge += perMinute;
            minutes++;
        }
        System.out.println(minutes);
        System.out.println(charge);
    }
}
```

#### Cases

| Check | Input / invocation | Expected output |
|---|---|---|
| Input: 10 25 6 | 10 25 6 | 3<br>28 |
| Input: 80 60 4 | 80 60 4 | 0<br>80 |
| Input: 0 0 1 | 0 0 1 | 0<br>0 |
| Input: 0 100 1 | 0 100 1 | 100<br>100 |
| Input: 19 20 20 | 19 20 20 | 1<br>39 |
| Input: 20 80 10 | 20 80 10 | 6<br>80 |
| Input: 4 100 13 | 4 100 13 | 8<br>108 |
| Input: 99 100 20 | 99 100 20 | 1<br>119 |
| Input: 0 100 1 | 0 100 1 | 100<br>100 |
| Input: 7 97 2 | 7 97 2 | 45<br>97 |
| Input: 14 94 3 | 14 94 3 | 27<br>95 |
| Input: 21 91 4 | 21 91 4 | 18<br>93 |
| Input: 28 88 5 | 28 88 5 | 12<br>88 |
| Input: 35 85 6 | 35 85 6 | 9<br>89 |
| Input: 42 82 7 | 42 82 7 | 6<br>84 |
| Input: 49 79 8 | 49 79 8 | 4<br>81 |
| Input: 56 76 9 | 56 76 9 | 3<br>83 |
| Input: 63 73 10 | 63 73 10 | 1<br>73 |
| Input: 70 70 11 | 70 70 11 | 0<br>70 |
| Input: 77 67 12 | 77 67 12 | 0<br>77 |

#### Source requirements

```json
{
  "variables": {
    "charge": "int",
    "target": "int",
    "perMinute": "int",
    "minutes": "int"
  },
  "loops": {
    "while": 1
  },
  "calls": [
    "nextInt"
  ],
  "prints": [
    "minutes",
    "charge"
  ]
}
```

### Positive gains

**ID:** `challenge-positive-gains` · **Version:** 2 · **Unit:** `arrays` · **Prerequisites:** `java-for`, `java-accumulator`, `java-methods`, `java-returns`, `java-conditionals`, `java-arrays`

#### Reference solution

```java
public class Student {
    public static void main(String[] args) {
        int[] gains = {4, -2, 0, 7};
        System.out.println(positiveTotal(gains));
        System.out.println(positiveCount(gains));
    }
    public static int positiveTotal(int[] gains) {
        int total = 0;
        for (int i = 0; i < gains.length; i++) {
            if (gains[i] > 0) {
                total += gains[i];
            }
        }
        return total;
    }

    public static int positiveCount(int[] gains) {
        int count = 0;
        for (int i = 0; i < gains.length; i++) {
            if (gains[i] > 0) {
                count++;
            }
        }
        return count;
    }
}
```

#### Cases

| Check | Input / invocation | Expected output |
|---|---|---|
| gains = {4, -2, 0, 7} | main with starting values | 11<br>2 |
| positiveTotal([4, -2, 0, 7]) | System.out.println(Student.positiveTotal(new int[] {4, -2, 0, 7})); | 11 |
| positiveTotal([4, -2, 0, 7]): array unchanged | int[] values = {4, -2, 0, 7}; Student.positiveTotal(values); System.out.println(java.util.Arrays.toString(values)); | [4, -2, 0, 7] |
| positiveCount([4, -2, 0, 7]) | System.out.println(Student.positiveCount(new int[] {4, -2, 0, 7})); | 2 |
| positiveCount([4, -2, 0, 7]): array unchanged | int[] values = {4, -2, 0, 7}; Student.positiveCount(values); System.out.println(java.util.Arrays.toString(values)); | [4, -2, 0, 7] |
| positiveTotal([-5, -1]) | System.out.println(Student.positiveTotal(new int[] {-5, -1})); | 0 |
| positiveTotal([-5, -1]): array unchanged | int[] values = {-5, -1}; Student.positiveTotal(values); System.out.println(java.util.Arrays.toString(values)); | [-5, -1] |
| positiveCount([-5, -1]) | System.out.println(Student.positiveCount(new int[] {-5, -1})); | 0 |
| positiveCount([-5, -1]): array unchanged | int[] values = {-5, -1}; Student.positiveCount(values); System.out.println(java.util.Arrays.toString(values)); | [-5, -1] |
| positiveTotal([]) | System.out.println(Student.positiveTotal(new int[] {})); | 0 |
| positiveTotal([]): array unchanged | int[] values = {}; Student.positiveTotal(values); System.out.println(java.util.Arrays.toString(values)); | [] |
| positiveCount([]) | System.out.println(Student.positiveCount(new int[] {})); | 0 |
| positiveCount([]): array unchanged | int[] values = {}; Student.positiveCount(values); System.out.println(java.util.Arrays.toString(values)); | [] |
| positiveTotal([0]) | System.out.println(Student.positiveTotal(new int[] {0})); | 0 |
| positiveTotal([0]): array unchanged | int[] values = {0}; Student.positiveTotal(values); System.out.println(java.util.Arrays.toString(values)); | [0] |
| positiveCount([0]) | System.out.println(Student.positiveCount(new int[] {0})); | 0 |
| positiveCount([0]): array unchanged | int[] values = {0}; Student.positiveCount(values); System.out.println(java.util.Arrays.toString(values)); | [0] |
| positiveTotal([20]) | System.out.println(Student.positiveTotal(new int[] {20})); | 20 |
| positiveTotal([20]): array unchanged | int[] values = {20}; Student.positiveTotal(values); System.out.println(java.util.Arrays.toString(values)); | [20] |
| positiveCount([20]) | System.out.println(Student.positiveCount(new int[] {20})); | 1 |
| positiveCount([20]): array unchanged | int[] values = {20}; Student.positiveCount(values); System.out.println(java.util.Arrays.toString(values)); | [20] |
| positiveTotal([-20]) | System.out.println(Student.positiveTotal(new int[] {-20})); | 0 |
| positiveTotal([-20]): array unchanged | int[] values = {-20}; Student.positiveTotal(values); System.out.println(java.util.Arrays.toString(values)); | [-20] |
| positiveCount([-20]) | System.out.println(Student.positiveCount(new int[] {-20})); | 0 |
| positiveCount([-20]): array unchanged | int[] values = {-20}; Student.positiveCount(values); System.out.println(java.util.Arrays.toString(values)); | [-20] |
| positiveTotal([20, 20, 20, 20, 20, 20, 20, 20]) | System.out.println(Student.positiveTotal(new int[] {20, 20, 20, 20, 20, 20, 20, 20})); | 160 |
| positiveTotal([20, 20, 20, 20, 20, 20, 20, 20]): array unchanged | int[] values = {20, 20, 20, 20, 20, 20, 20, 20}; Student.positiveTotal(values); System.out.println(java.util.Arrays.toString(values)); | [20, 20, 20, 20, 20, 20, 20, 20] |
| positiveCount([20, 20, 20, 20, 20, 20, 20, 20]) | System.out.println(Student.positiveCount(new int[] {20, 20, 20, 20, 20, 20, 20, 20})); | 8 |
| positiveCount([20, 20, 20, 20, 20, 20, 20, 20]): array unchanged | int[] values = {20, 20, 20, 20, 20, 20, 20, 20}; Student.positiveCount(values); System.out.println(java.util.Arrays.toString(values)); | [20, 20, 20, 20, 20, 20, 20, 20] |
| positiveTotal([-8, 3, 1, -2, 9]) | System.out.println(Student.positiveTotal(new int[] {-8, 3, 1, -2, 9})); | 13 |
| positiveTotal([-8, 3, 1, -2, 9]): array unchanged | int[] values = {-8, 3, 1, -2, 9}; Student.positiveTotal(values); System.out.println(java.util.Arrays.toString(values)); | [-8, 3, 1, -2, 9] |
| positiveCount([-8, 3, 1, -2, 9]) | System.out.println(Student.positiveCount(new int[] {-8, 3, 1, -2, 9})); | 3 |
| positiveCount([-8, 3, 1, -2, 9]): array unchanged | int[] values = {-8, 3, 1, -2, 9}; Student.positiveCount(values); System.out.println(java.util.Arrays.toString(values)); | [-8, 3, 1, -2, 9] |

#### Source requirements

```json
{
  "methods": [
    {
      "name": "positiveTotal",
      "returns": "int",
      "parameters": [
        "int[]"
      ],
      "used": true
    },
    {
      "name": "positiveCount",
      "returns": "int",
      "parameters": [
        "int[]"
      ],
      "used": true
    }
  ],
  "loops": {
    "for": 1
  },
  "scope": "positiveTotal"
}
```

### Count matches

**ID:** `challenge-count-matches` · **Version:** 2 · **Unit:** `arrays` · **Prerequisites:** `java-for`, `java-accumulator`, `java-methods`, `java-returns`, `java-conditionals`, `java-arrays`

#### Reference solution

```java
public class Student {
    public static void main(String[] args) {
        int[] readings = {3, 1, 3, 3};
        System.out.println(countMatches(readings, 3));
        System.out.println(firstMatch(readings, 3));
    }
    public static int countMatches(int[] readings, int target) {
        int count = 0;
        for (int i = 0; i < readings.length; i++) {
            if (readings[i] == target) {
                count++;
            }
        }
        return count;
    }

    public static int firstMatch(int[] readings, int target) {
        int first = -1;
        for (int i = 0; i < readings.length; i++) {
            if (readings[i] == target && first == -1) {
                first = i;
            }
        }
        return first;
    }
}
```

#### Cases

| Check | Input / invocation | Expected output |
|---|---|---|
| readings = {3, 1, 3, 3}, target = 3 | main with starting values | 3<br>0 |
| countMatches([3, 1, 3, 3], 3) | System.out.println(Student.countMatches(new int[] {3, 1, 3, 3}, 3)); | 3 |
| countMatches([3, 1, 3, 3], 3): array unchanged | int[] values = {3, 1, 3, 3}; Student.countMatches(values, 3); System.out.println(java.util.Arrays.toString(values)); | [3, 1, 3, 3] |
| firstMatch([3, 1, 3, 3], 3) | System.out.println(Student.firstMatch(new int[] {3, 1, 3, 3}, 3)); | 0 |
| firstMatch([3, 1, 3, 3], 3): array unchanged | int[] values = {3, 1, 3, 3}; Student.firstMatch(values, 3); System.out.println(java.util.Arrays.toString(values)); | [3, 1, 3, 3] |
| countMatches([2, 4, 6], 5) | System.out.println(Student.countMatches(new int[] {2, 4, 6}, 5)); | 0 |
| countMatches([2, 4, 6], 5): array unchanged | int[] values = {2, 4, 6}; Student.countMatches(values, 5); System.out.println(java.util.Arrays.toString(values)); | [2, 4, 6] |
| firstMatch([2, 4, 6], 5) | System.out.println(Student.firstMatch(new int[] {2, 4, 6}, 5)); | -1 |
| firstMatch([2, 4, 6], 5): array unchanged | int[] values = {2, 4, 6}; Student.firstMatch(values, 5); System.out.println(java.util.Arrays.toString(values)); | [2, 4, 6] |
| countMatches([], 0) | System.out.println(Student.countMatches(new int[] {}, 0)); | 0 |
| countMatches([], 0): array unchanged | int[] values = {}; Student.countMatches(values, 0); System.out.println(java.util.Arrays.toString(values)); | [] |
| firstMatch([], 0) | System.out.println(Student.firstMatch(new int[] {}, 0)); | -1 |
| firstMatch([], 0): array unchanged | int[] values = {}; Student.firstMatch(values, 0); System.out.println(java.util.Arrays.toString(values)); | [] |
| countMatches([0], 0) | System.out.println(Student.countMatches(new int[] {0}, 0)); | 1 |
| countMatches([0], 0): array unchanged | int[] values = {0}; Student.countMatches(values, 0); System.out.println(java.util.Arrays.toString(values)); | [0] |
| firstMatch([0], 0) | System.out.println(Student.firstMatch(new int[] {0}, 0)); | 0 |
| firstMatch([0], 0): array unchanged | int[] values = {0}; Student.firstMatch(values, 0); System.out.println(java.util.Arrays.toString(values)); | [0] |
| countMatches([-10, 0, -10], -10) | System.out.println(Student.countMatches(new int[] {-10, 0, -10}, -10)); | 2 |
| countMatches([-10, 0, -10], -10): array unchanged | int[] values = {-10, 0, -10}; Student.countMatches(values, -10); System.out.println(java.util.Arrays.toString(values)); | [-10, 0, -10] |
| firstMatch([-10, 0, -10], -10) | System.out.println(Student.firstMatch(new int[] {-10, 0, -10}, -10)); | 0 |
| firstMatch([-10, 0, -10], -10): array unchanged | int[] values = {-10, 0, -10}; Student.firstMatch(values, -10); System.out.println(java.util.Arrays.toString(values)); | [-10, 0, -10] |
| countMatches([10, 10, 10, 10, 10, 10, 10, 10], 10) | System.out.println(Student.countMatches(new int[] {10, 10, 10, 10, 10, 10, 10, 10}, 10)); | 8 |
| countMatches([10, 10, 10, 10, 10, 10, 10, 10], 10): array unchanged | int[] values = {10, 10, 10, 10, 10, 10, 10, 10}; Student.countMatches(values, 10); System.out.println(java.util.Arrays.toString(values)); | [10, 10, 10, 10, 10, 10, 10, 10] |
| firstMatch([10, 10, 10, 10, 10, 10, 10, 10], 10) | System.out.println(Student.firstMatch(new int[] {10, 10, 10, 10, 10, 10, 10, 10}, 10)); | 0 |
| firstMatch([10, 10, 10, 10, 10, 10, 10, 10], 10): array unchanged | int[] values = {10, 10, 10, 10, 10, 10, 10, 10}; Student.firstMatch(values, 10); System.out.println(java.util.Arrays.toString(values)); | [10, 10, 10, 10, 10, 10, 10, 10] |
| countMatches([1, 2, 3, 4], 4) | System.out.println(Student.countMatches(new int[] {1, 2, 3, 4}, 4)); | 1 |
| countMatches([1, 2, 3, 4], 4): array unchanged | int[] values = {1, 2, 3, 4}; Student.countMatches(values, 4); System.out.println(java.util.Arrays.toString(values)); | [1, 2, 3, 4] |
| firstMatch([1, 2, 3, 4], 4) | System.out.println(Student.firstMatch(new int[] {1, 2, 3, 4}, 4)); | 3 |
| firstMatch([1, 2, 3, 4], 4): array unchanged | int[] values = {1, 2, 3, 4}; Student.firstMatch(values, 4); System.out.println(java.util.Arrays.toString(values)); | [1, 2, 3, 4] |
| countMatches([2, 3, 3, 4], 3) | System.out.println(Student.countMatches(new int[] {2, 3, 3, 4}, 3)); | 2 |
| countMatches([2, 3, 3, 4], 3): array unchanged | int[] values = {2, 3, 3, 4}; Student.countMatches(values, 3); System.out.println(java.util.Arrays.toString(values)); | [2, 3, 3, 4] |
| firstMatch([2, 3, 3, 4], 3) | System.out.println(Student.firstMatch(new int[] {2, 3, 3, 4}, 3)); | 1 |
| firstMatch([2, 3, 3, 4], 3): array unchanged | int[] values = {2, 3, 3, 4}; Student.firstMatch(values, 3); System.out.println(java.util.Arrays.toString(values)); | [2, 3, 3, 4] |

#### Source requirements

```json
{
  "methods": [
    {
      "name": "countMatches",
      "returns": "int",
      "parameters": [
        "int[]",
        "int"
      ],
      "used": true
    },
    {
      "name": "firstMatch",
      "returns": "int",
      "parameters": [
        "int[]",
        "int"
      ],
      "used": true
    }
  ],
  "loops": {
    "for": 1
  },
  "scope": "countMatches"
}
```

## Complete student problem set

## Battery budget

Start with Java · 10–15 min

Pip starts with `energy` units. Each of `moves` moves costs `costPerMove` units. Calculate both the energy spent and the energy left. Print line 1: `spent`. Print line 2: `remaining`. Keep all three starting variables unchanged.

### Limits

- `energy`: 0–200; `moves`: 0–20; `costPerMove`: 0–10.
- The total cost never exceeds `energy`. Keep the variable names and starting values. Checks supply different values.

### Examples

| Starting values or input | Output / returned value |
|---|---|
| energy = 50, moves = 6, costPerMove = 3 | 18<br>32 |
| energy = 24, moves = 8, costPerMove = 3 | 24<br>0 |

### Before starting

- Bring the console online
- Build a first variable
- Choose a box for a decimal
- Count the spare parts
- Read the battery fraction

### Starter

```java
public class Student {
    public static void main(String[] args) {
        int energy = 50;
        int moves = 6;
        int costPerMove = 3;
        int spent = 0;
        int remaining = 0;

        System.out.println(spent);
        System.out.println(remaining);
    }
}
```

## Prize tokens

Start with Java · 10–15 min

A token costs `pointsPerToken` points. Buy as many whole tokens as `score` allows, then calculate the unused points. Print line 1: `tokens`. Print line 2: `leftover`. Partial tokens cannot be bought. Keep both starting variables unchanged.

### Limits

- `score`: 0–500; `pointsPerToken`: 1–50.
- Keep the variable names and starting values. Checks supply different values.

### Examples

| Starting values or input | Output / returned value |
|---|---|
| score = 29, pointsPerToken = 6 | 4<br>5 |
| score = 5, pointsPerToken = 8 | 0<br>5 |

### Before starting

- Bring the console online
- Build a first variable
- Choose a box for a decimal
- Count the spare parts
- Read the battery fraction

### Starter

```java
public class Student {
    public static void main(String[] args) {
        int score = 29;
        int pointsPerToken = 6;
        int tokens = 0;
        int leftover = 0;

        System.out.println(tokens);
        System.out.println(leftover);
    }
}
```

## Round points

Make work repeat · 15–20 min

Round 1 earns 1 point, round 2 earns 2 points, and so on through `rounds`. The scoreboard shows all points earned so far after each round. Use a `for` loop to calculate both results. Print line 1: final score in `total`. Print line 2: total of the scores shown after every round in `readingSum`. Zero rounds gives two zeros. Keep `rounds` unchanged.

### Limits

- `rounds`: 0–30.
- Keep the variable name and starting value. Checks supply different values.

### Examples

| Starting values or input | Output / returned value |
|---|---|
| rounds = 4 | 10<br>20 |
| rounds = 2 | 3<br>4 |

### Before starting

- Build a first variable
- Count the spare parts
- Read the battery fraction
- Schedule repeated scans
- Total the charging cycles

### Starter

```java
public class Student {
    public static void main(String[] args) {
        int rounds = 4;
        int total = 0;
        int readingSum = 0;

        System.out.println(total);
        System.out.println(readingSum);
    }
}
```

## Square total

Make work repeat · 15–20 min

Round `i` earns `i * i` points and costs `i` points to enter. Play rounds 1 through `rounds`. Use a `for` loop to calculate both results. Print line 1: all earned points in `total`. Print line 2: points left after all entry costs in `net`. Zero rounds gives two zeros. Keep `rounds` unchanged.

### Limits

- `rounds`: 0–20.
- Keep the variable name and starting value. Checks supply different values.

### Examples

| Starting values or input | Output / returned value |
|---|---|
| rounds = 3 | 14<br>8 |
| rounds = 5 | 55<br>40 |

### Before starting

- Build a first variable
- Count the spare parts
- Read the battery fraction
- Schedule repeated scans
- Total the charging cycles

### Starter

```java
public class Student {
    public static void main(String[] args) {
        int rounds = 3;
        int total = 0;
        int net = 0;

        System.out.println(total);
        System.out.println(net);
    }
}
```

## Trip cost

Build reusable actions · 10–20 min

Complete both methods. A trip covers `tiles` tiles, and each tile costs `costPerTile` energy. `tripCost(tiles, costPerTile)` returns the energy for that trip. `roundTripCost(outboundTiles, returnTiles, costPerTile)` calls `tripCost` once for the trip out and once for the trip back and returns their combined cost. Both return `int` values without printing. Keep `main`: line 1 prints the one-way example; line 2 prints the round-trip example.

### Limits

- `tiles`, `outboundTiles`, and `returnTiles`: 0–100; `costPerTile`: 0–10.
- Keep each method’s name, return type, and parameters as shown in the starter. Checks call both methods separately.

### Examples

| Starting values or input | Output / returned value |
|---|---|
| tripCost(4, 3)<br>roundTripCost(4, 6, 3) | 12<br>30 |
| tripCost(0, 8)<br>roundTripCost(0, 5, 8) | 0<br>40 |

### Before starting

- Read the battery fraction
- Name a repeated task
- Return the travel distance

### Starter

```java
public class Student {
    public static void main(String[] args) {
        System.out.println(tripCost(4, 3));
        System.out.println(roundTripCost(4, 6, 3));
    }
    public static int tripCost(int tiles, int costPerTile) {
        return 0;
    }

    public static int roundTripCost(int outboundTiles, int returnTiles, int costPerTile) {
        return 0;
    }
}
```

## Match score

Build reusable actions · 15–20 min

`roundPoints(round)` returns 3 times `round`. `matchScore(rounds, bonus)` uses a `for` loop and `roundPoints` to total rounds 1 through `rounds`, then adds `bonus` once. Add `rematchScore(rounds, bonus)`: use `matchScore` to combine that match with a second match of `rounds + 1` rounds and no bonus. Methods return without printing. Keep `main`: line 1 prints the match; line 2 prints the combined score.

### Limits

- For `roundPoints`, `round` is 0–21. For `matchScore`, `rounds` is 0–21.
- For `rematchScore`, `rounds` is 0–20. `bonus` is 0–100. Zero rounds in one match earns only its bonus.
- Keep each method’s name, return type, and parameters as shown in the starter. Checks call all three methods separately.

### Examples

| Starting values or input | Output / returned value |
|---|---|
| matchScore(3, 5)<br>rematchScore(3, 5) | 23<br>53 |
| matchScore(0, 7)<br>rematchScore(0, 7) | 7<br>10 |

### Before starting

- Read the battery fraction
- Schedule repeated scans
- Total the charging cycles
- Name a repeated task
- Return the travel distance

### Starter

```java
public class Student {
    public static void main(String[] args) {
        System.out.println(matchScore(3, 5));
        System.out.println(rematchScore(3, 5));
    }
    public static int roundPoints(int round) {
        return 0;
    }

    public static int matchScore(int rounds, int bonus) {
        return 0;
    }

    public static int rematchScore(int rounds, int bonus) {
        return 0;
    }
}
```

## Battery signal

Respond to the world · 10–15 min

Read one battery percentage. Print line 1: `CHARGE` below 20, `READY` from 20 through 79, or `FULL` from 80 through 100. Print line 2: how many percentage points are needed to reach 80. If the battery is already at 80 or more, print 0 on line 2.

### Limits

- One integer from 0 through 100.

### Examples

| Starting values or input | Output / returned value |
|---|---|
| 19 | CHARGE<br>61 |
| 80 | FULL<br>0 |

### Before starting

- Count the spare parts
- Read the battery fraction
- Choose a battery warning
- Read a mission request

### Starter

```java
import java.util.Scanner;

public class Student {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);
        int battery = input.nextInt();
        int needed = 0;

        System.out.println("CHARGE");
        System.out.println(needed);
    }
}
```

## Charge time

Respond to the world · 10–20 min

Read `charge`, `target`, and `perMinute`, in that order. Each full minute adds `perMinute` to the charge. Use a `while` loop to charge until the target is reached or passed. Print line 1: `minutes`. Print line 2: the final `charge`. If the target is already reached, no charging takes place. Do not reduce a charge that passes the target.

### Limits

- `charge` and `target`: 0–100; `perMinute`: 1–20.
- Input contains three integers separated by spaces. The final charge may exceed 100.

### Examples

| Starting values or input | Output / returned value |
|---|---|
| 10 25 6 | 3<br>28 |
| 80 60 4 | 0<br>80 |

### Before starting

- Count the spare parts
- Choose a battery warning
- Count down to launch
- Read a mission request

### Starter

```java
import java.util.Scanner;

public class Student {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);
        int charge = input.nextInt();
        int target = input.nextInt();
        int perMinute = input.nextInt();
        int minutes = 0;

        System.out.println(minutes);
        System.out.println(charge);
    }
}
```

## Positive gains

Work with collections of data · 15–20 min

Complete two methods using `for` loops. `positiveTotal(int[] gains)` returns the sum of values greater than 0. `positiveCount(int[] gains)` returns how many values are greater than 0. Ignore zero and negative values; both return 0 for an empty array. Leave the array unchanged and do not print inside either method. Keep `main`: line 1 prints the total; line 2 prints the count.

### Limits

- `gains` contains 0–8 whole numbers. Each value is from -20 through 20.
- Keep each method’s name, return type, and parameters as shown in the starter. Checks call both methods directly.

### Examples

| Starting values or input | Output / returned value |
|---|---|
| gains = {4, -2, 0, 7} | 11<br>2 |
| gains = {-5, -1} | 0<br>0 |

### Before starting

- Schedule repeated scans
- Total the charging cycles
- Name a repeated task
- Return the travel distance
- Choose a battery warning
- Store sensor samples

### Starter

```java
public class Student {
    public static void main(String[] args) {
        int[] gains = {4, -2, 0, 7};
        System.out.println(positiveTotal(gains));
        System.out.println(positiveCount(gains));
    }
    public static int positiveTotal(int[] gains) {
        return 0;
    }

    public static int positiveCount(int[] gains) {
        return 0;
    }
}
```

## Count matches

Work with collections of data · 15–20 min

Complete two methods using `for` loops. `countMatches(int[] readings, int target)` returns how many values equal `target`. `firstMatch(int[] readings, int target)` returns the first matching index, or -1 when there is no match. Indexes start at 0. An empty array has count 0 and first index -1. Leave the array unchanged and do not print inside either method. Keep `main`: line 1 prints the count; line 2 prints the first index.

### Limits

- `readings` contains 0–8 whole numbers. Every value and `target` are from -10 through 10.
- Keep each method’s name, return type, and parameters as shown in the starter. Checks call both methods directly.

### Examples

| Starting values or input | Output / returned value |
|---|---|
| readings = {3, 1, 3, 3}, target = 3 | 3<br>0 |
| readings = {2, 4, 6}, target = 5 | 0<br>-1 |

### Before starting

- Schedule repeated scans
- Total the charging cycles
- Name a repeated task
- Return the travel distance
- Choose a battery warning
- Store sensor samples

### Starter

```java
public class Student {
    public static void main(String[] args) {
        int[] readings = {3, 1, 3, 3};
        System.out.println(countMatches(readings, 3));
        System.out.println(firstMatch(readings, 3));
    }
    public static int countMatches(int[] readings, int target) {
        return 0;
    }

    public static int firstMatch(int[] readings, int target) {
        return -1;
    }
}
```
