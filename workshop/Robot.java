import java.util.Locale;

/** Small teaching API. Distances are cm, headings degrees, power is -1 to 1. */
public final class Robot {
    private double x = 0, y, heading = 0, left = 0, right = 0, time = 0;
    private final double speed;
    private boolean collision = false, carrying = false;
    private final int mission;
    private final int variant;
    private boolean delivered = false, ballLoaded = false, ballTaken = false, scored = false, ballActive = false;
    private double ballX, ballY, ballZ, shotX, shotY, shotEndX, shotEndY, shotTime, shotPower;
    private int shots = 0;

    public Robot(int variant) { this(0, variant); }
    public Robot(int mission, int variant) {
        this.mission = mission;
        this.variant = variant;
        y = variant == 1 ? -70 : variant == 2 ? -150 : -120;
        speed = variant == 2 ? 85 : 100;
    }
    public void setPower(double left, double right) {
        if (!Double.isFinite(left) || !Double.isFinite(right))
            throw new IllegalArgumentException("Motor power must be a finite number.");
        if (Math.abs(left) > 1 || Math.abs(right) > 1)
            throw new IllegalArgumentException("Motor power must be between -1.0 and 1.0. Try (1.0, 0.7) to curve; 1.2 is out of range.");
        this.left = left;
        this.right = right;
    }
    public void stop() { setPower(0, 0); }
    public double seconds() { return time; }
    public double heading() { return Math.toDegrees(heading); }
    public double x() { return x; }
    public double y() { return y; }
    public boolean wasDelivered() { return delivered; }
    public boolean scored() { return scored; }
    public boolean hasBall() { return ballLoaded; }
    double dockingTarget() { return mission==5 ? (variant==1?24:variant==2?36:30) : 30; }
    private double obstacleY() { return mission == 8 ? 30 : 0; }
    private boolean touchesObstacle(double px, double py) {
        if (mission < 6) return false;
        double closestX = Math.max(-35, Math.min(35, px));
        double closestY = Math.max(obstacleY()-25, Math.min(obstacleY()+25, py));
        return Math.hypot(px-closestX, py-closestY) < 14;
    }
    private double obstacleRay(double dx, double dy) {
        double near = 0, far = 600;
        double[] positions = {x, y}, directions = {dx, dy}, low = {-35, obstacleY()-25}, high = {35, obstacleY()+25};
        for (int axis=0; axis<2; axis++) {
            if (Math.abs(directions[axis]) < 0.000001) { if (positions[axis]<low[axis] || positions[axis]>high[axis]) return 600; }
            else {
                double a=(low[axis]-positions[axis])/directions[axis], b=(high[axis]-positions[axis])/directions[axis];
                near=Math.max(near,Math.min(a,b)); far=Math.min(far,Math.max(a,b));
                if (near>far) return 600;
            }
        }
        return near;
    }
    public double distance() {
        double dx = Math.sin(heading), dy = Math.cos(heading), nearest = 600;
        if (dx > 0.000001) nearest = Math.min(nearest, (210 - x) / dx);
        if (dx < -0.000001) nearest = Math.min(nearest, (-210 - x) / dx);
        if (dy > 0.000001) nearest = Math.min(nearest, (180 - y) / dy);
        if (dy < -0.000001) nearest = Math.min(nearest, (-180 - y) / dy);
        if (mission >= 6) nearest = Math.min(nearest, obstacleRay(dx,dy));
        return Math.max(0, nearest - 14);
    }
    public void collect() {
        if (mission == 7) { if (!delivered && Math.hypot(x+100,y-80)<22) carrying=true; return; }
        if (mission == 8) { if (!ballTaken && Math.hypot(x,y+70)<22) { ballLoaded=true;ballTaken=true; } return; }
        if (Math.abs(x) < 35 && y > 125 && y < 152 && Math.abs(heading()) < 8)
            carrying = true;
    }
    public boolean hasPart() { return carrying; }
    public void deliver() { if(mission==7&&carrying&&Math.hypot(x-100,y-80)<22) { carrying=false;delivered=true; } }
    public void shoot(double power) {
        if (!Double.isFinite(power)||power<0||power>1) throw new IllegalArgumentException("Shot power must be between 0.0 and 1.0.");
        if(mission!=8||!ballLoaded||ballActive)return;
        ballLoaded=false;ballActive=true;shots++;shotTime=0;shotPower=power;shotX=x;shotY=y;
        shotEndX=x+Math.sin(heading)*300*power;shotEndY=y+Math.cos(heading)*300*power;
    }
    void step(int tick) {
        // ponytail: flat-ground differential drive; add inertia/slip after feedback lessons.
        heading += (left - right) * speed / 32 / 60;
        double v = (left + right) * speed / 2;
        x += Math.sin(heading) * v / 60;
        y += Math.cos(heading) * v / 60;
        time = (tick + 1) / 60.0;
        if (Math.abs(x) > 196 || Math.abs(y) > 166 || touchesObstacle(x,y)) { collision = true; stop(); }
        if(ballActive) {
            // Teaching arc: range is 300 * power cm; this is not a ballistic hardware model.
            shotTime+=1.0/60;double t=Math.min(1,shotTime/1.5);
            ballX=shotX+(shotEndX-shotX)*t;ballY=shotY+(shotEndY-shotY)*t;
            ballZ=20+10*t+4*60*shotPower*t*(1-t);
            if(t>=1) {ballActive=false;scored=Math.hypot(ballX-100,ballY-120)<=18;ballZ=scored?30:0;}
        }
    }
    boolean passed(int mission) {
        if (collision || Math.abs(left) + Math.abs(right) > 0.001) return false;
        switch (mission) {
            case 6: return Math.hypot(x-100,y-100)<22;
            case 7: return delivered;
            case 8: return scored;
            case 0: return y > -65 && Math.abs(x) < 20;
            case 1: return Math.abs(y + 20) < 8 && Math.abs(x) < 20;
            case 2: return Math.abs(heading() - 90) < 8 && Math.abs(x) < 15 && Math.abs(y + 120) < 15;
            case 3: return distance() >= 20 && distance() <= 40 && y > 125 && Math.abs(x) < 20;
            case 5: return carrying && Math.abs(distance()-dockingTarget())<=4;
            default: return carrying && distance() >= 20 && distance() <= 40;
        }
    }
    String frame() {
        return String.format(Locale.US,
            "{\"x\":%.3f,\"y\":%.3f,\"heading\":%.3f,\"left\":%.3f,\"right\":%.3f,\"distance\":%.3f,\"time\":%.2f,\"collision\":%s,\"carrying\":%s,\"delivered\":%s,\"ballLoaded\":%s,\"scored\":%s,\"ball\":{\"x\":%.3f,\"y\":%.3f,\"z\":%.3f,\"active\":%s,\"visible\":%s}}",
            x, y, heading(), left, right, distance(), time, collision, carrying,delivered,ballLoaded,scored,ballX,ballY,ballZ,ballActive,shots>0);
    }
    boolean crashed() { return collision; }
}
