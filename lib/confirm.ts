import { Platform, Alert } from "react-native";

export async function confirm(title: string, message?: string): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm([title, message].filter(Boolean).join("\n\n")));
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
        { text: "OK", onPress: () => resolve(true) },
      ],
      { cancelable: true }
    );
  });
}
