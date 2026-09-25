package lesson;

import java.util.Scanner;

public class Student {
    public static void main(String[] args) {
        Scanner console = new Scanner(System.in);
        System.out.print("How many laps? ");
        int laps = console.nextInt();
        int total = 0;
        for (int i = 1; i <= laps; i++) {
            total += square(i);
        }
        String name = "pip";
        System.out.println(name.toUpperCase() + " ran " + total);
        System.out.println("Root: " + Math.sqrt(total));
        Robot robot = new Robot(name);
        robot.move(laps);
        System.out.println(robot.getName() + " done");
    }

    public static int square(int n) {
        return n * n;
    }
}
