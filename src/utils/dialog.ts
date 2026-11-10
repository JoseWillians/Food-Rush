import { Alert, Platform } from "react-native";

// Na versão web o Alert.alert do React Native não mostra nada.
// Estas funções usam o alerta do navegador na web e o Alert nativo no celular.

/** Mostra uma mensagem simples com botão OK. */
export function showMessage(title: string, message: string): void {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

/**
 * Pergunta algo ao usuário com "Cancelar" e um botão de confirmação.
 * Devolve true se ele confirmou.
 */
export function confirmDialog(
  title: string,
  message: string,
  confirmText = "Confirmar",
  destructive = false
): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
        {
          text: confirmText,
          style: destructive ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
