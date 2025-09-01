import { index } from './pineconeUtils';

async function main() {
  try {
    // 1) Check stats before
    const before = await index.describeIndexStats();
    console.log('Before stats:', JSON.stringify(before, null, 2));

    // 2) Insert a dummy vector into default namespace
    const vector = Array(512).fill(0.01);

    await index.upsert([
      {
        id: 'test-item-1',
        values: vector,
        metadata: { test: true, name: 'dummy polo' },
      },
    ]);
    console.log('✅ Dummy vector inserted');

    // Give Pinecone a moment to commit
    await new Promise((r) => setTimeout(r, 2000));

    // 3) Query it back
    const queryRes = await index.query({
      topK: 3,
      vector,
      includeMetadata: true,
    });
    console.log('Query result:', JSON.stringify(queryRes, null, 2));

    // 4) Check stats after
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
//     // 1) Check stats
//     const stats = await index.describeIndexStats();
//     console.log('Index stats:', JSON.stringify(stats, null, 2));

//     // 2) Insert a dummy vector
//     await index.upsert([
//       {
//         id: 'test-item-1',
//         values: Array(512).fill(0.01), // dummy 512-d vector
//         metadata: { test: true, name: 'dummy polo' },
//       },
//     ]);
//     console.log('✅ Dummy vector inserted');

//     // 3) Query it back
//     const queryRes = await index.query({
//       topK: 1,
//       vector: Array(512).fill(0.01),
//       includeMetadata: true,
//     });
//     console.log('Query result:', JSON.stringify(queryRes, null, 2));
//   } catch (err) {
//     console.error('❌ Error testing Pinecone:', err);
//   }
// }

// main();
