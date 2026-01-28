import { View, ScrollView } from "react-native";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileMenu } from "./ProfileMenu";

export function ProfileScreen() {
  return (
    <ScrollView className="flex-1 gap-6 p-6">
      <ProfileHeader />
      <ProfileMenu />
    </ScrollView>
  );
}
