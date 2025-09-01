import { index } from './pineconeUtils';

async function main() {
  try {
    // 1) Check stats before inserting anything
    // 🔹 This shows how many namespaces, dimensions, vectors, etc. exist in your Pinecone index right now.
    const before = await index.describeIndexStats();
    console.log('Before stats:', JSON.stringify(before, null, 2));

    // 2) Create a dummy vector (length 512, all values = 0.01)
    // 🔹 Matches the embedding dimensionality (512) you’re using for Vertex + Pinecone
    const vector = Array(512).fill(0.01);

    // Insert a fake item into the index (default namespace, since no .namespace() call is used)
    await index.upsert([
      {
        id: 'test-item-1',
        values: vector,
        metadata: { test: true, name: 'dummy polo' }, // 🔹 Arbitrary metadata
      },
    ]);
    console.log('✅ Dummy vector inserted');

    // Give Pinecone a moment to process/commit before querying back
    await new Promise((r) => setTimeout(r, 2000));

    // 3) Query Pinecone for the closest matches to the same vector
    // 🔹 Should return `test-item-1` at score ≈ 1.0
    const queryRes = await index.query({
      topK: 3,
      vector,
      includeMetadata: true,
    });
    console.log('Query result:', JSON.stringify(queryRes, null, 2));

    // 4) Check stats after insertion
    // 🔹 Should now show one extra vector stored in the index
    const after = await index.describeIndexStats();
    console.log('After stats:', JSON.stringify(after, null, 2));
  } catch (err) {
    console.error('❌ Error testing Pinecone:', err);
  }
}

main();

/////////////

// import { index } from './pineconeUtils';

// async function main() {
//   try {
//     // 1) Check stats before
//     const before = await index.describeIndexStats();
//     console.log('Before stats:', JSON.stringify(before, null, 2));

//     // 2) Insert a dummy vector into default namespace
//     const vector = Array(512).fill(0.01);

//     await index.upsert([
//       {
//         id: 'test-item-1',
//         values: vector,
//         metadata: { test: true, name: 'dummy polo' },
//       },
//     ]);
//     console.log('✅ Dummy vector inserted');

//     // Give Pinecone a moment to commit
//     await new Promise((r) => setTimeout(r, 2000));

//     // 3) Query it back
//     const queryRes = await index.query({
//       topK: 3,
//       vector,
//       includeMetadata: true,
//     });
//     console.log('Query result:', JSON.stringify(queryRes, null, 2));

//     // 4) Check stats after
//     const after = await index.describeIndexStats();
//     console.log('After stats:', JSON.stringify(after, null, 2));
//   } catch (err) {
//     console.error('❌ Error testing Pinecone:', err);
//   }
// }

// main();
