// Name:
// Date:
// What this program does:

import java.util.Scanner;

public class MagicEightBall {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        System.out.print("Ask me anything: ");
        String question = input.nextLine();

        // Pick a number 0 through 4, then turn it into an answer.
        int pick = (int) (Math.random() * 5);

    }
}
