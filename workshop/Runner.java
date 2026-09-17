import java.nio.file.*;
import java.nio.charset.StandardCharsets;

public class Runner {
    public static void main(String[] args) throws Exception {
        int mission = Integer.parseInt(args[0]);
        Robot robot = new Robot(mission, Integer.parseInt(args[1]));
        int controlHz = args.length > 3 ? Integer.parseInt(args[3]) : 20;
        if (controlHz != 1 && controlHz != 20 && controlHz != 60)
            throw new IllegalArgumentException("Use 1, 20 or 60 updates per second.");
        StringBuilder frames = new StringBuilder("[").append(robot.frame());
        java.lang.reflect.Method docking = null;
        if (mission == 5) { docking = Student.class.getDeclaredMethod("dock", Robot.class, double.class); docking.setAccessible(true); }
        for (int tick = 0; tick < (mission >= 6 ? 2400 : 1200); tick++) {
            if (tick % (60 / controlHz) == 0) { if (docking != null) docking.invoke(null, robot, robot.dockingTarget()); else Student.update(robot); }
            robot.step(tick);
            frames.append(',').append(robot.frame());
            if (robot.crashed()) break;
        }
        String result = "{\"passed\":" + robot.passed(mission) + ",\"targetDistance\":"+robot.dockingTarget()+",\"frames\":" + frames + "]}";
        Files.write(Paths.get(args[2]), result.getBytes(StandardCharsets.UTF_8));
    }
}
