import UserRepository from "../repositories/UserRepository";
import { IUser } from "../models/User";

class UserService {
  async getUserById(id: string): Promise<IUser | null> {
    return UserRepository.findById(id);
  }

  async updateProfile(
    id: string,
    data: { name?: string; email?: string }
  ): Promise<IUser | null> {
    return UserRepository.update(id, data);
  }

  async getAllUsers(): Promise<IUser[]> {
    return UserRepository.findAll();
  }
}

export default new UserService();
