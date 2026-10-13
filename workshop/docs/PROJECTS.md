# Java robotics homework projects

Pip Workshop 0.9.0 · Tauri desktop app

Supply Relay takes about 30–60 minutes. Plan for two or three sessions of 45–60 minutes for each later project. These are planning estimates. Answer the code refresher on its own screen before opening the project. In the workspace, use the current task beside the world, open Checklist for steps, and open Commands for Java examples. Save between sessions.

Open **Projects** in the app. Each project lists its required lessons. Complete their coding checks to unlock it. Runs check off steps they can verify. Mark planning steps yourself. The checklist does not replace the final code checks.

**Run** checks three visible examples and shows their inputs and output without awarding completion. **Submit** checks 20 worlds and the required Java constructs for each homework project. Short games check 20 worlds per tier, up to 40. Test values change in temporary copies; the saved Java file stays intact. Modules 1–3 need no input reading, sensors, arrays, conditions, or while loops. Module 4 adds supplied Scanner input, conditions, and a while loop; Module 5 adds a 2D array and array parameters. Input is supplied automatically, never typed interactively during a run. Custom input changes the data only, not the pictured board.

## 1. Supply Relay

**Module:** basics · **Estimated work:** 30–60 minutes · 1 session

**Required lessons:** Bring the console online; Build a first variable; Choose a box for a decimal; Count the spare parts; Read the battery fraction; Decode the robot label.

**Topics:** Variables and assignment; Arithmetic and precedence; Strings and concatenation; Ordered instructions.

Pick up one supply, deliver it, and calculate the energy left.

### Mission

Deliver the one supply and finish at the delivery tile facing north. Calculate `travel` from `gap` and remaining energy from the supplied values. Print `Delivered 1 part; energy N` with `remaining` in place of `N`. Use ordinary statements.

Pip starts at (1, 3), facing east. One supply is `gap` tiles east. Pick it up, turn north, and move one tile. The depot is directly ahead: drop the supply there and finish facing north. Coordinates start at zero; north decreases the row number.

Print commands to control Pip. `System.out.println("move " + gap);` moves `gap` tiles. `System.out.println("pick up");` collects the supply on the current tile. `System.out.println("turn left");` faces north from east. `System.out.println("move");` moves one tile. `System.out.println("drop");` delivers the held supply to the depot directly ahead. Other printed text is speech.

The supplied lines for `gap`, `energy`, and `costPerTile` stay locked. Use their values in your commands and calculations. The supplied `final` keyword keeps each input unchanged while the program runs. Create `travel` and `remaining` for your results. Turns, pickup, delivery, and speech cost zero energy.

Example 1 uses `gap = 2`, `energy = 50`, and `costPerTile = 2`: travel is 3 tiles, so 44 energy remains. Submit supplies `gap` from 1 to 6, `energy` from 60 to 140, and `costPerTile` from 1 to 3, with a matching board. Those values change automatically in temporary copies; the saved Java stays unchanged.

### Sample map

```text
     0  1  2  3  4
 0   .  .  .  .  .
 1   .  .  .  D  .
 2   .  .  .  F  .
 3   .  >  .  *  .
 4   .  .  .  .  .
```

Arrow = Pip; * = supply; D = depot; # = blue target; Y = yellow target; X = wall; H = hurdle; F = finish. Coordinates start at zero. The arrow may cover a home/target tile.

### Commands

Each command below is a real Java statement. In the editor, type `pip` to see game snippets or press Ctrl+Space. These snippet labels are shortcuts, not Java methods.


```java
System.out.println("move 3");
```

Move forward by a positive whole number of tiles. A wall, obstacle or character stops the run.


```java
System.out.println("turn left");
```

Turn left by 90 degrees without moving.


```java
System.out.println("turn right");
```

Turn right by 90 degrees without moving.


```java
System.out.println("pick up");
```

Pick up one item on the tile where Pip is standing.


```java
System.out.println("drop");
```

Place the most recently collected item on the tile directly ahead, or give it to a customer there who accepts it.


```java
System.out.println("Hello, Arena!");
```

Say the printed text. A character responds only when standing on the tile directly ahead. Match a greeting or password exactly.

### Code refresher

Predict each answer before writing the project.

**1. What does this print?**

```java
int supplies = 8;
int delivered = 3;
supplies = supplies - delivered;
System.out.println("Left: " + supplies);
```

- **A.** Left: 5
- **B.** Left: 8
- **C.** Left: supplies

**2. How much energy remains?**

```java
int energy = 30;
int tiles = 4;
int cost = 3;
int remaining = energy - tiles * cost;
System.out.println(remaining);
```

- **A.** 78
- **B.** 18
- **C.** 26

**3. Which command line reaches the robot?**

```java
int gap = 2;
System.out.println("move " + gap);
```

- **A.** move gap
- **B.** move + 2
- **C.** move 2

### Steps in the app

**1. Plan the route**

Start at (1, 3), facing east. The supply is `gap` tiles east. The delivery tile is one tile north of the supply; face the depot ahead.

**Check:** Sample: 3 travelled tiles. Finish at (3, 2), facing north.

**2. Pick up the supply**

Move `gap` tiles, then pick up the one part.


```java
System.out.println("move " + gap);
System.out.println("pick up");
```


**Check:** The pickup tile is empty. Pip holds 1 part.

**3. Deliver the supply**

Turn left, move one tile, then drop the part. Finish on that tile facing north.

**Check:** The depot has 1 part. Pip holds nothing.

**4. Calculate energy**

Calculate `travel` using `gap`. Calculate `remaining` as `energy` minus `travel` times `costPerTile`. Print `remaining` in the report. The supplied input lines stay locked.

**Check:** Sample: Delivered 1 part; energy 44. With `gap = 4`, `energy = 60`, and `costPerTile = 3`, 45 remains.

**5. Check different routes**

Run the three examples, then Submit. Submit changes `gap` (1–6), `energy` (60–140), and `costPerTile` (1–3) automatically. Explain how your commands and calculations use those values.

**Check:** Every board passes with the supplied input lines unchanged.

### Starter program


```java
public class Student {
    public static void main(String[] args) {
        final int gap = 2;
        final int energy = 50;
        final int costPerTile = 2;

        int travel = 0; // Calculate the travelled tiles using gap.
        int remaining = 0; // Calculate the energy left.

        // Print commands to pick up and deliver the supply.
        System.out.println("Delivered 1 part; energy " + remaining);
    }
}
```


### Hint

Count the eastward tiles and the one northward tile. Multiplication happens before subtraction in `energy - travel * costPerTile`.

### Sources and adaptation

[Stanford: Collect Newspaper Karel](https://web.stanford.edu/class/archive/cs/cs106a/cs106a.1226/handouts/05-assignment1.html). Original one-supply delivery puzzle inspired by the assignment’s short pickup route. Adds supplied variables and an energy calculation; method decomposition starts in Module 3.

## 2. Staircase Arena

**Module:** loops · **Estimated work:** 90–180 minutes · 2–3 sessions

**Required lessons:** Bring the console online; Build a first variable; Choose a box for a decimal; Count the spare parts; Read the battery fraction; Decode the robot label; Schedule repeated scans; Find the missing scan; Print a sensor grid; Total the charging cycles; Stop losing the total; Set the shelf count once.

**Topics:** Nested for loops; Changing loop bounds; Accumulators; Class constants; Route planning.

Use nested loops to paint a staircase that scales to different sizes.

### Mission

Use nested for loops to paint exactly the blue target, return to the finish facing east, and say `Painted N tiles`, replacing `N` with the running total. Declare the supplied `SIZE` class constant and support every size from 2 through 13.

Restore a blue staircase on the arena floor. The outlined tiles are the exact target. The bottom row has 1 tile, the next row 2, and the top row `SIZE`. Pip begins at the left end of the bottom row, facing east. All rows begin in column 1.

For each row, paint its tiles and return to column 1, one row north, facing east. After the final row, that position is the finish tile at (1, 1). Paint only the target tiles. Empty travel tiles remain unpainted.

`System.out.println("paint blue");` paints the current tile. `System.out.println("move");` advances one tile. `System.out.println("move " + row);` advances `row` tiles. Use `turn left` or `turn right` to change direction. Printing the command strings is the entire robot interface.

The sample uses `SIZE = 4`, with rows of 1, 2, 3, and 4 tiles: 10 tiles total. Checks change the supplied class constant `SIZE` from 2 through 13 and build a matching board. Use `SIZE` everywhere the overall size matters. There is no input to read.

### Sample map

```text
     0  1  2  3  4  5  6
 0   .  .  .  .  .  .  .
 1   .  F  .  .  .  .  .
 2   .  #  #  #  #  .  .
 3   .  #  #  #  .  .  .
 4   .  #  #  .  .  .  .
 5   .  >  .  .  .  .  .
 6   .  .  .  .  .  .  .
```

Arrow = Pip; * = supply; D = depot; # = blue target; Y = yellow target; X = wall; H = hurdle; F = finish. Coordinates start at zero. The arrow may cover a home/target tile.

### Commands

Each command below is a real Java statement. In the editor, type `pip` to see game snippets or press Ctrl+Space. These snippet labels are shortcuts, not Java methods.


```java
System.out.println("move 3");
```

Move forward by a positive whole number of tiles. A wall, obstacle or character stops the run.


```java
System.out.println("turn left");
```

Turn left by 90 degrees without moving.


```java
System.out.println("turn right");
```

Turn right by 90 degrees without moving.


```java
System.out.println("paint blue");
```

Paint the tile where Pip is standing. Choose red, blue, green, yellow, white.


```java
System.out.println("Hello, Arena!");
```

Say the printed text. A character responds only when standing on the tile directly ahead. Match a greeting or password exactly.

### Code refresher

Predict each answer before writing the project.

**1. How many times does `total` increase?**

```java
int total = 0;
for (int row = 1; row <= 3; row++) {
    for (int col = 1; col <= row; col++) {
        total++;
    }
}
```

- **A.** 3
- **B.** 6
- **C.** 9

**2. What is printed after this reset?**

```java
int total = 0;
for (int row = 1; row <= 3; row++) {
    total = 0;
    total += row;
}
System.out.println(total);
```

- **A.** 3
- **B.** 6
- **C.** 0

**3. What changes when `SIZE` becomes 5?**

```java
public static final int SIZE = 3;

// Inside main:
for (int row = 1; row <= SIZE; row++) {
    System.out.println("Row " + row);
}
```

- **A.** Nothing; final prevents using the value
- **B.** Only Row 5 prints
- **C.** Five numbered lines print instead of three

### Steps in the app

**1. Find the pattern**

The bottom row has 1 target. The next has 2. Continue up to `SIZE`. Write the running painted total for each row.

**Check:** `SIZE = 4`: totals 1, 3, 6, 10. `SIZE = 2`: totals 1, 3.

**2. Paint one row**

Paint each target blue and move east. Return to column 1, move one tile north, then face east.

**Check:** Only target tiles are painted; Pip is ready for the next row.

**3. Repeat the rows**

Use nested for loops: one for rows, one for tiles in that row. Increase `total` once per painted tile.

**Check:** `SIZE = 4` paints exactly 10 blue tiles.

**4. Use `SIZE`**

Keep `SIZE` as the supplied class constant. Use it to control the outer loop. Checks supply sizes 2–13.

**Check:** Finish at (1, 1), facing east, for every size.

**5. Report the total**

Print "Painted N tiles" with `total` in place of `N` after both loops. Run the examples, then Submit.

**Check:** `SIZE = 13` reports Painted 91 tiles. Set `total` to zero once, before the loops.

### Starter program


```java
public class Student {
    public static final int SIZE = 4;

    public static void main(String[] args) {
        int total = 0;
        // Row 1 has 1 tile; row 2 has 2; continue through SIZE.
        // Paint the current tile with System.out.println("paint blue");
        // Add nested loops, movement, and an accumulator.
        System.out.println("Painted " + total + " tiles");
    }
}
```


### Hint

For row r, the inner loop runs r times. Painting then moving each time ends one tile beyond that row. Turn around, move r tiles back, then move one row north and face east. Initialize total before both loops.

### Sources and adaptation

[University of Washington: Space Needle](https://courses.cs.washington.edu/courses/cse142/21su/assessments/a2/). Original robot painting puzzle based on the assignment’s growing row patterns, nested loops, size constant, and staged testing. It uses a staircase rather than the published artwork, and does not require methods before they are taught.

## 3. Tower Rescue

**Module:** methods · **Estimated work:** 90–180 minutes · 2–3 sessions

**Required lessons:** Bring the console online; Build a first variable; Choose a box for a decimal; Count the spare parts; Read the battery fraction; Decode the robot label; Schedule repeated scans; Find the missing scan; Print a sensor grid; Total the charging cycles; Stop losing the total; Set the shelf count once; Name a repeated task; Return the travel distance.

**Topics:** Method decomposition; Parameters and arguments; Return values; For loops; Cumulative totals.

Build reusable methods to collect towers of supplies and deliver the total.

### Mission

Implement and use the four documented methods. Rescue every part, deliver the exact total, return home facing east, and say `Recovered N parts`. Methods are also checked independently with different arguments, so they must use their parameters rather than the sample’s values.

Recover every part from the towers and deliver the cargo to the depot. Pip starts at column 0 on the bottom travel row, facing east. Tower t is at column 2 * t and contains t parts, one per tile north of its base. The first tower is 2 tiles east; the next base is always 2 tiles farther east.

From a tower base, face north, move and pick up once per part, return to that same base, then face east. After the last tower, move one tile east to face the depot and drop all the parts. The depot is one tile ahead. Return to column 0 on the travel row, facing east.

Use printed commands: `System.out.println("move");`, `System.out.println("move 2");`, `System.out.println("turn left");`, `System.out.println("pick up");`, and `System.out.println("drop");`. Picking uses the current tile; dropping uses the tile ahead. Your own Java methods group these commands. They are not built-in robot methods.

The sample has `TOWERS = 4`, with heights 1, 2, 3, and 4: 10 parts. Checks change the supplied `TOWERS` class constant from 2 through 13. Dimensions are known, so no sensors, conditions, while loops, arrays, or Scanner are needed. Start with one method before combining the whole route.

### Sample map

```text
     0  1  2  3  4  5  6  7  8  9 10
 0   .  .  .  .  .  .  .  .  .  .  .
 1   .  .  .  .  .  .  .  .  *  .  .
 2   .  .  .  .  .  .  *  .  *  .  .
 3   .  .  .  .  *  .  *  .  *  .  .
 4   .  .  *  .  *  .  *  .  *  .  .
 5   >  .  .  .  .  .  .  .  .  .  D
 6   .  .  .  .  .  .  .  .  .  .  .
```

Arrow = Pip; * = supply; D = depot; # = blue target; Y = yellow target; X = wall; H = hurdle; F = finish. Coordinates start at zero. The arrow may cover a home/target tile.

### Commands

Each command below is a real Java statement. In the editor, type `pip` to see game snippets or press Ctrl+Space. These snippet labels are shortcuts, not Java methods.


```java
System.out.println("move 3");
```

Move forward by a positive whole number of tiles. A wall, obstacle or character stops the run.


```java
System.out.println("turn left");
```

Turn left by 90 degrees without moving.


```java
System.out.println("turn right");
```

Turn right by 90 degrees without moving.


```java
System.out.println("pick up");
```

Pick up one item on the tile where Pip is standing.


```java
System.out.println("drop");
```

Place the most recently collected item on the tile directly ahead, or give it to a customer there who accepts it.


```java
System.out.println("Hello, Arena!");
```

Say the printed text. A character responds only when standing on the tile directly ahead. Match a greeting or password exactly.

### Methods to build


```java
public static void turnAround()
```

Turn 180 degrees without moving. This must work from any facing direction.


```java
public static void collectTower(int height)
```

Start at a tower base facing east. Collect its `height` parts, one tile northward at a time. Finish at the same base facing east. Height may be zero.


```java
public static int supplyCount(int towers)
```

Return the sum of 1 through `towers`, using a loop and a running total. Zero towers returns 0. Do not print or move here.


```java
public static void deliver(int count)
```

With a customer directly ahead and `count` parts already held, drop `count` parts. Keep the same position and direction. Zero drops prints no commands.

### Code refresher

Predict each answer before writing the project.

**1. What does a second call change?**

```java
public static void announce(String name) {
    System.out.println("Ready: " + name);
}

// Inside main:
announce("Pip");
announce("Bolt");
```

- **A.** The method is defined twice
- **B.** The same method receives a different argument
- **C.** The first name stays in the parameter forever

**2. Which value is printed?**

```java
public static int twice(int value) {
    return value * 2;
}

// Inside main:
int result = twice(3);
System.out.println(result + 1);
```

- **A.** 6
- **B.** 3
- **C.** 7

**3. What is returned when `towers` is 4?**

```java
public static int supplyCount(int towers) {
    int total = 0;
    for (int i = 1; i <= towers; i++) {
        total += i;
    }
    return total;
}
```

- **A.** 10
- **B.** 4
- **C.** 0

### Steps in the app

**1. Turn around**

Implement turnAround() with two turns. Call it twice from main so Pip faces east before moving.

**Check:** One call reverses direction without moving. Two calls restore it.

**2. Collect one tower**

Implement collectTower(height). Move north, collecting one part per tile, then return to the base facing east. Use loops for `height`.

**Check:** Try move 2, then collectTower(1). Collect 1 part and return to the same tile. Height 0 collects nothing and restores the starting pose.

**3. Count the supplies**

Implement supplyCount(towers). Add 1 through `towers` in a loop and return the total. Do not print or move here.

**Check:** Arguments 0, 1, 4, 8 return 0, 1, 10, 36.

**4. Connect the towers**

Keep the supplied `TOWERS` constant (2–13). In main, loop from 1 through `TOWERS`. Move 2 tiles and call `collectTower` with that tower’s height. Move 1 more tile to face the depot; call deliver(parts).

**Check:** deliver(count) drops `count` held parts without moving. Count 0 prints nothing. No cargo remains.

**5. Return home**

Return to the starting tile, facing east. Print "Recovered N parts" with the returned supply count. Run the examples, then Submit.

**Check:** Every tower is empty, all parts are delivered, and each helper passes its own checks.

### Starter program


```java
public class Student {
    public static final int TOWERS = 4;

    public static void main(String[] args) {
        // Start by testing turnAround twice. Then build one tower before the full route.
        // Tower t has height t; bases are two tiles apart.
        int parts = supplyCount(TOWERS);
        // Visit the towers, deliver parts, and return home.
        System.out.println("Recovered " + parts + " parts");
    }

    public static void turnAround() {
        // Turn 180 degrees without moving.
    }

    public static void collectTower(int height) {
        // Start and finish at the same tower base, facing east.
    }

    public static int supplyCount(int towers) {
        // Return the sum 1 through towers.
        return 0;
    }

    public static void deliver(int count) {
        // Drop count parts into the customer directly ahead.
    }
}
```


### Hint

A helper’s ending position and direction matter to its next caller. Make collectTower(height) return to its starting tile facing east. Calculate the sum 1 through towers in supplyCount and return it; do not only print it. Reuse the returned count in deliver.

### Sources and adaptation

[Stanford: Stepwise Refinement](https://compedu.stanford.edu/karel-reader/docs/java/en/chapter8.html). Original rescue game using tower collection, decomposition, and method pre/postconditions. Tower counts and heights are explicit; counted loops replace the original sensor-driven while loops so only previously taught topics are required.

## 4. Signal Patrol

**Module:** decisions · **Estimated work:** 90–180 minutes · 2–3 sessions

**Required lessons:** Bring the console online; Build a first variable; Choose a box for a decimal; Count the spare parts; Read the battery fraction; Decode the robot label; Schedule repeated scans; Find the missing scan; Print a sensor grid; Total the charging cycles; Stop losing the total; Set the shelf count once; Name a repeated task; Return the travel distance; Choose a battery warning; Count down to launch; Read a mission request.

**Topics:** Scanner input; While loops and sentinels; If/else decisions; Methods and return values; Accumulators.

Read a trail of signals, choose safe actions, and return the `collected` cargo.

### Mission

Use a `while` loop to stop at -1 and `if`/`else` decisions inside handleTile(int signal) to choose actions. Deliver every part, return home facing east, and print `Patrol D tiles; delivered P parts` using the actual distance and cargo count.

A list of numbers describes the next tiles on the path. Pip starts at (1, 2), facing east. Each signal describes one tile directly ahead: 0 means clear floor, 1 means a part, and 2 means a hurdle. The final -1 is a stop marker, not a tile. Read a signal, handle that tile, and repeat until -1.

Use `System.out.println("move");` for a clear tile or a part tile. Use `System.out.println("jump");` to advance one tile onto a hurdle safely. After entering a part tile, use `System.out.println("pick up");`. A jump advances exactly one tile; it does not skip the next cell. Track the number of processed tiles and the number of parts picked up.

At the end of the lane, turn right, move one tile south to row 3, and turn right again. This entire return row is clear. Travel west by the counted distance, turn north, and move back to (1, 2). The depot at (1, 1) is now directly ahead. Drop each part, then face east to finish.

The sample message is `1 0 2 1 0 2 -1`: collect two parts across six tiles. Run uses three examples; case 1 has the sample message. Submit checks 20 matching messages and boards. You do not type live console responses. No sensor methods or arrays are needed.

### Sample map

```text
     0  1  2  3  4  5  6  7  8
 0   .  .  .  .  .  .  .  .  .
 1   .  D  .  .  .  .  .  .  .
 2   .  >  *  .  H  *  .  H  .
 3   .  .  .  .  .  .  .  .  .
 4   .  .  .  .  .  .  .  .  .
```

Arrow = Pip; * = supply; D = depot; # = blue target; Y = yellow target; X = wall; H = hurdle; F = finish. Coordinates start at zero. The arrow may cover a home/target tile.

### Sample input

Space-separated tile codes ending in -1. Codes: 0 = clear, 1 = part, 2 = hurdle. Only -1 ends the message. Generated lanes contain 4–15 tiles. Sample: 1 0 2 1 0 2 -1. Run supplies the message automatically. Choose case 1 to see this sample. Submit uses 20 matching messages and boards.

```text
1 0 2 1 0 2 -1
```


### Commands

Each command below is a real Java statement. In the editor, type `pip` to see game snippets or press Ctrl+Space. These snippet labels are shortcuts, not Java methods.


```java
System.out.println("move 3");
```

Move forward by a positive whole number of tiles. A wall, obstacle or character stops the run.


```java
System.out.println("turn left");
```

Turn left by 90 degrees without moving.


```java
System.out.println("turn right");
```

Turn right by 90 degrees without moving.


```java
System.out.println("jump");
```

Move forward one tile, clearing a hurdle. Walls still block the way.


```java
System.out.println("pick up");
```

Pick up one item on the tile where Pip is standing.


```java
System.out.println("drop");
```

Place the most recently collected item on the tile directly ahead, or give it to a customer there who accepts it.


```java
System.out.println("Hello, Arena!");
```

Say the printed text. A character responds only when standing on the tile directly ahead. Match a greeting or password exactly.

### Methods to build


```java
public static int handleTile(int signal)
```

Handle one tile directly ahead. For 2, jump; otherwise move. For 1, pick up the part and return 1. For 0 or 2, return 0. Keep the same direction. This method receives only 0, 1, or 2; `main` handles `-1`.

### Code refresher

Predict each answer before writing the project.

**1. What happens for signal 2?**

```java
if (signal == 2) {
    System.out.println("jump");
} else {
    System.out.println("move");
}
```

- **A.** Only jump is printed
- **B.** Both commands are printed
- **C.** Only move is printed

**2. What prevents this loop from repeating the same signal?**

```java
int signal = input.nextInt();
while (signal != -1) {
    System.out.println(signal);
    // Missing line
}
```

- **A.** `signal = -1` before the loop
- **B.** `signal = input.nextInt();` inside the loop
- **C.** Print `signal` again

**3. What is the final total?**

```java
// Supplied input: 2 0 3 -1
int total = 0;
int value = input.nextInt();
while (value != -1) {
    total += value;
    value = input.nextInt();
}
System.out.println(total);
```

- **A.** 4
- **B.** -1
- **C.** 5

### Steps in the app

**1. Read the signals**

Each number describes the next tile: 0 = clear, 1 = part, 2 = hurdle. Stop at -1.

**Check:** 1 0 2 1 0 2 -1 means 6 tiles, 2 parts. Do not move for -1.

**2. Handle one tile**

Implement handleTile(signal): jump for 2; otherwise move. Pick up for 1 and return 1. Return 0 for the other signals.

**Check:** handleTile(1) reaches (2, 2), faces east, holds 1 part, and returns 1.

**3. Repeat until -1**

Use Scanner and a while loop. Call `handleTile` for each real signal. Add its return value to `collected`; increase `distance`; read the next signal.

**Check:** Sample: `distance = 6`, `collected = 2`, Pip at (7, 2).

**4. Return and deliver**

Move south to row 3, then west by `distance`. Turn north and move to (1, 2). Drop each part to the depot ahead.

**Check:** Use the clear return lane. Finish facing east with no parts held.

**5. Report the patrol**

Print `distance` and `collected`. Run the examples, then Submit. Generated lanes have 4–15 tiles.

**Check:** Sample: Patrol 6 tiles; delivered 2 parts.

### Starter program


```java
import java.util.Scanner;

public class Student {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);
        int signal = input.nextInt();
        int distance = 0;
        int collected = 0;
        // Process real signals with a while loop. Do not process -1.
        // Return via row 3, deliver the cargo, then face east.
        System.out.println("Patrol " + distance + " tiles; delivered " + collected + " parts");
    }

    public static int handleTile(int signal) {
        // Move or jump; pick up a part only for signal 1.
        // Return 1 for a collected part, otherwise 0.
        return 0;
    }
}
```


### Hint

Read the first signal before the while loop and the next signal at the end of every iteration. Call handleTile only for real tile codes. Return via row 3 so there is no need to remember hurdle positions.

### Sources and adaptation

[Stanford: If Statements](https://compedu.stanford.edu/karel-reader/docs/java/en/chapter7.html). Original dispatch-and-delivery puzzle using the chapter’s idea of choosing robot actions from conditions. Scanner messages replace Karel sensors, and a clear return lane makes arrays unnecessary.

## 5. Mosaic Survey

**Module:** arrays · **Estimated work:** 90–180 minutes · 2–3 sessions

**Required lessons:** Bring the console online; Build a first variable; Choose a box for a decimal; Count the spare parts; Read the battery fraction; Decode the robot label; Schedule repeated scans; Find the missing scan; Print a sensor grid; Total the charging cycles; Stop losing the total; Set the shelf count once; Name a repeated task; Return the travel distance; Choose a battery warning; Count down to launch; Read a mission request; Store sensor samples; Keep the scanner in bounds; Share a sensor buffer; Map the charging stations.

**Topics:** 2D arrays; Array traversal and bounds; Arrays as method arguments; Nested loops; Conditions and returned totals.

Read a tile map into a 2D array and paint its rows with reusable methods.

### Mission

Read the full input into `int[][] mosaic` using nested loops. Implement and call paintRow(int[] row), match every target color, finish at (1, 1) facing east, and print `Blue B; yellow Y` with the actual totals. Support 1–7 rows and 1–10 columns.

Paint the board to match the input. Input begins with `rows` and `columns`, then one 0 or 1 for every cell. Store the full map in `int[][] mosaic` before painting. A 1 means blue and a 0 means yellow. Every cell is painted, including zeros.

Array row 0 is the bottom row on the board; each following row is one tile north. Column 0 is the leftmost painted tile, at board column 1. Pip starts at the first cell of array row 0, facing east. A row’s values are read left to right.

Build paintRow(int[] row): paint each current tile from its array value, move east after each tile, return to the row’s first tile, and face east. Return the number of blue cells. The caller moves one row north between calls, including after the final row, to reach the finish at (1, 1). Leave the supplied `row` unchanged.

Use `System.out.println("paint blue");` or `System.out.println("paint yellow");`, then `System.out.println("move");`. Turns are printed as `turn left` or `turn right`. After painting all rows, print the counts in `blue` and `yellow`. The sample has 3 rows, 4 columns, 7 blue cells, and 5 yellow cells.

Run uses three examples with matching input and boards; case 1 is the sample. Submit checks 20 boards. There are no files to open, sensor APIs, collections, or extra drawing libraries.

### Sample map

```text
     0  1  2  3  4  5  6
 0   .  .  .  .  .  .  .
 1   .  F  .  .  .  .  .
 2   .  #  #  #  Y  .  .
 3   .  Y  #  Y  Y  .  .
 4   .  >  Y  #  #  .  .
 5   .  .  .  .  .  .  .
```

Arrow = Pip; * = supply; D = depot; # = blue target; Y = yellow target; X = wall; H = hurdle; F = finish. Coordinates start at zero. The arrow may cover a home/target tile.

### Sample input

First two whole numbers: `rows`, `columns`. Then `rows * columns` values (0 yellow, 1 blue), grouped from bottom row to top row. Sample: 3 4 / 1 0 1 1 / 0 1 0 0 / 1 1 1 0 (slashes mean line breaks). Run supplies the input automatically. Case 1 is this sample; the other two cases have their own input and boards.

```text
3 4
1 0 1 1
0 1 0 0
1 1 1 0
```


### Commands

Each command below is a real Java statement. In the editor, type `pip` to see game snippets or press Ctrl+Space. These snippet labels are shortcuts, not Java methods.


```java
System.out.println("move 3");
```

Move forward by a positive whole number of tiles. A wall, obstacle or character stops the run.


```java
System.out.println("turn left");
```

Turn left by 90 degrees without moving.


```java
System.out.println("turn right");
```

Turn right by 90 degrees without moving.


```java
System.out.println("paint blue");
```

Paint the tile where Pip is standing. Choose red, blue, green, yellow, white.


```java
System.out.println("Hello, Arena!");
```

Say the printed text. A character responds only when standing on the tile directly ahead. Match a greeting or password exactly.

### Methods to build


```java
public static int paintRow(int[] row)
```

Start at the row’s leftmost tile, facing east. Paint 1 as blue and 0 as yellow, then return to that same tile facing east. Return the number of blue cells. Leave the array unchanged. An empty array paints nothing and returns 0.

### Code refresher

Predict each answer before writing the project.

**1. Which index reads the last cell?**

```java
int[] row = {1, 0, 1, 1};
```

- **A.** `row[row.length]`
- **B.** `row[row.length - 1]`
- **C.** `row[0]`

**2. How many blue cells does this count?**

```java
int[][] map = {{1, 0, 1}, {0, 1, 0}};
int blue = 0;
for (int r = 0; r < map.length; r++) {
    for (int c = 0; c < map[r].length; c++) {
        if (map[r][c] == 1) blue++;
    }
}
```

- **A.** 2
- **B.** 6
- **C.** 3

**3. Does changing the alias change the original row?**

```java
int[] row = {1, 0};
int[] sameRow = row;
sameRow[0] = 0;
System.out.println(row[0]);
```

- **A.** Yes; it prints 0
- **B.** No; it prints 1
- **C.** It does not compile

### Steps in the app

**1. Read the map**

Read `rows` and `columns`, then store every cell in `int[][] mosaic` using nested loops. 1 = blue; 0 = yellow. Array row 0 is the bottom board row.

**Check:** Sample: 3 × 4 = 12 cells. `mosaic[0][0]` is blue; `mosaic[1][0]` is yellow.

**2. Paint one row**

Implement paintRow(int[] row). Paint each cell and move east. Return to the first tile facing east; return the blue count. Leave `row` unchanged.

**Check:** First row: blue, yellow, blue, blue; returns 3. An empty row paints nothing and returns 0.

**3. Paint every row**

Call `paintRow` for each row of `mosaic`. After each call, move one tile north and face east, including after the last row.

**Check:** Every target matches. Pip finishes at (1, 1), facing east.

**4. Count the colors**

Add the returned counts into `blue`. Calculate `yellow = rows * columns - blue`. Print both totals.

**Check:** Sample: Blue 7; yellow 5. The totals add up to 12.

**5. Check different maps**

Run the examples, then Submit. Support 1–7 rows and 1–10 columns. Use array lengths for bounds and keep the stored values unchanged.

**Check:** All checks pass, including rows with zero blue cells.

### Starter program


```java
import java.util.Scanner;

public class Student {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);
        int rows = input.nextInt();
        int columns = input.nextInt();
        int[][] mosaic = new int[rows][columns];
        // Read every cell before painting.
        int blue = 0;
        // Call paintRow for each stored row, then move north.
        int yellow = rows * columns - blue;
        System.out.println("Blue " + blue + "; yellow " + yellow);
    }

    public static int paintRow(int[] row) {
        // Paint the row and return to its first tile, facing east.
        // Return its blue count and leave the array unchanged.
        return 0;
    }
}
```


### Hint

Use `mosaic`.length for the number of rows and `mosaic`[row].length for that row’s width. Pass `mosaic`[row] to paintRow. Count blue cells from each returned value; yellow is total cells minus blue.

### Sources and adaptation

[University of Washington: Array Histogram](https://courses.cs.washington.edu/courses/cse142/22sp/lectures/Histogram.java). Original robot mosaic that adapts the separation between storing array data and traversing it to draw a result. A 2D binary tile map replaces score frequencies; Scanner input replaces file input, and print commands replace graphics-library calls.
