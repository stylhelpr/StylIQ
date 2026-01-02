// apps/frontend/api/uploadImageToGCS.ts
import mime from 'react-native-mime-types';
import {getPresignedUrl} from './getPresignedUrl';

type UploadOptions = {
  localUri: string; // e.g. file:///... or asset library uri
  filename: string; // e.g. striped-shirt1.png
  userId: string; // UUID
};

export async function uploadImageToGCS({
  localUri,
  filename,
  userId,
}: UploadOptions): Promise<{
  publicUrl: string;
  objectKey: string;
  gsutilUri: string; // ✅ add this
  contentType: string;
}> {
  // Detect MIME from filename extension; fall back sanely
  const detected = mime.lookup(filename) || 'application/octet-stream';
  const contentType =
    typeof detected === 'string' ? detected : 'application/octet-stream';

  // 1) Ask backend for a presigned PUT URL that *matches* the MIME we’ll use
  const {uploadUrl, publicUrl, objectKey} = await getPresignedUrl(
    userId,
    filename,
    contentType,
  );

  // 2) Read the local file into a Blob (React Native fetch supports file:// URIs)
  const fileResp = await fetch(localUri);
  if (!fileResp.ok) {
    throw new Error(`Failed to read local file: ${localUri}`);
  }
  const blob = await fileResp.blob();

  // 3) PUT directly to GCS signed URL with exact same Content-Type
  // Include x-goog-content-length-range header required by signed URL
  const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB - must match backend
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'x-goog-content-length-range': `0,${MAX_UPLOAD_BYTES}`,
    },
    body: blob,
  });

  if (!putRes.ok) {
    const errTxt = await putRes.text().catch(() => '');
    throw new Error(`GCS upload failed (${putRes.status}): ${errTxt}`);
  }

  // 4) Derive gs:// URI from bucket + objectKey
  const bucketName = process.env.GCS_BUCKET_NAME ?? 'stylhelpr-prod-bucket';

  return {
    publicUrl,
    objectKey,
    gsutilUri: `gs://${bucketName}/${objectKey}`, // ✅ this is what Vertex needs
    contentType,
  };
}

///////////////

// // apps/frontend/api/uploadImageToGCS.ts
// import mime from 'react-native-mime-types';
// import {getPresignedUrl} from './getPresignedUrl';

// type UploadOptions = {
//   localUri: string;
//   filename: string;
//   userId: string;
// };

// export async function uploadImageToGCS({
//   localUri,
//   filename,
//   userId,
// }: UploadOptions): Promise<{
//   publicUrl: string;
//   objectKey: string;
//   gsutilUri: string;
//   contentType: string;
// }> {
//   const detected = mime.lookup(filename) || 'application/octet-stream';
//   const contentType =
//     typeof detected === 'string' ? detected : 'application/octet-stream';

//   const {uploadUrl, publicUrl, objectKey} = await getPresignedUrl(
//     userId,
//     filename,
//     contentType,
//   );

//   const fileResp = await fetch(localUri);
//   if (!fileResp.ok) {
//     throw new Error(`Failed to read local file: ${localUri}`);
//   }
//   const blob = await fileResp.blob();

//   const putRes = await fetch(uploadUrl, {
//     method: 'PUT',
//     headers: {'Content-Type': contentType},
//     body: blob,
//   });

//   if (!putRes.ok) {
//     const errTxt = await putRes.text().catch(() => '');
//     throw new Error(`GCS upload failed (${putRes.status}): ${errTxt}`);
//   }

//   // 👇 Derive gs:// URI from objectKey and bucket
//   const bucketName = process.env.GCS_BUCKET_NAME ?? 'stylhelpr-dev-bucket';

//   return {
//     publicUrl,
//     objectKey,
//     gsutilUri: `gs://${
//       process.env.GCS_BUCKET_NAME ?? 'stylhelpr-dev-bucket'
//     }/${objectKey}`, // 👈 ADD THIS
//     contentType,
//   };
// }

////////////////

// // apps/frontend/api/uploadImageToGCS.ts
// import mime from 'react-native-mime-types';
// import {getPresignedUrl} from './getPresignedUrl';

// type UploadOptions = {
//   localUri: string; // e.g. file:///... or asset library uri
//   filename: string; // e.g. striped-shirt1.png
//   userId: string; // UUID
// };

// export async function uploadImageToGCS({
//   localUri,
//   filename,
//   userId,
// }: UploadOptions): Promise<{
//   publicUrl: string;
//   objectKey: string;
//   contentType: string;
// }> {
//   // Detect MIME from filename extension; fall back sanely
//   const detected = mime.lookup(filename) || 'application/octet-stream';
//   const contentType =
//     typeof detected === 'string' ? detected : 'application/octet-stream';

//   // 1) Ask backend for a presigned PUT URL that *matches* the MIME we’ll use
//   const {uploadUrl, publicUrl, objectKey} = await getPresignedUrl(
//     userId,
//     filename,
//     contentType,
//   );

//   // 2) Read the local file into a Blob (React Native fetch supports file:// URIs)
//   const fileResp = await fetch(localUri);
//   if (!fileResp.ok) {
//     throw new Error(`Failed to read local file: ${localUri}`);
//   }
//   const blob = await fileResp.blob();

//   // 3) PUT directly to GCS signed URL with exact same Content-Type
//   const putRes = await fetch(uploadUrl, {
//     method: 'PUT',
//     headers: {'Content-Type': contentType},
//     body: blob,
//   });

//   if (!putRes.ok) {
//     const errTxt = await putRes.text().catch(() => '');
//     throw new Error(`GCS upload failed (${putRes.status}): ${errTxt}`);
//   }

//   return {publicUrl, objectKey, contentType};
// }

//////////////

// import mime from 'react-native-mime-types';
// import {getPresignedUrl} from './getPresignedUrl';

// type UploadOptions = {
//   localUri: string;
//   filename: string;
//   userId: string;
// };

// export async function uploadImageToGCS({
//   localUri,
//   filename,
//   userId,
// }: UploadOptions): Promise<{publicUrl: string; objectKey: string}> {
//   const mimeType = 'image/jpeg'; // Force to match backend-signed URL

//   const {uploadUrl, publicUrl, objectKey} = await getPresignedUrl(
//     userId,
//     filename,
//   );

//   const response = await fetch(localUri);
//   const blob = await response.blob();

//   console.log('📡 Step 1 - Presigned URL response:', {
//     uploadUrl,
//     publicUrl,
//     objectKey,
//   });
//   console.log('📡 Step 2 - Uploading to GCS URL:', uploadUrl);
//   console.log('🧾 Step 2 - MIME Type:', mimeType);

//   const uploadRes = await fetch(uploadUrl, {
//     method: 'PUT',
//     headers: {
//       'Content-Type': mimeType,
//     },
//     body: blob,
//   });

//   if (!uploadRes.ok) {
//     const errorText = await uploadRes.text();
//     console.error('❌ Step 3 - Upload failed:', uploadRes.status, errorText);
//     throw new Error('Upload to GCS failed: ' + uploadRes.status);
//   }

//   return {publicUrl, objectKey};
// }

///////////////

// import mime from 'react-native-mime-types';
// import {getPresignedUrl} from './getPresignedUrl';

// type UploadOptions = {
//   localUri: string;
//   filename: string;
//   userId: string;
// };

// export async function uploadImageToGCS({
//   localUri,
//   filename,
//   userId,
// }: UploadOptions): Promise<string> {
//   //   const mimeType = mime.lookup(filename) || 'application/octet-stream';
//   const mimeType = 'image/jpeg'; // 🛠 Force match with backend signed URL

//   const {uploadUrl, publicUrl} = await getPresignedUrl(userId, filename); // ✅ Only 2 args now

//   const response = await fetch(localUri);
//   const blob = await response.blob();

//   console.log('📡 Step 2 - Uploading to GCS URL:', uploadUrl);
//   console.log('🧾 Step 2 - MIME Type:', mimeType);
//   console.log('📡 Step 1 - Presigned URL response:', {uploadUrl, publicUrl});
//   const uploadRes = await fetch(uploadUrl, {
//     method: 'PUT',
//     headers: {
//       'Content-Type': mimeType,
//     },
//     body: blob,
//   });

//   if (!uploadRes.ok) {
//     const errorText = await uploadRes.text();
//     console.error('❌ Step 3 - Upload failed:', uploadRes.status, errorText);
//     throw new Error('Upload to GCS failed: ' + uploadRes.status);
//   }

//   return publicUrl;
// }

////////////

// import mime from 'react-native-mime-types';
// import {getPresignedUrl} from './getPresignedUrl';

// type UploadOptions = {
//   localUri: string;
//   filename: string;
//   userId: string;
// };

// export async function uploadImageToGCS({
//   localUri,
//   filename,
//   userId,
// }: UploadOptions): Promise<string> {
//   //   const mimeType = mime.lookup(filename) || 'application/octet-stream';
//   const mimeType = 'image/jpeg'; // 🛠 Force match with backend signed URL

//   const {uploadUrl, publicUrl} = await getPresignedUrl(userId, filename); // ✅ Only 2 args now

//   const response = await fetch(localUri);
//   const blob = await response.blob();

//   console.log('📡 Step 2 - Uploading to GCS URL:', uploadUrl);
//   console.log('🧾 Step 2 - MIME Type:', mimeType);

//   const uploadRes = await fetch(uploadUrl, {
//     method: 'PUT',
//     headers: {
//       'Content-Type': mimeType,
//     },
//     body: blob,
//   });

//   if (!uploadRes.ok) {
//     const errorText = await uploadRes.text();
//     console.error('❌ Step 3 - Upload failed:', uploadRes.status, errorText);
//     throw new Error('Upload to GCS failed: ' + uploadRes.status);
//   }

//   return publicUrl;
// }

////////////////

// import {Platform} from 'react-native';

// export async function uploadImageToGCS({
//   localUri,
//   filename,
//   userId,
// }: {
//   localUri: string;
//   filename: string;
//   userId: string;
// }) {
//   const res = await fetch(
//     `${process.env.API_URL}/upload/presign?userId=${userId}&filename=${filename}`,
//   );

//   const {uploadUrl, publicUrl} = await res.json();

//   const imageData = await fetch(localUri);
//   const blob = await imageData.blob();

//   await fetch(uploadUrl, {
//     method: 'PUT',
//     headers: {
//       'Content-Type': 'image/jpeg',
//     },
//     body: blob,
//   });

//   return publicUrl;
// }
