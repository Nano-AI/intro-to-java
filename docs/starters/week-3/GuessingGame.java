// Name:
// Date:
// What this program does:

import java.util.Scanner;

public class GuessingGame {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        // Watch out: reading a name and then a number in the same program
        // is where nextLine() gets weird. You have seen this one before.

        System.out.print("Your name: ");
        String name = input.nextLine();

        int secret = (int) (Math.random() * 10) + 1;

    }
}
