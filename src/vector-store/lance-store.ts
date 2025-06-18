import path from "path";



import { LanceVectorStore } from '@mastra/lance'

const lanceVector = await LanceVectorStore.create( process.env.LANCE_DB_PATH)

// 2. Create table first ✅
// await lanceVector.createTable(
//   tableName: "documents",
//   dimension: 1536,
// );


await lanceVector.createIndex({
  tableName: "documents",
  indexName: "embeddings",
  dimension: 1536,
});


export default lanceVector;
