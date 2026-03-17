import User, { IUser } from "../models/User";

class UserRepository {
  async create(data: Partial<IUser>): Promise<IUser> {
    const user = new User(data);
    return user.save();
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email });
  }

  async findById(id: string): Promise<IUser | null> {
    return User.findById(id).select("-password");
  }

  async findAll(): Promise<IUser[]> {
    return User.find().select("-password");
  }

  async update(id: string, data: Partial<IUser>): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, data, { new: true }).select("-password");
  }

  async delete(id: string): Promise<IUser | null> {
    return User.findByIdAndDelete(id);
  }
}

export default new UserRepository();
