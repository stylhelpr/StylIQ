export class UploadDto {
  user_id: string;
  image_url: string;
  object_key: string; // ✅ Add this
  name: string;
  main_category: string; // ✅ Add this
  color?: string; // ✅ Optional if needed
  tags?: string[]; // ✅ Optional if needed
  width?: number; // ✅ Keep if used
  height?: number; // ✅ Keep if used
}

////////

// export class UploadDto {
//   user_id: string;
//   image_url: string;
//   name?: string;
//   width: number;
//   height: number;
// }
