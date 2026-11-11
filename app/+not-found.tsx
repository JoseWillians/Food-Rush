import { Link, Stack } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { colors } from '@/src/theme/colors';

/**
 * Tela mostrada quando o endereço (rota) não existe.
 */
export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Esta tela não existe.</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Voltar para o início!</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});
