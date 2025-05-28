// src/users/users.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  private users = [{ id: '1', name: 'Mike' }];

  findUserById(id: string) {
    return this.users.find((user) => user.id === id);
  }
}
