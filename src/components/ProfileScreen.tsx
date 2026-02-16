import { View, ScrollView } from "react-native";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileMenu } from "./ProfileMenu";

const mockUser = {
  id: 'demo-user',
  email: 'demo@example.com',
  user_metadata: { name: 'Demo User' },
} as any;

export function ProfileScreen() {
  const handleLogout = async () => {
    console.log('Logout pressed');
  };

  return (
    <ScrollView className="flex-1 gap-6 p-6">
      <ProfileHeader user={mockUser} />
      <ProfileMenu onLogout={handleLogout} />
    </ScrollView>
  );
}
