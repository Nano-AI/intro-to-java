# Independent challenges

Two independent challenges per module. Each combines two results or related methods using topics already introduced. Allow about 10–20 minutes each.

Write the code independently. Syntax highlighting and compiler errors remain available; hints, solution insertion and autocomplete are disabled. Run checks three visible examples and shows their input and output. It does not complete the challenge. Submit checks at least 20 cases, including different inputs and boundaries. A challenge unlocks after its required coding practices pass.

For changed-variable problems, keep the supplied input declarations and values. Submit varies them in temporary copies. Your saved Java is not replaced.

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
