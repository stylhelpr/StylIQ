export class CreateUserDto {
  auth0_sub: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  profile_picture?: string;
}
