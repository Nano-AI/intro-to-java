import com.sun.source.tree.*;
import com.sun.source.util.*;
import javax.tools.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/** Uses the JDK's Java parser, never executes student code. */
public class InspectSource {
    static String quote(String text) {
        StringBuilder out = new StringBuilder("\"");
        for (char c : text.toCharArray()) {
            switch (c) {
                case '\\': out.append("\\\\"); break;
                case '"': out.append("\\\""); break;
                case '\n': out.append("\\n"); break;
                case '\r': out.append("\\r"); break;
                case '\t': out.append("\\t"); break;
                default: if (c < 32) out.append(String.format("\\u%04x", (int)c)); else out.append(c);
            }
        }
        return out.append('"').toString();
    }
    public static void main(String[] args) throws Exception {
        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        if (compiler == null) throw new IllegalStateException("Source checks require a JDK, not only a JRE.");
        try (StandardJavaFileManager files = compiler.getStandardFileManager(null, Locale.US, StandardCharsets.UTF_8)) {
            JavacTask task = (JavacTask)compiler.getTask(null, files, null, Arrays.asList("-proc:none"), null, files.getJavaFileObjects(args[0]));
            final CompilationUnitTree unit = task.parse().iterator().next();
            final SourcePositions positions = Trees.instance(task).getSourcePositions();
            final List<String> variables = new ArrayList<>(), methods = new ArrayList<>(), calls = new ArrayList<>(), loops = new ArrayList<>(), assignments = new ArrayList<>();
            final Map<String, Integer> identifiers = new TreeMap<>();
            new TreeScanner<Void, Void>() {
                String scope = "class";
                @Override public Void visitMethod(MethodTree node, Void unused) {
                    String previous = scope; scope = node.getName().toString();
                    List<String> parameters = new ArrayList<>();
                    for (VariableTree parameter : node.getParameters()) parameters.add(quote(parameter.getType().toString()));
                    methods.add("{\"name\":" + quote(scope) + ",\"returns\":" + quote(node.getReturnType() == null ? "" : node.getReturnType().toString()) + ",\"parameters\":[" + String.join(",", parameters) + "]}");
                    super.visitMethod(node, unused); scope = previous; return null;
                }
                @Override public Void visitVariable(VariableTree node, Void unused) {
                    ExpressionTree initializer = node.getInitializer();
                    variables.add("{\"name\":" + quote(node.getName().toString()) + ",\"type\":" + quote(node.getType() == null ? "var" : node.getType().toString()) + ",\"scope\":" + quote(scope) + ",\"final\":" + node.getModifiers().getFlags().contains(javax.lang.model.element.Modifier.FINAL) + ",\"initializer\":" + quote(initializer == null ? "" : initializer.toString()) + ",\"start\":" + (initializer == null ? -1 : positions.getStartPosition(unit, initializer)) + ",\"end\":" + (initializer == null ? -1 : positions.getEndPosition(unit, initializer)) + "}");
                    return super.visitVariable(node, unused);
                }
                @Override public Void visitIdentifier(IdentifierTree node, Void unused) {
                    String name = node.getName().toString(); identifiers.put(name, identifiers.getOrDefault(name, 0) + 1);
                    return super.visitIdentifier(node, unused);
                }
                @Override public Void visitMethodInvocation(MethodInvocationTree node, Void unused) {
                    String name = node.getMethodSelect().toString();
                    List<String> arguments = new ArrayList<>();
                    final List<String> argumentNames = new ArrayList<>();
                    for (ExpressionTree argument : node.getArguments()) arguments.add(quote(argument.toString()));
                    for (ExpressionTree argument : node.getArguments()) new TreeScanner<Void, Void>() {
                        @Override public Void visitIdentifier(IdentifierTree identifier, Void unused) { argumentNames.add(quote(identifier.getName().toString())); return super.visitIdentifier(identifier, unused); }
                    }.scan(argument, null);
                    calls.add("{\"name\":" + quote(name) + ",\"scope\":" + quote(scope) + ",\"arguments\":[" + String.join(",", arguments) + "],\"identifiers\":[" + String.join(",", argumentNames) + "]}");
                    return super.visitMethodInvocation(node, unused);
                }
                // `scope` is only the enclosing method name, so a loop inside an if
                // inside main still reads "main" and nesting cannot be seen. Each loop
                // therefore records its 1-based depth and the index of the loop that
                // encloses it, or -1 at the top level.
                final Deque<Integer> open = new ArrayDeque<>();
                void loop(String kind) {
                    loops.add("{\"kind\":" + quote(kind) + ",\"scope\":" + quote(scope) + ",\"depth\":" + (open.size() + 1) + ",\"parent\":" + (open.isEmpty() ? -1 : open.peek()) + "}");
                    open.push(loops.size() - 1);
                }
                @Override public Void visitForLoop(ForLoopTree node, Void unused) { loop("for"); super.visitForLoop(node, unused); open.pop(); return null; }
                @Override public Void visitEnhancedForLoop(EnhancedForLoopTree node, Void unused) { loop("for"); super.visitEnhancedForLoop(node, unused); open.pop(); return null; }
                @Override public Void visitWhileLoop(WhileLoopTree node, Void unused) { loop("while"); super.visitWhileLoop(node, unused); open.pop(); return null; }
                void assignment(ExpressionTree variable) { assignments.add("{\"name\":"+quote(variable.toString())+",\"scope\":"+quote(scope)+"}"); }
                @Override public Void visitAssignment(AssignmentTree node, Void unused) { assignment(node.getVariable()); return super.visitAssignment(node,unused); }
                @Override public Void visitCompoundAssignment(CompoundAssignmentTree node, Void unused) { assignment(node.getVariable()); return super.visitCompoundAssignment(node,unused); }
                @Override public Void visitUnary(UnaryTree node, Void unused) {
                    if (Arrays.asList(Tree.Kind.PREFIX_INCREMENT,Tree.Kind.POSTFIX_INCREMENT,Tree.Kind.PREFIX_DECREMENT,Tree.Kind.POSTFIX_DECREMENT).contains(node.getKind())) assignment(node.getExpression());
                    return super.visitUnary(node,unused);
                }
            }.scan(unit, null);
            List<String> names = new ArrayList<>();
            for (Map.Entry<String, Integer> entry : identifiers.entrySet()) names.add(quote(entry.getKey()) + ":" + entry.getValue());
            String result = "{\"variables\":[" + String.join(",", variables) + "],\"methods\":[" + String.join(",", methods) + "],\"calls\":[" + String.join(",", calls) + "],\"loops\":[" + String.join(",", loops) + "],\"assignments\":["+String.join(",",assignments)+"],\"identifiers\":{" + String.join(",", names) + "}}";
            Files.write(Paths.get(args[1]), result.getBytes(StandardCharsets.UTF_8));
        }
    }
}
