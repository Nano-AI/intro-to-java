import javax.tools.*;
import com.sun.source.tree.*;
import com.sun.source.util.*;
import javax.lang.model.element.*;
import javax.lang.model.type.*;
import java.io.*;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.*;

// Live error checking and code completion daemon. One javac in a warm JVM, driven over stdio.
//   request:  "D\n<sourceRoot>\n<relPath>\n<byteLength>\n" + UTF-8 source            (diagnostics)
//             "C\n<sourceRoot>\n<relPath>\n<byteLength>\n<offset>\n" + UTF-8 source (completion)
//             relPath is relative to sourceRoot, e.g. pip/lessons/hello/Student.java;
//             offset is the 0-based cursor position in UTF-16 units (a JS string index).
//   response: one JSON line {"diagnostics":[{"line":L,"col":C,"severity":"ERROR","message":"..."}]}
//             or {"items":[{"label":..,"kind":"method|field|variable|class","detail":..,"insertText":..}]}
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
    DataInputStream in = new DataInputStream(new BufferedInputStream(System.in));
    PrintStream out = new PrintStream(new FileOutputStream(FileDescriptor.out), false, StandardCharsets.UTF_8);
    while (true) {
      String kind = readLine(in), root = readLine(in), rel = readLine(in), len = readLine(in);
      if (kind == null || root == null || rel == null || len == null) return;
      String offset = kind.equals("C") ? readLine(in) : null;
      byte[] buf = new byte[Integer.parseInt(len.trim())];
      in.readFully(buf);
      String code = new String(buf, StandardCharsets.UTF_8);
      rel = rel.replace('\\', '/');
      List<String> opts = List.of("-proc:none", "-implicit:none", "-sourcepath", root, "-XDshould-stop.ifError=FLOW");
      if (offset != null) {
        out.println(complete(jc, fm, opts, rel, code, Integer.parseInt(offset.trim())));
        out.flush();
        continue;
      }
      Src src = new Src(rel, code);
      DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
      JavacTask task = (JavacTask) jc.getTask(null, fm, dc, opts, null, List.of(src));
      try { task.analyze(); } catch (Throwable t) { /* diagnostics already collected */ }
      StringBuilder sb = new StringBuilder("{\"diagnostics\":[");
      boolean first = true;
      for (Diagnostic<? extends JavaFileObject> d : dc.getDiagnostics()) {
        if (d.getSource() != src) continue;
        if (!first) sb.append(',');
        first = false;
        sb.append("{\"line\":").append(d.getLineNumber()).append(",\"col\":").append(d.getColumnNumber())
          .append(",\"severity\":\"").append(d.getKind()).append("\",\"message\":\"").append(esc(d.getMessage(Locale.ENGLISH))).append("\"}");
      }
      out.println(sb.append("]}"));
      out.flush();
    }
  }

  static final String HOLE = "__pip__";
  static final Set<String> NOISE = Set.of("wait", "notify", "notifyAll", "getClass", "hashCode", "this", "super");

  // Members after `receiver.` or names in scope at the cursor. The prefix before the cursor is replaced
  // by a placeholder identifier (plus `;` if needed) so `robot.` parses, then javac attributes the file.
  static String complete(JavaCompiler jc, StandardJavaFileManager fm, List<String> opts, String rel, String code, int off) {
    List<String> items = new ArrayList<>();
    try {
      off = Math.max(0, Math.min(off, code.length()));
      int s = off;
      while (s > 0 && Character.isJavaIdentifierPart(code.charAt(s - 1))) s--;
      String prefix = code.substring(s, off).toLowerCase(Locale.ROOT);
      for (String fill : new String[] {HOLE, HOLE + ";"}) {
        JavacTask task = (JavacTask) jc.getTask(null, fm, d -> {}, opts, null, List.of(new Src(rel, code.substring(0, s) + fill + code.substring(off))));
        CompilationUnitTree cu = task.parse().iterator().next();
        task.analyze();
        TreePath[] hit = {null};
        new TreePathScanner<Void, Void>() {
          public Void visitIdentifier(IdentifierTree t, Void v) { if (t.getName().contentEquals(HOLE)) hit[0] = getCurrentPath(); return null; }
          public Void visitMemberSelect(MemberSelectTree t, Void v) {
            if (t.getIdentifier().contentEquals(HOLE)) hit[0] = getCurrentPath();
            return super.visitMemberSelect(t, v);
          }
          // `robot.__pip__` alone is "not a statement"; javac keeps and attributes it inside an erroneous tree.
          public Void visitErroneous(ErroneousTree t, Void v) { return scan(t.getErrorTrees(), v); }
        }.scan(cu, null);
        if (hit[0] == null) continue;
        Trees trees = Trees.instance(task);
        Scope scope = trees.getScope(hit[0]);
        Set<Element> found = new LinkedHashSet<>();
        DeclaredType site = null;
        Boolean statics = null; // null: no receiver, any member
        if (hit[0].getLeaf() instanceof MemberSelectTree) {
          TreePath recv = new TreePath(hit[0], ((MemberSelectTree) hit[0].getLeaf()).getExpression());
          TypeMirror tm = trees.getTypeMirror(recv);
          Element re = trees.getElement(recv);
          if (tm == null) break;
          if (tm.getKind() == TypeKind.ARRAY && "length".startsWith(prefix)) items.add(item("length", "field", "length : int", "length"));
          if (tm.getKind() != TypeKind.DECLARED) break;
          site = (DeclaredType) tm;
          statics = re != null && (re.getKind().isClass() || re.getKind().isInterface());
          found.addAll(task.getElements().getAllMembers((TypeElement) site.asElement()));
        } else {
          for (Scope sc = scope; sc != null && sc.getEnclosingClass() != null; sc = sc.getEnclosingScope()) for (Element e : sc.getLocalElements()) found.add(e);
          // ponytail: instance members also show inside static methods; filter by the enclosing method if that confuses.
          if (scope.getEnclosingClass() != null) {
            site = (DeclaredType) scope.getEnclosingClass().asType();
            found.addAll(task.getElements().getAllMembers(scope.getEnclosingClass()));
          }
        }
        for (Element e : found) {
          String n = e.getSimpleName().toString();
          boolean member = e.getEnclosingElement() instanceof TypeElement;
          if (items.size() >= 200) break;
          if (!(e.getKind() == ElementKind.METHOD || e instanceof VariableElement) || NOISE.contains(n) || !n.toLowerCase(Locale.ROOT).startsWith(prefix)) continue;
          if (statics != null && statics != e.getModifiers().contains(Modifier.STATIC)) continue;
          if (member && !trees.isAccessible(scope, e, site)) continue;
          TypeMirror t = member ? task.getTypes().asMemberOf(site, e) : e.asType();
          if (e.getKind() != ElementKind.METHOD) {
            items.add(item(n, member ? "field" : "variable", n + " : " + simple(t), n));
            continue;
          }
          ExecutableType et = (ExecutableType) t;
          List<? extends VariableElement> ps = ((ExecutableElement) e).getParameters();
          StringJoiner sig = new StringJoiner(", "), ins = new StringJoiner(", ");
          for (int i = 0; i < ps.size(); i++) {
            String type = simple(et.getParameterTypes().get(i)), name = ps.get(i).getSimpleName().toString();
            sig.add(type + " " + name);
            ins.add("${" + (i + 1) + ":" + (name.matches("arg\\d+") ? type : name) + "}");
          }
          items.add(item(n, "method", n + "(" + sig + ") : " + simple(et.getReturnType()), n + "(" + ins + ")"));
        }
        break;
      }
    } catch (Throwable t) { /* a half-typed program must never stop the daemon */ }
    return "{\"items\":[" + String.join(",", items) + "]}";
  }

  static String simple(TypeMirror t) { return t.toString().replaceAll("\\b(\\w+\\.)+", ""); }

  static String item(String label, String kind, String detail, String insert) {
    return "{\"label\":\"" + esc(label) + "\",\"kind\":\"" + kind + "\",\"detail\":\"" + esc(detail) + "\",\"insertText\":\"" + esc(insert) + "\"}";
  }

  // UTF-8 line without the newline; null at end of input.
  static String readLine(DataInputStream in) throws IOException {
    ByteArrayOutputStream b = new ByteArrayOutputStream();
    int c;
    while ((c = in.read()) != -1 && c != '\n') b.write(c);
    return c == -1 && b.size() == 0 ? null : b.toString(StandardCharsets.UTF_8.name()).replace("\r", "");
  }
}
