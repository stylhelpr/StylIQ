export class UpdateUserDto {
  first_name?: string;
  last_name?: string;
  email?: string;
  profile_picture?: string | null; // ✅ allow null
  profession?: string;
  fashion_level?: string;
  gender_presentation?: string;
  onboarding_complete?: boolean;
}

/////////////////

// export class UpdateUserDto {
//   first_name?: string;
//   last_name?: string;
//   email?: string;
//   profile_picture?: string;
//   profession?: string;
//   fashion_level?: string;
//   gender_presentation?: string;
//   onboarding_complete?: boolean;
// }

////////////////////

// export class UpdateUserDto {
//   first_name?: string;
//   last_name?: string;
//   email?: string;
//   profile_picture?: string;
// }

////////////

// export class UpdateUserDto {
//   first_name?: string;
//   last_name?: string;
//   email?: string;
//   profile_picture?: string;
// }
