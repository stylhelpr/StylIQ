import mime from 'react-native-mime-types';
import {getPresignedUrl} from './getPresignedUrl';

type UploadOptions = {
  localUri: string;
  filename: string;
  userId: string;
};

export async function uploadImageToGCS({
  localUri,
  filename,
  userId,
}: UploadOptions): Promise<{publicUrl: string; objectKey: string}> {
  const mimeType = 'image/jpeg'; // Force to match backend-signed URL

  const {uploadUrl, publicUrl, objectKey} = await getPresignedUrl(
    userId,
    filename,
  );

  const response = await fetch(localUri);
  const blob = await response.blob();

  console.log('📡 Step 1 - Presigned URL response:', {
    uploadUrl,
    publicUrl,
    objectKey,
  });
  console.log('📡 Step 2 - Uploading to GCS URL:', uploadUrl);
  console.log('🧾 Step 2 - MIME Type:', mimeType);

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
    },
    body: blob,
  });

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    console.error('❌ Step 3 - Upload failed:', uploadRes.status, errorText);
    throw new Error('Upload to GCS failed: ' + uploadRes.status);
  }

  return {publicUrl, objectKey};
}

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
