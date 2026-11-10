import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { BackButton } from "@/src/components/ui/BackButton";
import { useOrders } from "@/src/contexts/OrderContext";
import { STORAGE_KEYS, storageGet, storageSet } from "@/src/utils/storage";

type ChatMessage = {
  id: string;
  sender: "user" | "store";
  text: string;
  time: string;
};

const QUICK_REPLIES = [
  "Qual a previsão?",
  "Pode deixar na portaria",
  "Vou descer para receber",
  "Interfone 102",
  "Obrigado!",
];

/**
 * Chat do pedido com respostas automáticas (simulado).
 * As mensagens ficam salvas por pedido no aparelho.
 */
export default function OrderChatScreen() {
  const { activeOrder } = useOrders();
  const scrollRef = useRef<ScrollView>(null);

  const restaurantName = activeOrder?.restaurantName || "Burger House";
  const courierName = activeOrder?.courierName || "Policarpo de Sousa";

  const welcomeMessage: ChatMessage = {
    id: "1",
    sender: "store",
    text: `Olá! Seu pedido já foi despachado com nosso entregador ${courierName} e está a caminho.`,
    time: "Agora há pouco",
  };
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  // Evita salvar por cima antes de terminar de carregar a conversa salva
  const [loaded, setLoaded] = useState(false);

  // Cada pedido tem sua própria conversa salva no aparelho
  const orderId = activeOrder?.id;
  const chatKey = `${STORAGE_KEYS.CHAT}_${orderId}`;

  useEffect(() => {
    // Ainda carregando o pedido: não lê nem salva nada
    if (!orderId) return;
    let ativo = true;
    setLoaded(false);
    storageGet<ChatMessage[] | null>(chatKey, null).then((saved) => {
      if (!ativo) return;
      if (saved && saved.length > 0) setMessages(saved);
      setLoaded(true);
    });
    return () => {
      ativo = false;
    };
  }, [chatKey, orderId]);

  // Salva a conversa sempre que chega uma mensagem nova
  useEffect(() => {
    if (loaded && orderId) storageSet(chatKey, messages);
  }, [messages, loaded, chatKey, orderId]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Scroll inicial para o final
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
    return () => clearTimeout(timer);
  }, [messages, isTyping]);

  const getAutoReply = (userText: string): string => {
    const lower = userText.toLowerCase();
    if (lower.includes("previsão") || lower.includes("tempo") || lower.includes("falta")) {
      return `Nosso entregador ${courierName} está a cerca de 10-15 minutos do seu endereço!`;
    }
    if (lower.includes("portaria") || lower.includes("interfone") || lower.includes("descer")) {
      return `Anotado com sucesso! Já repassei essa orientação diretamente ao ${courierName}.`;
    }
    if (lower.includes("obrigado") || lower.includes("valeu") || lower.includes("agradeço")) {
      return `Nós que agradecemos pela preferência, conte sempre com a gente! Bom apetite! 😋`;
    }
    return `Recebemos sua mensagem! Nossa equipe e o entregador ${courierName} já estão cientes.`;
  };

  const handleSendMessage = (textToSend?: string) => {
    const content = (textToSend || inputText).trim();
    if (!content) return;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    const newMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: content,
      time: currentTime,
    };

    setMessages((prev) => [...prev, newMsg]);
    if (!textToSend) setInputText("");

    // Dispara simulação de resposta
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const replyMsg: ChatMessage = {
        id: `str-${Date.now()}`,
        sender: "store",
        text: getAutoReply(content),
        time: currentTime,
      };
      setMessages((prev) => [...prev, replyMsg]);
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header do Chat */}
      <View style={styles.header}>
        <BackButton />
        <View style={styles.storeAvatar}>
          <Ionicons name="restaurant" size={20} color={colors.primary} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.storeName} numberOfLines={1}>
            {restaurantName}
          </Text>
          <View style={styles.statusOnlineRow}>
            <View
              style={[
                styles.onlineDot,
                isTyping && { backgroundColor: colors.warning },
              ]}
            />
            <Text
              style={[
                styles.statusOnlineText,
                isTyping && { color: colors.warning },
              ]}
            >
              {isTyping ? "digitando..." : `Online • ${courierName}`}
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
        >
          {/* Badge Informativa do Pedido */}
          <View style={styles.orderBanner}>
            <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
            <Text style={styles.orderBannerText}>
              Canal seguro entre você, o restaurante e o entregador.
            </Text>
          </View>

          {messages.map((msg) => {
            const isUser = msg.sender === "user";
            return (
              <View
                key={msg.id}
                style={[
                  styles.messageRow,
                  isUser ? styles.messageRowUser : styles.messageRowStore,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    isUser ? styles.bubbleUser : styles.bubbleStore,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isUser ? styles.messageTextUser : styles.messageTextStore,
                    ]}
                  >
                    {msg.text}
                  </Text>
                  <Text
                    style={[
                      styles.timeText,
                      isUser ? styles.timeTextUser : styles.timeTextStore,
                    ]}
                  >
                    {msg.time}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Indicador visual de digitação */}
          {isTyping && (
            <View style={[styles.messageRow, styles.messageRowStore]}>
              <View style={[styles.bubble, styles.bubbleStore, styles.typingBubble]}>
                <Ionicons
                  name="ellipsis-horizontal"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.typingText}>Restaurante digitando...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Barra de Respostas Rápidas */}
        <View style={styles.quickRepliesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRepliesList}
          >
            {QUICK_REPLIES.map((reply, index) => (
              <Pressable
                key={index}
                style={styles.quickReplyChip}
                accessibilityRole="button"
                accessibilityLabel={`Resposta rápida: ${reply}`}
                onPress={() => handleSendMessage(reply)}
              >
                <Text style={styles.quickReplyText}>{reply}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Input Inferior */}
        <View style={styles.inputBar}>
          <TextInput
            placeholder="Digite sua mensagem..."
            placeholderTextColor={colors.gray400}
            value={inputText}
            onChangeText={setInputText}
            style={styles.textInput}
            returnKeyType="send"
            onSubmitEditing={() => handleSendMessage()}
          />
          <Pressable
            style={[
              styles.sendButton,
              Boolean(inputText.trim()) && styles.sendButtonActive,
            ]}
            onPress={() => handleSendMessage()}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensagem"
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  storeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: spacing.sm,
  },
  headerInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
  },
  statusOnlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  statusOnlineText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.success,
  },
  keyboardContainer: {
    flex: 1,
  },
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  orderBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  orderBannerText: {
    flex: 1,
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.primary,
  },
  messageRow: {
    flexDirection: "row",
    marginVertical: 4,
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowStore: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 2,
  },
  bubbleStore: {
    backgroundColor: colors.gray100,
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    lineHeight: 20,
  },
  messageTextUser: {
    color: colors.white,
  },
  messageTextStore: {
    color: colors.text,
  },
  timeText: {
    fontSize: 10,
    fontFamily: typography.regular,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  timeTextUser: {
    color: "rgba(255,255,255,0.7)",
  },
  timeTextStore: {
    color: colors.textSecondary,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  typingText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  quickRepliesSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.gray50,
    paddingVertical: spacing.xs,
  },
  quickRepliesList: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  quickReplyChip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  quickReplyText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.text,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.text,
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gray300,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },
  sendButtonActive: {
    backgroundColor: colors.primary,
  },
});


