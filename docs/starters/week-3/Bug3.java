// Bug 3. This compiles. It is still wrong.
// It says Respawning... even at full health.

public class Bug3 {
    public static void main(String[] args) {
        int hp = 100;

        if (hp <= 0)
            System.out.println("You died.");
            System.out.println("Respawning...");
    }
}
