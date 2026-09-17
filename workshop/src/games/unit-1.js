// Unit 1 games. One object per game; see shared/game-contract.js for the
// registry shape and docs/specs/2026-09-17-game-practice-contracts.md for the
// authoring guide. Owner: the unit-1 content worktree.
//
// `hello-arena` is the engine's reference sample for subtopic 1.1 and stays
// here until the Phase 2 ownership transfer.

const PHRASE = 'Hello, Arena!';

export const games = [
  {
    id: 'hello-arena',
    subtopic: '1.1',
    title: 'Hello Arena',
    boss: false,
    // Subtopic 1.1 uses one fixed board: world() ignores the generator and the
    // level. Declaring it exempts the game from the world-spread check and
    // instead requires the world to be identical on every seed and both levels.
    fixed: true,
    // Speech only: no verb is allowed, so every printed line is something Pip
    // says out loud. `move` would be answered with "`move` is not used in this
    // game."
    commands: [],
    brief: [
      'Pip is parked in front of the arena greeter, who is waiting for one exact sentence.',
      '',
      'Every line your program prints is a line Pip says. The sign beside Pip shows the sentence the greeter is listening for, punctuation and all.',
    ].join('\n'),
    task: `Print ${JSON.stringify(PHRASE)} so Pip says it to the greeter.`,
    hint: '`System.out.println("...")` prints one line. The text between the quotes has to match the sign character for character: the capital letters, the comma, and the exclamation mark all count.',
    starter: 'public class Student {\n    public static void main(String[] args) {\n        // Say the greeting from the sign.\n        System.out.println("hello");\n    }\n}\n',
    solution: `public class Student {\n    public static void main(String[] args) {\n        System.out.println(${JSON.stringify(PHRASE)});\n    }\n}\n`,
    // Subtopic 1.1 uses fixed worlds: no randomness, no level twist, and no
    // stdin. Both rounds replay the same board, so the second star confirms the
    // same solution and the third adds the par target (design spec section 2,
    // "Where world data comes from").
    world() {
      return {
        width: 5,
        height: 5,
        robot: { x: 2, y: 3, dir: 'N' },
        walls: [[0, 0], [4, 0]],
        hurdles: [],
        items: [],
        characters: [{ id: 'greeter-1', kind: 'greeter', x: 2, y: 2, expectedPhrase: PHRASE, reply: 'Welcome to the arena, Pip!' }],
        hoops: [],
        signs: [{ x: 1, y: 3, text: PHRASE }],
        par: 1,
        data: { phrase: PHRASE },
      };
    },
    goal(end, world) {
      if (!end.said.includes(world.data.phrase)) {
        return { passed: false, message: `Pip never said ${JSON.stringify(world.data.phrase)}. Check the capital letters, the comma, and the exclamation mark.` };
      }
      return { passed: true, message: 'The greeter heard Pip and waved back.' };
    },
    // Authored boundary cases. These must never earn a star, on any seed.
    rejects: [
      { label: 'wrong capitals and punctuation', source: 'public class Student {\n    public static void main(String[] args) {\n        System.out.println("hello arena");\n    }\n}\n' },
      { label: 'missing comma', source: 'public class Student {\n    public static void main(String[] args) {\n        System.out.println("Hello Arena!");\n    }\n}\n' },
      { label: 'says nothing at all', source: 'public class Student {\n    public static void main(String[] args) {\n    }\n}\n' },
    ],
  },
];
