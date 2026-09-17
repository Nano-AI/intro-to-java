const navigation = `
    static boolean go(Robot robot, double targetX, double targetY) {
        double dx = targetX - robot.x();
        double dy = targetY - robot.y();
        if (Math.hypot(dx, dy) < 7) { robot.stop(); return true; }
        double error = Math.toDegrees(Math.atan2(dx, dy)) - robot.heading();
        while (error > 180) error -= 360;
        while (error < -180) error += 360;
        if (Math.abs(error) > 5) {
            double turn = Math.max(-0.35, Math.min(0.35, error / 100));
            robot.setPower(turn, -turn);
        } else { robot.setPower(0.65, 0.65); }
        return false;
    }
`;
const program = body => `public class Student {\n    static int phase = 0;\n    public static void update(Robot robot) {\n${body}\n    }\n${navigation}}\n`;
const starter=`public class Student {
    static int phase = 0;
    public static void update(Robot robot) {
        // Plan the route, then implement one phase at a time.
        // x() and y() give position in cm. Heading 0 points toward +y.
        robot.stop();
    }
}
`;
const obstacle={x:0,y:0,width:70,depth:50};
export const challenges = [
  {
    id:'robot-detour',title:'Reach the goal',topic:'Obstacle navigation',kind:'robot',mission:6,assessmentVersion:2,challenge:true,
    intro:'Reach the green goal at (100, 100) without touching the center barrier. Finish stopped. The run allows 40 simulated seconds.',
    concept:'Break a route into waypoints that leave room for the robot’s body. Position feedback makes the route work from different starting positions.',
    example:'robot.x();\nrobot.y();\nrobot.distance();',prediction:['The center route is blocked. What should the first waypoint do?',['Move toward a clear side aisle','Drive straight into the barrier'],0],
    task:'Plan a route around the 70 × 50 cm barrier centered at (0, 0). Reach within 22 cm of (100, 100) and stop. The robot has a 14 cm collision radius.',
    hint:'Draw the route first. Separate turning, driving to a side waypoint, and approaching the final goal. Use position or sensor feedback rather than assuming a fixed travel time.',
    reflection:'Which waypoints work, and how much clearance do they leave? Explain why a different starting position still works.',
    starter,solution:program('        if (phase == 0 && go(robot, 100, -100)) phase = 1;\n        else if (phase == 1 && go(robot, 100, 100)) phase = 2;\n        else if (phase == 2) robot.stop();'),
    visual:{kind:'drive'},world:{obstacles:[obstacle],goals:[{kind:'goal',x:100,y:100,label:'GOAL'}]},
  },
  {
    id:'robot-cargo',title:'Collect, carry, deliver',topic:'Game-piece handling',kind:'robot',mission:7,assessmentVersion:2,challenge:true,
    intro:'Collect cargo from (-100, 80), then deliver it to (100, 80). Avoid the barrier and finish stopped.',
    concept:'A robot needs state: approaching, collecting, carrying, and delivering are different phases. A method can handle each repeated movement.',
    example:'robot.collect();\nrobot.hasPart();\nrobot.deliver();\nrobot.wasDelivered();',prediction:['When should the delivery phase begin?',['After hasPart() is true','Immediately at the start'],0],
    task:'Reach the orange pickup, call collect(), carry the cargo to the green station, and call deliver(). Stay within 22 cm of a station to interact. Finish within 40 simulated seconds.',
    hint:'First get pickup working by itself. Then check hasPart() before changing phase. Plan the route around the barrier before adding delivery.',
    reflection:'What state is stored between updates? What prevented delivery before collecting?',
    starter,solution:program('        if (phase == 0 && go(robot, -100, -80)) phase = 1;\n        else if (phase == 1 && go(robot, -100, 80)) { robot.collect(); if (robot.hasPart()) phase = 2; }\n        else if (phase == 2 && go(robot, 100, 80)) { robot.deliver(); phase = 3; }\n        else if (phase == 3) robot.stop();'),
    visual:{kind:'drive'},world:{obstacles:[obstacle],goals:[{kind:'pickup',x:-100,y:80,label:'PICKUP'},{kind:'delivery',x:100,y:80,label:'DELIVER'}]},
  },
  {
    id:'robot-hoop',title:'Score the shot',topic:'Aiming & power calibration',kind:'robot',mission:8,assessmentVersion:2,challenge:true,
    intro:'Collect one ball at (0, -70), aim toward the hoop at (100, 120), and score. The run allows 40 simulated seconds.',
    concept:'A shot needs position, heading, and power. This teaching model launches along the robot’s heading and travels 300 × power cm. A miss gives information for the next attempt.',
    example:'robot.collect();\nrobot.hasBall();\nrobot.shoot(0.6);\nrobot.scored();',prediction:['In this model, increasing shot power does what?',['Increases the shot’s range','Automatically aims at the hoop'],0],
    task:'Collect the ball, find a clear shooting position, aim, and call shoot(power). Use power from 0.0 to 1.0. The ball must land within 18 cm of the hoop center. Stop the robot after the shot.',
    hint:'Try one part at a time: collect, reposition, align, then shoot. Estimate range from the current position to the hoop. Changing power fixes range; changing heading fixes direction. Each run starts with a new ball.',
    reflection:'Record one missed shot and the adjustment that improved it. Which real-world factors would make this model less predictable?',
    starter,solution:program('        if (phase == 0 && go(robot, 0, -70)) { robot.collect(); if (robot.hasBall()) phase = 1; }\n        else if (phase == 1 && go(robot, 100, -70)) phase = 2;\n        else if (phase == 2) {\n            double dx = 100 - robot.x(), dy = 120 - robot.y();\n            double error = Math.toDegrees(Math.atan2(dx, dy)) - robot.heading();\n            while (error > 180) error -= 360;\n            while (error < -180) error += 360;\n            if (Math.abs(error) > 0.5) { double turn = Math.max(-0.3, Math.min(0.3, error / 100)); robot.setPower(turn, -turn); }\n            else { robot.stop(); robot.shoot(Math.hypot(dx, dy) / 300); phase = 3; }\n        } else if (phase == 3) robot.stop();'),
    visual:{kind:'drive'},world:{obstacles:[{...obstacle,y:30}],goals:[{kind:'ball',x:0,y:-70,label:'BALL'},{kind:'hoop',x:100,y:120,label:'HOOP'}]},
  },
];
