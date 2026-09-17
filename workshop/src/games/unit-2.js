// Unit 2 games. One object per game; see shared/game-contract.js for the
// registry shape and docs/specs/2026-09-17-game-practice-contracts.md for the
// authoring guide. Owner: the unit-2 content worktree.
//
// `hoop-streak` is the engine's reference sample for subtopic 2.1 and stays
// here until the Phase 2 ownership transfer.

const SHOP_STEPS = 3;   // the route to the shop is fixed so no navigation is needed
const LANE = 5;         // the row Pip drives along

export const games = [
  {
    id: 'hoop-streak',
    subtopic: '2.1',
    title: 'Hoop Streak',
    boss: false,
    commands: ['move', 'turn', 'shoot'],
    brief: [
      'The scoreboard asks for a number of baskets and Pip starts with no balls at all.',
      '',
      'The shopkeeper is three tiles east. Drive up to the counter, ask for the balls out loud, turn left to face the hoop, and shoot once for every basket.',
      '',
      'The route never changes. Only the number of baskets does, so the number of shots has to come from a loop rather than from copied lines.',
    ].join('\n'),
    task: 'Score exactly as many baskets as the scoreboard asks for, using a `for` loop for the shots.',
    hint: 'Ask the shopkeeper with `System.out.println("Can I have " + baskets + " balls?")`, then repeat `System.out.println("shoot")` inside `for (int i = 0; i < baskets; i++)`.',
    inputHelp: 'One line with one whole number: the baskets to score (4 to 31).',
    starter: [
      'import java.util.Scanner;',
      '',
      'public class Student {',
      '    public static void main(String[] args) {',
      '        Scanner input = new Scanner(System.in);',
      '        int baskets = input.nextInt();',
      '        System.out.println("move 3");',
      '        // Ask the shopkeeper for the balls, then turn left and shoot once per basket.',
      '    }',
      '}',
      '',
    ].join('\n'),
    solution: [
      'import java.util.Scanner;',
      '',
      'public class Student {',
      '    public static void main(String[] args) {',
      '        Scanner input = new Scanner(System.in);',
      '        int baskets = input.nextInt();',
      '        System.out.println("move 3");',
      '        System.out.println("Can I have " + baskets + " balls?");',
      '        System.out.println("turn left");',
      '        for (int i = 0; i < baskets; i++) {',
      '            System.out.println("shoot");',
      '        }',
      '    }',
      '}',
      '',
    ].join('\n'),
    requirements: { loops: { for: 1 } },
    // Level 2 keeps the same route and the same input schema: bigger numbers,
    // plus the twist that the shop stocks exactly the balls needed, so an
    // over-order is answered with "Only N left." instead of a spare ball.
    //
    // The basket range is deliberately wide. A graded tier is only three worlds,
    // so a narrow range (this drew from 3..6 at first, four possible worlds)
    // hands the student the same puzzle twice and lets one memorised shot count
    // clear the tier. The range is what creates variety; `requirements` and
    // `rejects` are what actually reject a fixed answer.
    world(rng, level) {
      const baskets = level === 2 ? 16 + Math.floor(rng() * 16) : 4 + Math.floor(rng() * 12);
      const hoopDistance = 1 + Math.floor(rng() * 5);
      const width = SHOP_STEPS + 2 + Math.floor(rng() * 4);
      const stock = level === 2 ? baskets : baskets + 3 + Math.floor(rng() * 5);
      return {
        width,
        height: LANE + 2,
        robot: { x: 0, y: LANE, dir: 'E' },
        walls: [],
        hurdles: [],
        items: [],
        characters: [{ id: 'shop-1', kind: 'shop', x: SHOP_STEPS + 1, y: LANE, stock: { ball: stock } }],
        hoops: [{ x: SHOP_STEPS, y: LANE - hoopDistance }],
        signs: [{ x: 1, y: LANE, text: `Score ${baskets}` }],
        input: `${baskets}\n`,
        par: baskets + 4,
        data: { baskets },
      };
    },
    goal(end, world) {
      const { baskets } = world.data;
      if (end.scored === baskets) return { passed: true, message: `${baskets} for ${baskets}. The crowd is on its feet.` };
      if (end.scored < baskets) return { passed: false, message: `Pip scored ${end.scored} of ${baskets}. Shoot once for every basket the scoreboard asks for.` };
      return { passed: false, message: `Pip scored ${end.scored}, which is more than the ${baskets} asked for.` };
    },
    // Authored boundary cases. These must never earn a star, on any seed.
    rejects: [
      {
        label: 'a fixed number of shots instead of a loop',
        source: [
          'import java.util.Scanner;',
          '',
          'public class Student {',
          '    public static void main(String[] args) {',
          '        Scanner input = new Scanner(System.in);',
          '        int baskets = input.nextInt();',
          '        System.out.println("move 3");',
          '        System.out.println("Can I have 5 balls?");',
          '        System.out.println("turn left");',
          '        System.out.println("shoot");',
          '        System.out.println("shoot");',
          '        System.out.println("shoot");',
          '        System.out.println("shoot");',
          '        System.out.println("shoot");',
          '    }',
          '}',
          '',
        ].join('\n'),
      },
      {
        label: 'an empty loop with a single shot outside it',
        source: [
          'import java.util.Scanner;',
          '',
          'public class Student {',
          '    public static void main(String[] args) {',
          '        Scanner input = new Scanner(System.in);',
          '        int baskets = input.nextInt();',
          '        System.out.println("move 3");',
          '        System.out.println("Can I have " + baskets + " balls?");',
          '        System.out.println("turn left");',
          '        for (int i = 0; i < baskets; i++) {',
          '        }',
          '        System.out.println("shoot");',
          '    }',
          '}',
          '',
        ].join('\n'),
      },
      {
        label: 'shoots without ever buying a ball',
        source: [
          'import java.util.Scanner;',
          '',
          'public class Student {',
          '    public static void main(String[] args) {',
          '        Scanner input = new Scanner(System.in);',
          '        int baskets = input.nextInt();',
          '        System.out.println("move 3");',
          '        System.out.println("turn left");',
          '        for (int i = 0; i < baskets; i++) {',
          '            System.out.println("shoot");',
          '        }',
          '    }',
          '}',
          '',
        ].join('\n'),
      },
    ],
  },
];
