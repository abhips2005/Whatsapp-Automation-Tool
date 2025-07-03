import express, { Request, Response } from 'express';
import { ProfileManager } from '../source/profile-manager';

const router = express.Router();

router.get('/profile-picture', async (req: Request, res: Response) => {
  try {
    const profileManager = new ProfileManager();
    const profilePicture = await profileManager.getProfilePicture(req.user.id);
    res.json({ profilePicture });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile picture' });
  }
});

export default router;