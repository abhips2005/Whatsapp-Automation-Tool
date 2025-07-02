import { User } from '../models/user';

class ProfileManager {
  async getProfilePicture(userId: string) {
    // Logic to fetch profile picture from database or storage
    const user = await User.findById(userId);
    return user.profilePicture;
  }
}

export default ProfileManager;