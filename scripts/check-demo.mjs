import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  // Check for demo analysis result with correct columns
  const [results] = await connection.execute(
    "SELECT id, sessionId, part1, part2, part3, part4 FROM analysis_results WHERE sessionId = 'test-apex-demo-LAIdJqey'"
  );
  
  if (results.length > 0) {
    console.log("\\nDemo Analysis Found!");
    console.log("ID:", results[0].id);
    console.log("SessionId:", results[0].sessionId);
    console.log("Part1 length:", results[0].part1?.length || 0);
    console.log("Part2 length:", results[0].part2?.length || 0);
    console.log("Part3 length:", results[0].part3?.length || 0);
    console.log("Part4 length:", results[0].part4?.length || 0);
    
    // Print first 500 chars of each part
    if (results[0].part1) {
      console.log("\\n--- Part 1 Preview ---");
      console.log(results[0].part1.substring(0, 500));
    }
    if (results[0].part2) {
      console.log("\\n--- Part 2 Preview ---");
      console.log(results[0].part2.substring(0, 500));
    }
  } else {
    console.log("No demo analysis found!");
  }
  
  await connection.end();
}

main().catch(console.error);
