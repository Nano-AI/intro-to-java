// Stable lesson IDs let future content releases preserve the student's work.
export const course = {
  id: 'java-robotics-foundations', version: '0.2.0', title: 'Java foundations',
  reference: 'https://courses.cs.washington.edu/courses/cse121/26sp/',
};

// Each screen introduces one idea or asks for one action. Tasks remain in missions.js.
export const lessonSteps = {
  'first-movement': [
    { label: 'Goal', title: 'Make the robot move.', text: 'Pip needs to travel at least 60 cm and stop. Change just two numbers.' },
    { label: 'One idea', title: 'One number per wheel.', text: '`setPower(left, right)` calls a method. The first number controls the left wheel; the second controls the right.', code: 'robot.setPower(0.3, 0.3);', focus: 'setPower' },
    { label: 'Predict', title: 'What will equal powers do?', text: 'Both wheels have positive power. Make a prediction before running.', choices: ['Drive straight', 'Turn in place'], answer: 0, response: 'Equal wheel speeds move Pip straight ahead. Opposite wheel directions turn it in place.' },
    { label: 'Task', title: 'Change two numbers.', task: true, focus: 'setPower', code: '0.0 → 0.3' },
    { label: 'Check understanding', title: 'Explain what happened.', reflect: true },
  ],
  'precision-parking': [
    { label: 'Goal', title: 'Park 100 cm ahead.', text: 'Stop inside the charging pad. Keep the motor power at `0.25` and work out how long Pip should drive.' },
    { label: 'One idea', title: 'Give a number a name.', text: 'A `double` stores a decimal value. The name `power` can be used wherever that value is needed.', code: 'double power = 0.25;', focus: 'double power' },
    { label: 'Predict', title: 'How many seconds?', text: 'At power `0.25`, Pip moves 25 cm each second. How long does it take to travel 100 cm?', choices: ['2 seconds', '4 seconds', '25 seconds'], answer: 1, response: '100 ÷ 25 = 4 seconds. Distance = speed × time.' },
    { label: 'Task', title: 'Set the duration.', task: true, focus: 'duration' },
    { label: 'Check understanding', title: 'What if the motors change?', reflect: true },
  ],
  'make-a-turn': [
    { label: 'Goal', title: 'Turn a quarter circle.', text: 'Turn clockwise to a heading of 90°. Keep Pip in the same spot.' },
    { label: 'One idea', title: 'Choose with a comparison.', text: '`heading()` reads the angle. This condition is `true` until Pip reaches 90°. Then the `else` branch stops the motors.', code: 'if (robot.heading() < 90)', focus: 'heading()' },
    { label: 'Predict', title: 'How does turning in place work?', text: 'The left wheel moves forward. What should the right wheel do?', choices: ['Move forward too', 'Move backward'], answer: 1, response: 'One wheel forward and one backward turns Pip around its center.' },
    { label: 'Task', title: 'Reverse one wheel.', task: true, focus: 'setPower', code: 'robot.setPower(0.3, -0.3);' },
    { label: 'Check understanding', title: 'Reverse the experiment.', reflect: true },
  ],
  'sense-and-stop': [
    { label: 'Goal', title: 'Stop before the wall.', text: 'Stop 20–40 cm away from the far wall. The program will be tested from three starting conditions.' },
    { label: 'One idea', title: 'Measure before deciding.', text: '`distance()` reads the sensor in centimeters. Checking it on each update lets Pip react as it approaches.', code: 'robot.distance()', focus: 'distance()' },
    { label: 'Predict', title: 'The sensor reads 18 cm.', text: 'The target is 30 cm. Should Pip keep driving forward?', choices: ['Keep driving', 'Stop'], answer: 1, response: '18 cm is already closer than 30 cm. Forward motion would take Pip even closer to the wall.' },
    { label: 'Task', title: 'Choose a stopping distance.', task: true, focus: 'distance()', code: 'if (robot.distance() > 30)' },
    { label: 'Check understanding', title: 'Test a different start.', reflect: true },
  ],
  'collect-a-part': [
    { label: 'Goal', title: 'Bring a part aboard.', text: 'Approach the dispenser, stop, and collect. Pip can only pick up a part when it is docked.' },
    { label: 'One idea', title: 'A yes-or-no value.', text: '`hasPart()` returns `true` or `false`: a `boolean`. The first branch stops Pip once it has collected a part.', code: 'if (robot.hasPart())', focus: 'hasPart()' },
    { label: 'Predict', title: 'When should Pip collect?', text: 'Choose the moment when the robot is ready for the dispenser.', choices: ['While far from the wall', 'After docking and stopping'], answer: 1, response: 'Collect after stopping at the dispenser. The order of actions matters.' },
    { label: 'Task', title: 'Add the pickup command.', task: true, focus: '// Pick up', code: 'robot.collect();' },
    { label: 'Check understanding', title: 'Read the branches aloud.', reflect: true },
  ],
  'autonomous-docking': [
    { label: 'Goal', title: 'Write a reusable behavior.', text: 'Build a `dock` method that approaches, stops, and collects. It must work in three different conditions.' },
    { label: 'One idea', title: 'Pass in the target.', text: 'This call passes `30.0` into `targetDistance`. Inside `dock`, use that parameter instead of a fixed number.', code: 'dock(robot, 30.0);', focus: 'dock(robot' },
    { label: 'Predict', title: 'Change the target to `25.0`.', text: 'Where should Pip stop if the method uses its parameter?', choices: ['Closer to the wall', 'Farther from the wall'], answer: 0, response: '25 cm is closer than 30 cm. A parameter lets the same method serve different targets.' },
    { label: 'Task', title: 'Implement the method.', task: true, focus: '// Sense' },
    { label: 'Check understanding', title: 'Show that it generalizes.', reflect: true },
  ],
};
