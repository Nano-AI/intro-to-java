// Bug 1. This compiles. It is still wrong.
// It always denies you, even when you type dragon.

import java.util.Scanner;

public class Bug1 {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);
        System.out.print("Password: ");
        String password = input.next();

        if (password == "dragon") {
            System.out.println("Access granted");
        } else {
            System.out.println("Access denied");
        }
    }
}
