// Name:
// Date:
// What this program does:

import java.util.Scanner;

public class Dungeon {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        int hp = 100;
        int gold = 0;

        System.out.println("A corridor splits in two.");
        System.out.print("Left or right? ");
        String choice = input.nextLine();

        // Send them somewhere different depending on what they typed.
        // Change hp or gold in at least one room.

        System.out.println("HP " + hp + ", gold " + gold + ".");
    }
}
