// Bug 2. This compiles. It is still wrong.
// A 95 should be an A. It prints D.

public class Bug2 {
    public static void main(String[] args) {
        int score = 95;
        String grade;

        if (score >= 60) {
            grade = "D";
        } else if (score >= 70) {
            grade = "C";
        } else if (score >= 80) {
            grade = "B";
        } else if (score >= 90) {
            grade = "A";
        } else {
            grade = "F";
        }
        System.out.println(grade);
    }
}
