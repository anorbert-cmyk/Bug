import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  // Get the demo analysis parts
  const [results] = await connection.execute(
    "SELECT id, part1, part2, part3, part4 FROM analysis_results WHERE sessionId = 'test-apex-demo-LAIdJqey'"
  );
  
  if (results.length === 0) {
    console.log("No demo analysis found!");
    await connection.end();
    return;
  }
  
  const demo = results[0];
  
  // Combine all parts into fullMarkdown
  const fullMarkdown = [
    demo.part1 || "",
    demo.part2 || "",
    demo.part3 || "",
    demo.part4 || ""
  ].filter(p => p).join("\n\n---\n\n");
  
  console.log("Full markdown length:", fullMarkdown.length);
  
  // Update the fullMarkdown field
  await connection.execute(
    "UPDATE analysis_results SET fullMarkdown = ? WHERE sessionId = 'test-apex-demo-LAIdJqey'",
    [fullMarkdown]
  );
  
  console.log("Updated fullMarkdown successfully!");
  
  await connection.end();
}

main().catch(console.error);
