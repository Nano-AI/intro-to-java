import javax.tools.*;
import com.sun.source.util.JavacTask;
import java.io.*;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.*;

// Daemon version of Diag.java. Protocol on stdio:
//   request:  "<byteLength>\n" + UTF-8 source of lesson/Student.java
//   response: one JSON line {"diagnostics":[{"line":L,"col":C,"severity":"ERROR","message":"..."}]}
// args[0] = source root (so lesson/Robot.java resolves via -sourcepath).
public class DiagD {
  static class Src extends SimpleJavaFileObject {
    final String code;
    Src(String path, String code) { super(URI.create("string:///" + path), Kind.SOURCE); this.code = code; }
    public CharSequence getCharContent(boolean b) { return code; }
  }
  static String esc(String s) {
    StringBuilder b = new StringBuilder();
    for (char c : s.toCharArray()) {
      if (c == '"' || c == '\\') b.append('\\').append(c);
      else if (c < 0x20) b.append(String.format("\\u%04x", (int) c));
      else b.append(c);
    }
    return b.toString();
  }
  public static void main(String[] a) throws Exception {
    JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
    StandardJavaFileManager fm = jc.getStandardFileManager(null, null, StandardCharsets.UTF_8);
    List<String> opts = List.of("-proc:none", "-implicit:none", "-sourcepath", a[0], "-XDshould-stop.ifError=FLOW");
    DataInputStream in = new DataInputStream(new BufferedInputStream(System.in));
    PrintStream out = new PrintStream(new FileOutputStream(FileDescriptor.out), false, StandardCharsets.UTF_8);
    while (true) {
      String hdr = readLine(in);
      if (hdr == null) return;
      byte[] buf = new byte[Integer.parseInt(hdr.trim())];
      in.readFully(buf);
      DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
      JavacTask task = (JavacTask) jc.getTask(null, fm, dc, opts, null,
          List.of(new Src("lesson/Student.java", new String(buf, StandardCharsets.UTF_8))));
      try { task.analyze(); } catch (Throwable t) { /* diagnostics already collected */ }
      StringBuilder sb = new StringBuilder("{\"diagnostics\":[");
      boolean first = true;
      for (Diagnostic<? extends JavaFileObject> d : dc.getDiagnostics()) {
        if (d.getSource() == null || !d.getSource().getName().endsWith("Student.java")) continue;
        if (!first) sb.append(',');
        first = false;
        sb.append("{\"line\":").append(d.getLineNumber()).append(",\"col\":").append(d.getColumnNumber())
          .append(",\"severity\":\"").append(d.getKind()).append("\",\"message\":\"").append(esc(d.getMessage(Locale.ENGLISH))).append("\"}");
      }
      out.println(sb.append("]}"));
      out.flush();
    }
  }
  static String readLine(DataInputStream in) throws IOException {
    StringBuilder b = new StringBuilder();
    int c;
    while ((c = in.read()) != -1 && c != '\n') b.append((char) c);
    return c == -1 && b.length() == 0 ? null : b.toString();
  }
}
